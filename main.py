from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime, timedelta
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session
import models
from database import engine, get_db


# สั่งให้ SQLAlchemy สร้างตารางในฐานข้อมูล
models.Base.metadata.create_all(bind=engine)



app = FastAPI(title="Classroom Directory API")
# 1. ตั้งค่า CORS ให้ Frontend เรียกใช้งาน API ได้ไม่ติด Block
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. เพิ่ม Route สำหรับเปิดหน้าเว็บ index.html ที่หน้าหลัก "/"
@app.get("/app", response_class=FileResponse)
def serve_frontend():
    return "static/index.html"


# ==========================================
# Security & JWT Configurations
# ==========================================

SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ใช้ pbkdf2_sha256 เพื่อความเสถียรสูงสุดบนทุก OS และแก้ปัญหา C-extension limit
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# กำหนด OAuth2 Scheme ให้ชี้ไปที่ /login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# --- Helper Functions สำหรับ Security ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """ตรวจสอบว่ารหัสผ่านที่กรอกตรงกับ Hash หรือไม่"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """แปลงรหัสผ่านเป็น Hash"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """สร้าง JWT Access Token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
) -> models.User:
    """Dependency สำหรับแกะ Token และตรวจสอบความถูกต้องของ User"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


# ==========================================
# Pydantic Schemas (V2 Compatible)
# ==========================================

class UserCreate(BaseModel):
    username: str
    password: str
    bio: str | None = None
    role: str = "member"

class UserUpdate(BaseModel):
    bio: str | None = None
    role: str | None = None

class SkillCreate(BaseModel):
    skill_name: str

class SkillResponse(BaseModel):
    id: int
    skill_name: str
    user_id: int

    model_config = {"from_attributes": True}

class UserResponse(BaseModel):
    id: int
    username: str
    bio: str | None = None
    role: str
    skills: list[SkillResponse] = []

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str


# ==========================================
# API Endpoints
# ==========================================

@app.get("/")
def read_root():
    return {"message": "Welcome to Classroom Directory API"}


# ------------------------------------------
# 🔒 Authentication Endpoints
# ------------------------------------------

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pwd = get_password_hash(user.password)
    
    new_user = models.User(
        username=user.username,
        hashed_password=hashed_pwd,
        bio=user.bio,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=Token)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=UserResponse)
def read_users_me(
    current_user: Annotated[models.User, Depends(get_current_user)]
):
    return current_user


# ------------------------------------------
# 📖 Public Read & Analytics Endpoints
# ------------------------------------------

@app.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/skills/search", response_model=list[UserResponse])
def search_by_skill(skill_name: str, db: Session = Depends(get_db)):
    skills = db.query(models.Skill).filter(models.Skill.skill_name.ilike(f"%{skill_name}%")).all()
    return [skill.owner for skill in skills if skill.owner is not None]

@app.get("/analytics/skills")
def get_skills_analytics(db: Session = Depends(get_db)):
    skills = db.query(models.Skill).all()
    stats = {}
    for skill in skills:
        name = skill.skill_name.lower()
        stats[name] = stats.get(name, 0) + 1
    return {"total_skills_count": len(skills), "skill_distribution": stats}


# ------------------------------------------
# 🛡️ Protected Write Operations (ต้องล็อกอิน)
# ------------------------------------------

@app.post("/users/me/skills", response_model=SkillResponse)
def create_skill_for_current_user(
    skill: SkillCreate,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    new_skill = models.Skill(skill_name=skill.skill_name, user_id=current_user.id)
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return new_skill

@app.put("/users/me", response_model=UserResponse)
def update_current_user(
    user_data: UserUpdate,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    if user_data.bio is not None:
        current_user.bio = user_data.bio
    if user_data.role is not None:
        current_user.role = user_data.role
        
    db.commit()
    db.refresh(current_user)
    return current_user

@app.delete("/skills/{skill_id}")
def delete_skill(
    skill_id: int,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    db_skill = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not db_skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    if db_skill.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this skill")
        
    db.delete(db_skill)
    db.commit()
    return {"message": f"Skill ID {skill_id} deleted successfully"}