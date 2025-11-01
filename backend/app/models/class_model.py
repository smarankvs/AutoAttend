from sqlalchemy import Column, Integer, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.mysql import DATETIME
from app.core.database import Base


class Class(Base):
    __tablename__ = "classes"

    class_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    class_name = Column(String(100), nullable=False)
    class_code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text)
    teacher_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    cctv_feed_url = Column(String(500))
    created_at = Column(DATETIME, server_default=func.current_timestamp())

    # Relationships
    teacher = relationship("User", back_populates="taught_classes")
    enrollments = relationship("Enrollment", back_populates="class_obj", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="class_obj")


class Enrollment(Base):
    __tablename__ = "enrollments"

    enrollment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.class_id", ondelete="CASCADE"), nullable=False, index=True)
    enrolled_at = Column(DATETIME, server_default=func.current_timestamp())

    # Relationships
    student = relationship("User", back_populates="enrollments")
    class_obj = relationship("Class", back_populates="enrollments")

    # Unique constraint
    __table_args__ = (UniqueConstraint('student_id', 'class_id', name='unique_enrollment'),)

