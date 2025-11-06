from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import date, timedelta
from app.core.database import get_db
from app.core.dependencies import get_current_teacher, get_current_user
from app.schemas.class_model import ClassCreate, ClassResponse, ClassUpdate, EnrollmentCreate, BulkEnrollmentCreate
from app.models.class_model import Class, Enrollment
from app.models.user import User, StudentPhoto
from app.models.attendance import Attendance

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.post("/", response_model=ClassResponse)
def create_class(
    class_data: ClassCreate,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Create a new class."""
    # Check if class_code already exists
    existing = db.query(Class).filter(Class.class_code == class_data.class_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class code already exists"
        )
    
    new_class = Class(
        class_name=class_data.class_name,
        class_code=class_data.class_code,
        description=class_data.description,
        teacher_id=current_user.user_id,
        cctv_feed_url=class_data.cctv_feed_url
    )
    
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    
    return new_class


@router.get("/", response_model=List[ClassResponse])
def get_all_classes(
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get all classes."""
    classes = db.query(Class).all()
    return classes


@router.get("/my-classes", response_model=List[ClassResponse])
def get_my_classes(
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get classes taught by current teacher."""
    classes = db.query(Class).filter(Class.teacher_id == current_user.user_id).all()
    return classes


@router.get("/my-enrolled-classes", response_model=List[ClassResponse])
def get_my_enrolled_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get classes the current student is enrolled in."""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    # Get all enrollments for this student
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.user_id).all()
    class_ids = [e.class_id for e in enrollments]
    
    if not class_ids:
        return []
    
    # Get the classes
    classes = db.query(Class).filter(Class.class_id.in_(class_ids)).all()
    return classes


@router.post("/enroll")
def enroll_student(
    enrollment: EnrollmentCreate,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Enroll a student in a class."""
    # Verify class exists and belongs to teacher
    class_obj = db.query(Class).filter(Class.class_id == enrollment.class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to enroll students in this class"
        )
    
    # Verify student exists
    student = db.query(User).filter(User.user_id == enrollment.student_id).first()
    if not student or student.role != "student":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Check if already enrolled
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == enrollment.student_id,
        Enrollment.class_id == enrollment.class_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already enrolled in this class"
        )
    
    new_enrollment = Enrollment(
        student_id=enrollment.student_id,
        class_id=enrollment.class_id
    )
    
    db.add(new_enrollment)
    db.commit()
    
    return {"message": "Student enrolled successfully"}


@router.post("/enroll-bulk")
def enroll_students_bulk(
    enrollment: BulkEnrollmentCreate,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Enroll multiple students in a class at once."""
    # Verify class exists and belongs to teacher
    class_obj = db.query(Class).filter(Class.class_id == enrollment.class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to enroll students in this class"
        )
    
    if not enrollment.student_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No students provided"
        )
    
    # Verify all students exist and are actually students
    students = db.query(User).filter(
        User.user_id.in_(enrollment.student_ids),
        User.role == "student"
    ).all()
    
    if len(students) != len(enrollment.student_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some students were not found or are not valid students"
        )
    
    # Get existing enrollments
    existing_enrollments = db.query(Enrollment).filter(
        Enrollment.class_id == enrollment.class_id,
        Enrollment.student_id.in_(enrollment.student_ids)
    ).all()
    existing_student_ids = {e.student_id for e in existing_enrollments}
    
    # Filter out already enrolled students
    new_student_ids = [sid for sid in enrollment.student_ids if sid not in existing_student_ids]
    
    if not new_student_ids:
        return {
            "message": "All students are already enrolled in this class",
            "enrolled_count": 0,
            "already_enrolled_count": len(existing_student_ids),
            "skipped_count": 0
        }
    
    # Create new enrollments
    new_enrollments = [
        Enrollment(student_id=student_id, class_id=enrollment.class_id)
        for student_id in new_student_ids
    ]
    
    db.add_all(new_enrollments)
    db.commit()
    
    return {
        "message": f"Successfully enrolled {len(new_enrollments)} student(s)",
        "enrolled_count": len(new_enrollments),
        "already_enrolled_count": len(existing_student_ids),
        "skipped_count": 0
    }


@router.get("/{class_id}/students")
def get_class_students(
    class_id: int,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get all enrolled students for a class with their attendance statistics."""
    # Verify class exists and belongs to teacher
    class_obj = db.query(Class).filter(Class.class_id == class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view students for this class"
        )
    
    # Get enrolled students
    enrollments = db.query(Enrollment).filter(Enrollment.class_id == class_id).all()
    student_ids = [e.student_id for e in enrollments]
    
    if not student_ids:
        return []
    
    # Get students with their photos
    students = db.query(User).filter(
        User.user_id.in_(student_ids),
        User.role == "student"
    ).options(joinedload(User.photos)).all()
    
    # Calculate cutoff date (6 months ago) - same as cleanup service
    cutoff_date = date.today() - timedelta(days=int(6 * 30.44))
    
    result = []
    for student in students:
        # Get primary photo
        primary_photo = None
        if student.photos:
            primary_photo = next((p for p in student.photos if p.is_primary), None)
            if not primary_photo:
                primary_photo = student.photos[0] if student.photos else None
        
        # Calculate attendance statistics for this student in this class (last 6 months)
        attendance_records = db.query(Attendance).filter(
            Attendance.student_id == student.user_id,
            Attendance.class_id == class_id,
            Attendance.attendance_date >= cutoff_date
        ).all()
        
        total_classes = len(attendance_records)
        present_count = sum(1 for r in attendance_records if r.status == "present")
        attendance_percentage = (present_count / total_classes * 100) if total_classes > 0 else 0
        
        result.append({
            "user_id": student.user_id,
            "username": student.username,
            "full_name": student.full_name,
            "student_id": student.student_id,
            "email": student.email,
            "photo_path": primary_photo.photo_path if primary_photo else None,
            "attendance_percentage": round(attendance_percentage, 2),
            "total_classes": total_classes,
            "present_count": present_count,
            "absent_count": total_classes - present_count
        })
    
    # Sort by student_id (roll number) if available, otherwise by name
    result.sort(key=lambda x: (x["student_id"] or "", x["full_name"]))
    
    return result


@router.put("/{class_id}", response_model=ClassResponse)
def update_class(
    class_id: int,
    class_update: ClassUpdate,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Update a class."""
    class_obj = db.query(Class).filter(Class.class_id == class_id).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this class"
        )
    
    # Check if class_code is being updated and if it conflicts with another class
    if class_update.class_code and class_update.class_code != class_obj.class_code:
        existing = db.query(Class).filter(
            Class.class_code == class_update.class_code,
            Class.class_id != class_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Class code already exists"
            )
    
    # Update fields if provided
    if class_update.class_name is not None:
        class_obj.class_name = class_update.class_name
    if class_update.class_code is not None:
        class_obj.class_code = class_update.class_code
    if class_update.description is not None:
        class_obj.description = class_update.description
    if class_update.cctv_feed_url is not None:
        class_obj.cctv_feed_url = class_update.cctv_feed_url
    
    db.commit()
    db.refresh(class_obj)
    
    return class_obj


@router.delete("/{class_id}")
def delete_class(
    class_id: int,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Delete a class."""
    class_obj = db.query(Class).filter(Class.class_id == class_id).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this class"
        )
    
    db.delete(class_obj)
    db.commit()
    
    return {"message": "Class deleted successfully"}

