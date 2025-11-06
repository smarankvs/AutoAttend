from sqlalchemy import Column, Integer, String, Boolean, Text, Enum, LargeBinary, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.mysql import DATETIME
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.student)
    student_id = Column(String(20), unique=True, nullable=True, index=True)
    branch = Column(String(100), nullable=True)  # Branch/Department
    year_of_joining = Column(Integer, nullable=True)  # Year of joining (e.g., 2024, 2025)
    is_active = Column(Boolean, default=True)
    created_at = Column(DATETIME, server_default=func.current_timestamp())
    updated_at = Column(DATETIME, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships
    photos = relationship("StudentPhoto", back_populates="student", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    taught_classes = relationship("Class", back_populates="teacher")
    
    @property
    def primary_photo(self):
        """Get the primary photo for this user."""
        if not self.photos:
            return None
        # Find primary photo or return the first one
        primary = next((p for p in self.photos if p.is_primary), None)
        return primary if primary else self.photos[0] if self.photos else None


class StudentPhoto(Base):
    __tablename__ = "student_photos"

    photo_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    photo_path = Column(String(255), nullable=False)
    face_encoding = Column(LargeBinary, nullable=True)  # Store face encoding as binary
    is_primary = Column(Boolean, default=False)
    uploaded_at = Column(DATETIME, server_default=func.current_timestamp())

    # Relationships
    student = relationship("User", back_populates="photos")

