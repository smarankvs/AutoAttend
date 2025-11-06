from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import cv2
import numpy as np
from datetime import date, datetime
import os
import face_recognition
from app.core.database import get_db
from app.core.dependencies import get_current_teacher
from app.models.user import User, StudentPhoto
from app.models.attendance import Attendance, AttendanceStatus
from app.models.class_model import Class, Enrollment
from app.services.facial_recognition import facial_recognition_service

router = APIRouter(prefix="/facial-recognition", tags=["Facial Recognition"])


@router.post("/scan-class/{class_id}")
def scan_class_attendance(
    class_id: int,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Scan CCTV feed and mark attendance for a class."""
    # Get class information
    class_obj = db.query(Class).filter(Class.class_id == class_id).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to scan attendance for this class"
        )
    
    if not class_obj.cctv_feed_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No CCTV feed URL configured for this class"
        )
    
    # Get enrolled students
    enrollments = db.query(Enrollment).filter(Enrollment.class_id == class_id).all()
    if not enrollments:
        return {"message": "No students enrolled in this class", "recognized": []}
    
    # Load face encodings for enrolled students
    student_ids = [e.student_id for e in enrollments]
    student_photos = db.query(StudentPhoto).filter(
        StudentPhoto.user_id.in_(student_ids),
        StudentPhoto.is_primary == True
    ).all()
    
    if not student_photos:
        return {"message": "No student photos found", "recognized": []}
    
    # Build face recognition dictionary
    encodings_dict = {}
    for photo in student_photos:
        user = db.query(User).filter(User.user_id == photo.user_id).first()
        if user and photo.face_encoding:
            encodings_dict[user.username] = photo.face_encoding
    
    if not encodings_dict:
        return {"message": "No face encodings available", "recognized": []}
    
    # Load encodings into recognition service
    facial_recognition_service.load_known_faces_from_db(encodings_dict)
    
    # Get frame from CCTV
    frame = facial_recognition_service.get_frame_from_cctv(class_obj.cctv_feed_url)
    
    if frame is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to capture frame from CCTV feed"
        )
    
    # Recognize faces
    recognized_faces = facial_recognition_service.recognize_faces(frame)
    
    today = date.today()
    recognized_students = []
    
    # Mark attendance for recognized students
    for name, face_location, confidence in recognized_faces:
        if name != "Unknown" and confidence > 0.5:
            # Find student by username
            student = db.query(User).filter(User.username == name).first()
            
            if student and student.user_id in student_ids:
                # Check if attendance already marked for today
                existing = db.query(Attendance).filter(
                    Attendance.student_id == student.user_id,
                    Attendance.class_id == class_id,
                    Attendance.attendance_date == today
                ).first()
                
                if not existing:
                    # Create new attendance record
                    new_attendance = Attendance(
                        student_id=student.user_id,
                        class_id=class_id,
                        attendance_date=today,
                        status=AttendanceStatus.present,
                        marked_by="system"
                    )
                    db.add(new_attendance)
                    recognized_students.append({
                        "name": student.full_name,
                        "username": student.username,
                        "confidence": round(confidence, 2)
                    })
    
    db.commit()
    
    return {
        "message": f"Attendance scanned. {len(recognized_students)} students recognized.",
        "recognized": recognized_students,
        "date": today.isoformat()
    }


@router.post("/upload-class-photo/{class_id}")
async def upload_class_photo_scan(
    class_id: int,
    photo: UploadFile = File(...),
    attendance_date: Optional[str] = Form(None),
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Upload a class photo and automatically mark attendance for recognized students.
    If attendance_date is provided, marks attendance for that date (for previous days).
    If not provided, defaults to today's date."""
    # Get class information
    class_obj = db.query(Class).filter(Class.class_id == class_id).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to scan attendance for this class"
        )
    
    # Get enrolled students
    enrollments = db.query(Enrollment).filter(Enrollment.class_id == class_id).all()
    if not enrollments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No students enrolled in this class"
        )
    
    # Load face encodings for enrolled students
    student_ids = [e.student_id for e in enrollments]
    student_photos = db.query(StudentPhoto).filter(
        StudentPhoto.user_id.in_(student_ids),
        StudentPhoto.is_primary == True
    ).all()
    
    if not student_photos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No student photos found for enrolled students"
        )
    
    # Build face recognition dictionary with decoded numpy arrays
    encodings_dict = {}
    for student_photo in student_photos:
        user = db.query(User).filter(User.user_id == student_photo.user_id).first()
        if user and student_photo.face_encoding:
            # Convert binary encoding to numpy array
            encoding = np.frombuffer(student_photo.face_encoding, dtype=np.float64)
            encodings_dict[user.username] = encoding
    
    if not encodings_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face encodings available"
        )
    
    # Load encodings into recognition service
    facial_recognition_service.load_known_faces_from_db(encodings_dict)
    
    # Save uploaded photo temporarily
    upload_dir = "uploads/class_photos"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = os.path.splitext(photo.filename)[1]
    # Use a timestamp for unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_file_path = os.path.join(upload_dir, f"class_{class_id}_{timestamp}{file_extension}")
    
    with open(temp_file_path, "wb") as buffer:
        content = await photo.read()
        buffer.write(content)
    
    try:
        # Load the image
        image = face_recognition.load_image_file(temp_file_path)
        
        # Find face locations
        face_locations = face_recognition.face_locations(image, model="hog")
        
        if not face_locations:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No faces detected in the uploaded image"
            )
        
        # Encode faces in the image
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        # Recognize faces
        recognized_faces = []
        for (face_encoding, face_location) in zip(face_encodings, face_locations):
            # Compare with known faces
            matches = face_recognition.compare_faces(
                list(encodings_dict.values()),
                face_encoding,
                tolerance=0.6
            )
            
            name = "Unknown"
            confidence = 0.0
            
            # Find the best match
            face_distances = face_recognition.face_distance(
                list(encodings_dict.values()),
                face_encoding
            )
            best_match_index = np.argmin(face_distances)
            
            if matches[best_match_index]:
                name = list(encodings_dict.keys())[best_match_index]
                confidence = 1 - face_distances[best_match_index]
            
            recognized_faces.append((name, face_location, confidence))
        
        # Process recognized students and mark attendance
        # Parse attendance_date if provided, otherwise use today
        if attendance_date:
            try:
                target_date = datetime.strptime(attendance_date, "%Y-%m-%d").date()
                # Don't allow future dates
                if target_date > date.today():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot mark attendance for future dates"
                    )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format. Use YYYY-MM-DD"
                )
        else:
            target_date = date.today()
        
        recognized_students = []
        absent_students = []
        
        # Get all enrolled students
        all_enrolled_students = db.query(User).filter(User.user_id.in_(student_ids)).all()
        
        recognized_usernames = []
        
        for name, face_location, confidence in recognized_faces:
            if name != "Unknown" and confidence > 0.5:
                recognized_usernames.append(name)
                # Find student by username
                student = db.query(User).filter(User.username == name).first()
                
                if student and student.user_id in student_ids:
                    # Check if attendance already marked for the target date
                    existing = db.query(Attendance).filter(
                        Attendance.student_id == student.user_id,
                        Attendance.class_id == class_id,
                        Attendance.attendance_date == target_date
                    ).first()
                    
                    if not existing:
                        # Create new attendance record
                        new_attendance = Attendance(
                            student_id=student.user_id,
                            class_id=class_id,
                            attendance_date=target_date,
                            status=AttendanceStatus.present,
                            marked_by="system"
                        )
                        db.add(new_attendance)
                    else:
                        # Update existing record if it exists
                        existing.status = AttendanceStatus.present
                        existing.marked_by = "system"
                    
                    recognized_students.append({
                        "name": student.full_name,
                        "username": student.username,
                        "student_id": student.student_id,
                        "confidence": round(confidence, 2)
                    })
        
        # Mark absent for students not recognized
        for student in all_enrolled_students:
            if student.username not in recognized_usernames:
                # Check if attendance already marked for the target date
                existing = db.query(Attendance).filter(
                    Attendance.student_id == student.user_id,
                    Attendance.class_id == class_id,
                    Attendance.attendance_date == target_date
                ).first()
                
                if not existing:
                    # Create absent attendance record
                    new_attendance = Attendance(
                        student_id=student.user_id,
                        class_id=class_id,
                        attendance_date=target_date,
                        status=AttendanceStatus.absent,
                        marked_by="system"
                    )
                    db.add(new_attendance)
                else:
                    # Update existing record if it exists
                    existing.status = AttendanceStatus.absent
                    existing.marked_by = "system"
                    absent_students.append({
                        "name": student.full_name,
                        "username": student.username,
                        "student_id": student.student_id
                    })
        
        db.commit()
        
        # Clean up temp file
        try:
            os.remove(temp_file_path)
        except:
            pass
        
        return {
            "message": f"Attendance marked successfully! {len(recognized_students)} present, {len(absent_students)} absent.",
            "present": recognized_students,
            "absent": absent_students,
            "total_faces_detected": len(face_locations),
            "date": target_date.isoformat()
        }
        
    except Exception as e:
        # Clean up temp file on error
        try:
            os.remove(temp_file_path)
        except:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )


@router.post("/load-students")
def load_all_student_faces(
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Load all student face encodings into memory."""
    student_photos = db.query(StudentPhoto).filter(StudentPhoto.is_primary == True).all()
    
    encodings_dict = {}
    for photo in student_photos:
        user = db.query(User).filter(User.user_id == photo.user_id).first()
        if user and photo.face_encoding:
            encodings_dict[user.username] = photo.face_encoding
    
    facial_recognition_service.load_known_faces_from_db(encodings_dict)
    
    return {
        "message": f"Loaded {len(encodings_dict)} student faces into memory",
        "count": len(encodings_dict)
    }

