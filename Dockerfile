# ใช้ Python 3.11 Slim เป็น Base Image
FROM python:3.11-slim

# ตั้งค่า Working Directory ใน Container
WORKDIR /app

# คัดลอกไฟล์ requirements.txt
COPY requirements.txt .

# ติดตั้ง Dependencies
RUN pip install --no-cache-dir -r requirements.txt

# คัดลอกซอร์สโค้ดทั้งหมดเข้ามาใน Container
COPY . .

# เปิด พอร์ต 8000
EXPOSE 8000

# คำสั่งสำหรับรัน FastAPI Application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]