# ID Card OCR Registration System

## Overview

The registration system has been enhanced to support automatic registration for both students and teachers using ID card OCR (Optical Character Recognition). Users can now upload their ID card images, and the system will automatically extract information and determine their role.

## Features Implemented

### 1. **ID Card OCR Processing**
   - Automatically extracts text from ID card images (front and back)
   - Uses EasyOCR for text recognition
   - Supports both student and teacher ID cards

### 2. **Automatic Role Detection**
   - Detects if user is a **student** or **teacher** based on ID card keywords
   - Student keywords: "student", "learner", "pupil", "scholar"
   - Teacher keywords: "faculty", "teacher", "instructor", "professor", "staff", "employee"

### 3. **Information Extraction**
   - **Full Name**: Extracted from ID card
   - **Roll Number/USN**: Extracted for students
   - **Branch/Department**: Extracted if available
   - **Email**: Extracted if present on ID card

### 4. **Enhanced Registration Page**
   - Upload front ID card (required)
   - Upload back ID card (optional)
   - Image preview before submission
   - Real-time validation
   - Displays extracted information after processing

## Setup Instructions

### Step 1: Install OCR Dependencies

```bash
cd backend
.\venv\Scripts\Activate.ps1  # On Windows
pip install -r requirements.txt
```

This will install:
- `easyocr==1.7.0` - OCR engine
- `pytesseract==0.3.10` - Alternative OCR (optional)

**Note:** On first run, EasyOCR will download language models (~50-100 MB). This is automatic and only happens once.

### Step 2: Update Database Schema

If you have an existing database, run the migration script:

```bash
# Using MySQL command line
mysql -u your_username -p autoattend < backend/add_branch_column.sql

# Or manually in MySQL:
USE autoattend;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(100) NULL AFTER student_id;
```

### Step 3: Restart Backend Server

```bash
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

### Step 4: Test Registration

1. Go to `http://localhost:3000/register`
2. Upload a clear image of an ID card (front side required, back optional)
3. Enter username and password
4. Submit the form
5. The system will process the ID card and create the account

## How It Works

### Registration Flow

1. **User uploads ID card** → Front side (required), Back side (optional)
2. **OCR processing** → Extracts all text from images
3. **Data extraction** → Parses name, roll number, branch, email
4. **Role detection** → Determines if student or teacher
5. **Account creation** → Creates user with extracted information
6. **Login access** → User can immediately login with their role

### OCR Processing Details

The system uses pattern matching to extract information:

- **Name**: Looks for patterns like "Name:", "Full Name:", "Student Name:"
- **Roll Number**: Patterns like "USN:", "Roll No:", "Student ID:", or generic patterns like "S001234"
- **Branch**: Patterns like "Branch:", "Department:", "Course:"
- **Email**: Standard email pattern matching

## API Endpoint

### New Registration Endpoint

**POST** `/auth/register-with-id`

**Request:**
- `id_card_front` (file, required): Front side of ID card
- `id_card_back` (file, optional): Back side of ID card
- `username` (form data, required): Desired username
- `password` (form data, required): Password

**Response:**
```json
{
  "user_id": 1,
  "username": "student123",
  "email": "student@autoattend.edu",
  "full_name": "John Doe",
  "role": "student",
  "student_id": "S001234",
  "branch": "Computer Science",
  "is_active": true
}
```

## ID Card Requirements

For best results, ensure ID cards meet these criteria:

✅ **Clear and readable text**
✅ **High resolution** (at least 300x300 pixels)
✅ **Good lighting** (well-lit, no shadows)
✅ **English text** (currently supports English only)
✅ **Proper orientation** (text should be horizontal)

## Troubleshooting

### Issue: "Could not extract full name from ID card"

**Solution:**
- Ensure the ID card image is clear and high resolution
- Make sure the text is readable
- Try uploading a different image or adjust lighting

### Issue: "OCR is not available"

**Solution:**
- Install EasyOCR: `pip install easyocr==1.7.0`
- Check that models are downloaded (first run will download automatically)

### Issue: Wrong role detected

**Solution:**
- The system detects role based on keywords in the ID card text
- If detected incorrectly, you can manually update the role in the database
- Or improve the ID card image quality

### Issue: Missing branch or roll number

**Solution:**
- Some ID cards may not have this information
- The system will still create the account with available information
- You can manually update these fields later

## Manual Role Assignment (If Needed)

If OCR fails to detect the role correctly, you can manually update it:

```sql
UPDATE users SET role = 'student' WHERE username = 'username_here';
-- or
UPDATE users SET role = 'teacher' WHERE username = 'username_here';
```

## Next Steps for Students

After registration, students should:

1. **Login** to their account
2. **Upload face photo** for facial recognition (from Profile page)
3. **Wait for enrollment** by teachers into classes
4. **View attendance** once enrolled

## Next Steps for Teachers

After registration, teachers can:

1. **Login** to their account
2. **Create classes** (from Manage Classes tab)
3. **Enroll students** (from Manage Classes tab)
4. **Mark attendance** (by uploading class photos)

## Files Modified

### Backend
- `backend/app/services/ocr_service.py` - New OCR service
- `backend/app/api/auth.py` - New registration endpoint
- `backend/app/models/user.py` - Added branch field
- `backend/app/schemas/user.py` - Added branch to schemas
- `backend/database.sql` - Updated schema with branch column
- `backend/requirements.txt` - Added OCR libraries

### Frontend
- `frontend/src/pages/Register.js` - Complete redesign with ID card upload

## Testing

Test the registration with different ID card formats:

1. **Student ID Card** - Should detect as "student" and extract roll number
2. **Teacher/Faculty ID Card** - Should detect as "teacher"
3. **Clear vs Blurry Images** - Test OCR accuracy
4. **Front + Back Cards** - Test data merging

## Notes

- First OCR processing may take 10-30 seconds (model download)
- Subsequent processing is faster (2-5 seconds)
- OCR accuracy depends on image quality
- The system falls back gracefully if some information cannot be extracted

