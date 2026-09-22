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