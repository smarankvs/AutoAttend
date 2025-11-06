# AutoAttend - Photo Upload Attendance Feature

## Overview
Teachers can now upload a class photo to automatically mark attendance using facial recognition!

## How It Works

### For Teachers:
1. **Login** as a teacher (teacher1 / admin123)
2. **Go to Attendance** page
3. **Select a Class** from the dropdown
4. **Click "Upload Class Photo"** button
5. **Upload** a photo of the class
6. **View Results** showing:
   - Present students with confidence scores
   - Absent students (not recognized)
7. **Edit** any attendance if needed

### For Students:
1. Students **upload their own photos** through "My Profile"
2. They can **view their attendance** on the Attendance page
3. They **cannot edit** attendance

## Technical Details

### Backend Endpoint
- **URL**: `POST /facial-recognition/upload-class-photo/{class_id}`
- **Authentication**: Teacher only
- **Input**: Image file (photo of class)
- **Process**:
  1. Loads enrolled students' face encodings
  2. Detects all faces in uploaded image
  3. Matches detected faces with known students
  4. Marks present/absent automatically
  5. Returns detailed results

### Frontend
- New "Upload Class Photo" button on Attendance page
- Photo preview before upload
- Detailed results display
- Real-time status updates

## Key Features

✅ **Automatic face detection** using OpenCV
✅ **Face recognition** with confidence scores
✅ **Auto-mark attendance** for recognized students
✅ **Mark absent** for unrecognized enrolled students
✅ **Photo preview** before upload
✅ **Detailed results** with confidence percentages
✅ **Edit attendance** by teachers
✅ **Student self-upload** of profile photos

## Requirements

1. Students must have uploaded their photos via "My Profile"
2. Class must be created and students enrolled
3. Good lighting in the photo
4. Clear faces visible in the photo

## Workflow

```
1. Student → Uploads photo via "My Profile"
2. Teacher → Creates class and enrolls students
3. Teacher → Takes class photo
4. Teacher → Uploads photo to Attendance page
5. System → Recognizes faces and marks attendance
6. Both → Can view updated attendance
7. Teacher → Can edit if needed
```

## Important Notes

- Minimum confidence: 50% (0.5)
- Tolerance: 0.6 (configurable in backend)
- Photos are temporarily stored, then deleted
- One attendance record per student per day per class
- Existing attendance for the day is not overwritten


================================================================================
READY TO USE!
================================================================================

Login as teacher and try uploading a class photo now!

