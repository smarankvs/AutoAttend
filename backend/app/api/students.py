from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List
import os
import numpy as np
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_teacher
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.models.user import User, StudentPhoto
from app.services.facial_recognition import facial_recognition_service

router = APIRouter(prefix="/students", tags=["Students"])


@router.post("/", response_model=UserResponse)
def create_student(
    username: str = Form(...),
    email: str = Form(...),
    full_name: str = Form(...),
    password: str = Form(...),
    student_id: str = Form(...),
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Register a new student."""
    from app.core.security import get_password_hash
    
    # Check if username or student_id already exists
    existing = db.query(User).filter(
        (User.username == username) | (User.student_id == student_id)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or Student ID already exists"
        )
    
    # Create student
    hashed_password = get_password_hash(password)
    new_student = User(
        username=username,
        email=email,
        full_name=full_name,
        hashed_password=hashed_password,
        role="student",
        student_id=student_id,
        branch=None  # Branch can be set later if needed
    )
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    return new_student


@router.post("/{student_id}/upload-photo")
def upload_student_photo(
    student_id: int,
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a photo for facial recognition."""
    # Allow teachers to upload for any student, students can only upload their own
    if current_user.role != "teacher" and current_user.user_id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. You can only upload your own photos."
        )
    
    student = db.query(User).filter(User.user_id == student_id, User.role == "student").first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Create upload directory if it doesn't exist
    upload_dir = "uploads/photos"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save photo
    file_extension = os.path.splitext(photo.filename)[1]
    file_path = os.path.join(upload_dir, f"student_{student_id}_{len(student.photos)}{file_extension}")
    
    with open(file_path, "wb") as buffer:
        content = photo.file.read()
        buffer.write(content)
    
    # Encode face
    face_encoding = facial_recognition_service.encode_face(file_path)
    
    if face_encoding is None:
        os.remove(file_path)  # Remove file if encoding failed
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in the image. Please upload a clear photo with a visible face."
        )
    
    # Convert encoding to binary
    encoding_bytes = face_encoding.tobytes()
    
    # If this is the first photo or marking as primary
    is_primary = len(student.photos) == 0
    
    # If setting as primary, unset other primary photos
    if is_primary:
        db.query(StudentPhoto).filter(
            StudentPhoto.user_id == student_id,
            StudentPhoto.is_primary == True
        ).update({"is_primary": False})
    
    # Save to database
    photo_record = StudentPhoto(
        user_id=student_id,
        photo_path=file_path,
        face_encoding=encoding_bytes,
        is_primary=is_primary
    )
    
    db.add(photo_record)
    
    # Also add to facial recognition service for real-time recognition
    facial_recognition_service.add_known_face(student.username, face_encoding)
    
    db.commit()
    db.refresh(photo_record)
    
    return {
        "message": "Photo uploaded successfully",
        "photo_id": photo_record.photo_id,
        "file_path": file_path
    }


@router.get("/", response_model=List[UserResponse])
def get_all_students(
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get all students."""
    students = db.query(User).filter(User.role == "student").options(joinedload(User.photos)).all()
    return students


@router.put("/{student_id}/profile", response_model=UserResponse)
def update_student_profile(
    student_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update student profile (branch and year of joining). Teachers can update any student, students can only update themselves."""
    student = db.query(User).filter(User.user_id == student_id, User.role == "student").first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Check permissions: teachers can update any student, students can only update themselves
    if current_user.role != "teacher" and current_user.user_id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. You can only update your own profile."
        )
    
    # Validate branch if provided
    if user_update.branch is not None:
        allowed_branches = ['CSE', 'ISE', 'ECE', 'AIML', 'AICY', 'MEC', 'CIV']
        if user_update.branch.upper() not in [b.upper() for b in allowed_branches]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid branch. Please select one of: {', '.join(allowed_branches)}"
            )
        student.branch = user_update.branch.upper()
    
    # Validate year_of_joining if provided
    if user_update.year_of_joining is not None:
        current_year = 2025  # You can make this dynamic
        if user_update.year_of_joining < 2000 or user_update.year_of_joining > current_year + 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid year of joining. Please enter a year between 2000 and {current_year + 1}."
            )
        student.year_of_joining = user_update.year_of_joining
    
    db.commit()
    db.refresh(student)
    
    return student


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Delete a student (Teachers only)."""
    student = db.query(User).filter(User.user_id == student_id, User.role == "student").first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    db.delete(student)
    db.commit()
    
    return {"message": "Student deleted successfully"}

