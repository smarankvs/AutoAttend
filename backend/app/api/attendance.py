from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List
from datetime import date, datetime
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_teacher
from app.schemas.attendance import AttendanceResponse, AttendanceUpdate
from app.models.user import User
from app.models.attendance import Attendance, AttendanceStatus
from app.models.class_model import Class, Enrollment

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("/", response_model=List[AttendanceResponse])
def get_attendance(
    class_id: int = None,
    start_date: date = None,
    end_date: date = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance records based on user role and filters."""
    query = db.query(Attendance)
    
    # Students can only see their own attendance
    if current_user.role == "student":
        query = query.filter(Attendance.student_id == current_user.user_id)
    
    # Teachers can see all attendance for their classes
    elif current_user.role == "teacher":
        # Get all classes taught by this teacher
        teacher_classes = db.query(Class.class_id).filter(Class.teacher_id == current_user.user_id).all()
        class_ids = [cls.class_id for cls in teacher_classes]
        if not class_ids:
            return []
        query = query.filter(Attendance.class_id.in_(class_ids))
    
    # Apply filters
    if class_id:
        query = query.filter(Attendance.class_id == class_id)
    if start_date:
        query = query.filter(Attendance.attendance_date >= start_date)
    if end_date:
        query = query.filter(Attendance.attendance_date <= end_date)
    
    # Order by date descending
    query = query.order_by(Attendance.attendance_date.desc())
    
    attendances = query.all()
    
    # Add names for better display
    result = []
    for att in attendances:
        att_dict = {
            "attendance_id": att.attendance_id,
            "student_id": att.student_id,
            "class_id": att.class_id,
            "attendance_date": att.attendance_date,
            "status": att.status,
            "marked_by": att.marked_by,
            "marked_at": att.marked_at,
            "notes": att.notes,
            "teacher_modified": att.teacher_modified,
            "student_name": att.student.full_name if att.student else None,
            "class_name": att.class_obj.class_name if att.class_obj else None
        }
        result.append(AttendanceResponse(**att_dict))
    
    return result


@router.get("/my-stats")
def get_my_attendance_stats(
    class_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance statistics for current user."""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    query = db.query(Attendance).filter(Attendance.student_id == current_user.user_id)
    
    if class_id:
        query = query.filter(Attendance.class_id == class_id)
    
    all_records = query.all()
    
    total_classes = len(all_records)
    present_count = sum(1 for r in all_records if r.status == "present")
    absent_count = total_classes - present_count
    
    percentage = (present_count / total_classes * 100) if total_classes > 0 else 0
    
    return {
        "total_classes": total_classes,
        "present_count": present_count,
        "absent_count": absent_count,
        "attendance_percentage": round(percentage, 2)
    }


@router.put("/{attendance_id}")
def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Update attendance record (Teachers only)."""
    attendance = db.query(Attendance).filter(Attendance.attendance_id == attendance_id).first()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    # Verify teacher has access to this class
    class_obj = db.query(Class).filter(Class.class_id == attendance.class_id).first()
    if class_obj.teacher_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this attendance"
        )
    
    # Update fields
    if attendance_update.status:
        attendance.status = attendance_update.status
    if attendance_update.notes is not None:
        attendance.notes = attendance_update.notes
    
    attendance.teacher_modified = True
    
    db.commit()
    db.refresh(attendance)
    
    return {"message": "Attendance updated successfully", "attendance_id": attendance_id}

