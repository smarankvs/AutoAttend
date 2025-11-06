from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import date, datetime, timedelta
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_teacher
from app.schemas.attendance import AttendanceResponse, AttendanceUpdate
from app.models.user import User
from app.models.attendance import Attendance, AttendanceStatus
from app.models.class_model import Class, Enrollment
from app.services.cleanup import cleanup_service

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
        
        # If filtering by class, verify student is enrolled in that class
        if class_id:
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.user_id,
                Enrollment.class_id == class_id
            ).first()
            if not enrollment:
                # Student is not enrolled in this class, return empty list
                return []
            query = query.filter(Attendance.class_id == class_id)
    
    # Teachers can see all attendance for their classes
    elif current_user.role == "teacher":
        # Get all classes taught by this teacher
        teacher_classes = db.query(Class.class_id).filter(Class.teacher_id == current_user.user_id).all()
        class_ids = [cls.class_id for cls in teacher_classes]
        if not class_ids:
            return []
        query = query.filter(Attendance.class_id.in_(class_ids))
        
        # Apply class filter if provided
        if class_id:
            if class_id not in class_ids:
                # Teacher doesn't teach this class, return empty list
                return []
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


@router.get("/calendar")
def get_attendance_calendar(
    class_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance records in calendar format (date -> status) for students."""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    # Get attendance records for the student
    query = db.query(Attendance).filter(
        Attendance.student_id == current_user.user_id
    )
    
    if class_id is not None:
        query = query.filter(Attendance.class_id == class_id)
    
    # Get all records (for calendar view, we want all dates)
    records = query.order_by(Attendance.attendance_date.desc()).all()
    
    # Build calendar map: date -> list of attendance records
    # If filtering by class_id, we show single status per date
    # If not filtering, we show the overall status (present if any class is present, absent if all are absent)
    calendar_map = {}
    for record in records:
        date_str = record.attendance_date.isoformat()
        if date_str not in calendar_map:
            calendar_map[date_str] = {
                "status": record.status,
                "classes": [],
                "marked_by": record.marked_by
            }
        
        # Add class info
        class_info = {
            "class_id": record.class_id,
            "class_name": record.class_obj.class_name if record.class_obj else None,
            "status": record.status
        }
        calendar_map[date_str]["classes"].append(class_info)
        
        # If any class is present, mark overall as present
        if record.status == "present":
            calendar_map[date_str]["status"] = "present"
    
    return {
        "calendar": calendar_map,
        "total_records": len(records)
    }


@router.get("/my-stats")
def get_my_attendance_stats(
    class_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get attendance statistics for current user (last 6 months only).
    Statistics are calculated based on the same 6-month retention period.
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    # Calculate cutoff date (6 months ago) - same as cleanup service
    cutoff_date = date.today() - timedelta(days=int(6 * 30.44))
    
    query = db.query(Attendance).filter(
        Attendance.student_id == current_user.user_id,
        Attendance.attendance_date >= cutoff_date  # Only last 6 months
    )
    
    if class_id:
        query = query.filter(Attendance.class_id == class_id)
    
    all_records = query.all()
    
    total_classes = len(all_records)
    present_count = sum(1 for r in all_records if r.status == "present")
    absent_count = sum(1 for r in all_records if r.status == "absent")
    
    percentage = (present_count / total_classes * 100) if total_classes > 0 else 0
    
    return {
        "total_classes": total_classes,
        "present_count": present_count,
        "absent_count": absent_count,
        "attendance_percentage": round(percentage, 2),
        "period_start_date": cutoff_date.isoformat(),
        "period_end_date": date.today().isoformat(),
        "period_months": 6
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
    if class_obj.teacher_id != current_user.user_id:
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


@router.post("/cleanup-old-records")
def cleanup_old_attendance_records(
    months: Optional[int] = 6,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Manually trigger cleanup of attendance records older than specified months.
    Teachers only. Default is 6 months.
    
    This endpoint is for manual cleanup/testing. Automatic cleanup runs daily at 2 AM.
    """
    if months < 1 or months > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Months must be between 1 and 24"
        )
    
    result = cleanup_service.cleanup_old_attendance(db, months=months)
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["message"]
        )
    
    return result

