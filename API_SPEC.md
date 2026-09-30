# Classroom Directory API Specification

## Base URL
`http://localhost:8080/api/v1`

---

## 1. Authentication & Users
### 1.1 Register (สมัครสมาชิก)
- **Method:** `POST`
- **Endpoint:** `/auth/register`
- **Request Body (JSON):**
  ```json
  {
    "username": "Chris",
    "password": "your_password",
    "bio": "Hello! I love coding and gaming."
  }

  {
  "message": "User registered successfully",
  "user_id": 1
  }

  {
  "username": "Chris",
  "password": "your_password"
  }

  {
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }

[
  {
    "id": 1,
    "username": "Chris",
    "bio": "Hello! I love coding.",
    "role": "admin"
  }
]

{
  "skill": "Python"
}

{
  "id": 10,
  "skill": "Python",
  "user_id": 1
}

[
  {
    "id": 1,
    "username": "Chris",
    "skills": ["Python", "Go"]
  }
]

[
  { "skill": "Python", "count": 12 },
  { "skill": "Canva", "count": 8 }
]

# Classroom Directory & Analytics Platform - API Specification

## Base URL
`http://127.0.0.1:8000`

## Data Models
- **User**: `id`, `username`, `bio`, `role`, `skills`
- **Skill**: `id`, `skill_name`, `user_id`

## Analytics Endpoint
- `GET /analytics/skills`
  - **Response**: สรุปจำนวนสกิลทั้งหมด และสถิติจำนวนผู้ใช้งานแยกตามสกิล