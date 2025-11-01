# AutoAttend - Detailed Setup Instructions

## Overview
This guide will help you set up the AutoAttend system on your local machine step by step.

## Prerequisites
Before you begin, ensure you have the following installed:
- **Python 3.8 or higher** ([Download here](https://www.python.org/downloads/))
- **Node.js 16+ and npm** ([Download here](https://nodejs.org/))
- **MySQL 8.0+** ([Download here](https://dev.mysql.com/downloads/))
- **Git** (optional, for cloning the repository)

---

## Part 1: MySQL Database Setup

### Step 1: Install and Start MySQL
1. Install MySQL if not already installed
2. Start MySQL service:
   - **Windows**: Open Services and start "MySQL80" service
   - **Linux/Mac**: `sudo systemctl start mysql` or `brew services start mysql`

### Step 2: Create Database
1. Open MySQL command line or any MySQL client (phpMyAdmin, MySQL Workbench, etc.)
2. Run the database script:
   ```bash
   mysql -u root -p < backend/database.sql
   ```
   Or manually:
   ```sql
   mysql -u root -p
   source backend/database.sql
   ```

### Step 3: Verify Database
```sql
USE autoattend;
SHOW TABLES;
```
You should see tables: users, student_photos, classes, enrollments, attendance

### Default Credentials
The script creates a default admin user:
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@autoattend.edu`

---

## Part 2: Backend Setup (FastAPI)

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Create Virtual Environment
**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

**Note**: If you encounter issues with installing `face-recognition`, you may need to install additional dependencies:
- **Windows**: Install CMake and Visual C++ Build Tools
- **Linux**: `sudo apt-get install cmake build-essential`
- **Mac**: `brew install cmake`

### Step 4: Configure Environment Variables
Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DATABASE_URL=mysql+pymysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/autoattend

# Security (Change these in production!)
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
APP_NAME=AutoAttend
DEBUG=True
HOST=0.0.0.0
PORT=8000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# File Upload
MAX_UPLOAD_SIZE=10485760
UPLOAD_DIR=uploads

# Facial Recognition
FACES_DIR=faces
RECOGNITION_TOLERANCE=0.6
```

**Important**: Replace `YOUR_MYSQL_PASSWORD` with your actual MySQL root password!

### Step 5: Create Required Directories
```bash
# In the backend directory
mkdir -p uploads/photos
mkdir -p faces
```

### Step 6: Start Backend Server
```bash
# Make sure you're in the backend directory and venv is activated
uvicorn app.main:app --reload
```

The backend should now be running at: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Alternative Docs: `http://localhost:8000/redoc`

**Keep this terminal running!**

---

## Part 3: Frontend Setup (React)

### Step 1: Open New Terminal and Navigate to Frontend
```bash
cd frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Install Tailwind CSS (if needed)
Tailwind CSS should be installed automatically, but if you encounter issues:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 4: Start Frontend Development Server
```bash
npm start
```

The frontend should automatically open in your browser at: `http://localhost:3000`

---

## Part 4: Testing the System

### 1. Login
- Open `http://localhost:3000`
- Try logging in with default credentials:
  - Admin: `admin` / `admin123`
  - Teacher: `teacher1` / `admin123`

### 2. Create a Test Student
1. Login as teacher or admin
2. Go to "Students" section
3. Click "Add Student"
4. Fill in the form:
   - Full Name: John Doe
   - Username: student1
   - Email: student1@email.com
   - Student ID: S001
   - Password: student123
5. Click "Create Student"

### 3. Upload Student Photo
1. Find the student you just created
2. Click "Upload Photo"
3. Select a clear face photo (make sure there's a visible face!)
4. Wait for upload to complete

### 4. Create a Class
1. Go to "Classes" section
2. Click "Create Class"
3. Fill in:
   - Class Name: Math 101
   - Class Code: MATH101
   - Description: Introduction to Mathematics
   - CCTV Feed URL: (optional for testing)
4. Click "Create Class"

### 5. Enroll Student
1. Find your created class
2. Click "Enroll Student"
3. Select the student and click "Enroll"

---

## Testing Facial Recognition

### Option 1: Use a Webcam Feed
1. Configure CCTV feed URL in class settings with your webcam stream
2. For local testing, use: `http://localhost:8080/video` (if you have an IP camera)

### Option 2: Test with Static Image
You can modify the facial recognition code to accept local image files for testing.

### Scanning Attendance
1. Go to "Attendance" page
2. Select your class
3. Click "Scan Class" button
4. Wait for recognition to complete
5. Check attendance records

---

## Troubleshooting

### Backend Issues

**Import Error with face_recognition:**
```bash
pip install dlib
# If this fails, install CMake first
# Windows: pip install cmake
# Linux: sudo apt-get install cmake
```

**MySQL Connection Error:**
- Check MySQL is running
- Verify password in .env file
- Check database name is "autoattend"
- Try: `mysql -u root -p` to test connection

**Port 8000 Already in Use:**
```bash
# Change port in .env file or run with different port:
uvicorn app.main:app --reload --port 8001
```

### Frontend Issues

**npm install fails:**
```bash
# Clear cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Module not found errors:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

**Tailwind not working:**
- Check `tailwind.config.js` exists
- Verify `postcss.config.js` exists
- Restart the development server

### Facial Recognition Issues

**No face detected in photo:**
- Use a clear, front-facing photo
- Ensure good lighting
- Face should occupy most of the image

**Recognition accuracy is low:**
- Adjust `RECOGNITION_TOLERANCE` in .env (default: 0.6)
- Lower values = stricter matching
- Higher values = more lenient matching

---

## Production Deployment

### Backend (FastAPI)
1. Use a production ASGI server like Gunicorn:
   ```bash
   pip install gunicorn
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```
2. Set up reverse proxy with Nginx
3. Use environment variables for secrets
4. Enable HTTPS

### Frontend (React)
1. Build production version:
   ```bash
   npm run build
   ```
2. Serve static files with Nginx or another web server
3. Configure API endpoint to production backend URL

### Database
1. Create dedicated MySQL user with limited permissions
2. Enable backups
3. Use connection pooling
4. Implement database replication for high availability

---

## Security Recommendations

1. **Change default passwords** immediately
2. **Use strong SECRET_KEY** in production
3. **Enable HTTPS** for all connections
4. **Implement rate limiting** for API endpoints
5. **Add input validation** and sanitization
6. **Regular security updates** for dependencies
7. **Monitor logs** for suspicious activity
8. **Backup database** regularly

---

## API Endpoints Summary

### Authentication
- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `GET /auth/me` - Get current user

### Students
- `GET /students/` - List all students
- `POST /students/` - Create student
- `POST /students/{id}/upload-photo` - Upload photo
- `DELETE /students/{id}` - Delete student

### Classes
- `GET /classes/` - List all classes
- `GET /classes/my-classes` - List teacher's classes
- `POST /classes/` - Create class
- `POST /classes/enroll` - Enroll student
- `DELETE /classes/{id}` - Delete class

### Attendance
- `GET /attendance/` - List attendance records
- `GET /attendance/my-stats` - Get statistics
- `PUT /attendance/{id}` - Update attendance

### Facial Recognition
- `POST /facial-recognition/scan-class/{class_id}` - Scan class
- `POST /facial-recognition/load-students` - Load all faces

---

## Support

If you encounter any issues:
1. Check the error messages carefully
2. Review the troubleshooting section
3. Check MySQL logs and server logs
4. Verify all environment variables are correct
5. Ensure all dependencies are installed

For additional help, refer to:
- FastAPI Documentation: https://fastapi.tiangolo.com
- React Documentation: https://react.dev
- face_recognition Library: https://github.com/ageitgey/face_recognition

---

**Good luck with your final year project! 🎓**

