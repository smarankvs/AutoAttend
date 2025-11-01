# AutoAttend - Quick Start Guide

Get your AutoAttend system up and running in 5 minutes! 🚀

## Prerequisites
- MySQL installed and running
- Python 3.8+
- Node.js 16+

---

## 🎯 Quick Setup (5 Steps)

### Step 1: Setup Database (1 minute)
```bash
# Open MySQL and run the database script
mysql -u root -p < backend/database.sql
```

### Step 2: Setup Backend (2 minutes)
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy this content)
echo "DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/autoattend
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=http://localhost:3000
UPLOAD_DIR=uploads
FACES_DIR=faces" > .env

# Create directories
mkdir uploads/photos
mkdir faces

# Start server
uvicorn app.main:app --reload
```

**✅ Backend Running at: http://localhost:8000**

### Step 3: Setup Frontend (1 minute)
```bash
# Open a NEW terminal
cd frontend

# Install dependencies
npm install

# Start frontend
npm start
```

**✅ Frontend Running at: http://localhost:3000**

### Step 4: Login! (30 seconds)
1. Open browser: http://localhost:3000
2. Login with:
   - **Username**: `admin`
   - **Password**: `admin123`

### Step 5: Create Your First Student (30 seconds)
1. Click "Students" in the dashboard
2. Click "Add Student"
3. Fill in the form
4. Upload a clear face photo
5. Done! ✨

---

## 🧪 Test the System

### Quick Test Workflow:
1. ✅ Login as admin/teacher
2. ✅ Create a student with photo
3. ✅ Create a class
4. ✅ Enroll student in class
5. ✅ View attendance (empty for now)
6. ✅ Test "Scan Class" button

---

## 📸 Testing Facial Recognition

### Option A: Use Your Webcam
1. Install IP camera software (e.g., iSpy, ZoneMinder)
2. Get stream URL (usually `http://localhost:8080/video`)
3. Add URL to class's "CCTV Feed URL"
4. Click "Scan Class"

### Option B: Test with Static Images
The system currently works with live feeds. For static image testing, you'll need to modify the facial recognition code.

---

## 🆘 Common Issues

### Backend won't start
```bash
# Check if MySQL is running
mysql -u root -p

# Fix: Update .env DATABASE_URL with correct password
```

### "face_recognition" install failed
```bash
# Windows: Install Visual C++ Build Tools
# Then: pip install cmake
# Finally: pip install face-recognition

# Mac:
brew install cmake
pip install face-recognition

# Linux:
sudo apt-get install cmake
pip install face-recognition
```

### Frontend shows "Network Error"
```bash
# Make sure backend is running!
# Check: http://localhost:8000/docs should work

# Fix: Start backend with uvicorn app.main:app --reload
```

### Photo upload fails
- Use JPG/PNG format
- Clear face, good lighting
- Face should be clearly visible
- No masks or sunglasses

---

## 📚 Next Steps

1. **Read**: Full setup instructions in `SETUP_INSTRUCTIONS.md`
2. **Explore**: Check out the API docs at http://localhost:8000/docs
3. **Customize**: Modify the UI in `frontend/src/`
4. **Deploy**: See deployment section in SETUP_INSTRUCTIONS.md

---

## 🎓 Project Features Demo

### For Students:
- ✅ View personal attendance
- ✅ Check attendance percentage
- ✅ See attendance history

### For Teachers:
- ✅ Manage classes
- ✅ Manage students
- ✅ Upload student photos
- ✅ Enroll students
- ✅ Scan class attendance
- ✅ Edit attendance records
- ✅ View all attendance reports

### System Features:
- ✅ Facial recognition with OpenCV
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ MySQL database
- ✅ Beautiful React UI
- ✅ Real-time attendance scanning

---

## 🚀 Ready to Go!

Your AutoAttend system is now ready for your final year project! 🎉

**Pro Tips:**
- Take clear photos for better recognition
- Use good lighting in photos
- Test with a small class first
- Monitor the backend logs for any errors

**Need Help?**
- Check `SETUP_INSTRUCTIONS.md` for detailed docs
- Visit http://localhost:8000/docs for API reference
- Review the README.md for project overview

**Good luck with your project!** 🌟

