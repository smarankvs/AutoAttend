# ⚡ AutoAttend - Quick Reference Card

## 🔐 Login Credentials

**Teacher:**
- Username: `teacher1`
- Password: `admin123`

**Student:**
- Username: `student1`
- Password: `admin123`

---

## 🚀 Start Project

**EASIEST:** Double-click `START_PROJECT.bat`

**OR Manual:**
```bash
Terminal 1: cd backend && venv\Scripts\activate && python -m uvicorn app.main:app --reload
Terminal 2: cd frontend && npm start
```

**Access:** http://localhost:3000

---

## 📸 Upload Student Photos

**Students upload their own:**
1. Login as student
2. Click "My Profile"
3. Click "Choose Photo"
4. Upload clear face image

---

## ⚠️ First Time Setup

**Recreate database:**
```bash
mysql -u root -p
DROP DATABASE IF EXISTS autoattend;
source backend\database.sql
```

---

## 📝 Where to Change Settings

**Database Password:** `backend/.env`  
**User Credentials:** `backend/database.sql`

---

## 📚 Need More Help?

- Complete Guide: `HOW_TO_USE.md`
- Student Guide: `STUDENT_GUIDE.md`
- Setup Instructions: `SETUP_INSTRUCTIONS.md`

---

**You're all set! 🎉**

