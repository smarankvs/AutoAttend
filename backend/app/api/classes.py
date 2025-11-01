from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_teacher
from app.schemas.class_model import ClassCreate, ClassResponse, EnrollmentCreate
from app.models.class_model import Class, Enrollment
from app.models.user import User

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
    
    if class_obj.teacher_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this class"
        )
    
    db.delete(class_obj)
    db.commit()
    
    return {"message": "Class deleted successfully"}

