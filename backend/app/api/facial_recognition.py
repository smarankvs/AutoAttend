from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import cv2
from datetime import date
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

