from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, Date, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.mysql import DATETIME
from app.core.database import Base
import enum


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"


class MarkedBy(str, enum.Enum):
    system = "system"
    teacher = "teacher"


class Attendance(Base):
    __tablename__ = "attendance"

    attendance_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.class_id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_date = Column(Date, nullable=False, index=True)
    status = Column(Enum(AttendanceStatus), nullable=False)
    marked_by = Column(Enum(MarkedBy), default=MarkedBy.system)
    marked_at = Column(DATETIME, server_default=func.current_timestamp())
    notes = Column(Text)
    teacher_modified = Column(Boolean, default=False)

    # Relationships
    student = relationship("User", back_populates="attendances")
    class_obj = relationship("Class", back_populates="attendances")

    # Unique constraint
    __table_args__ = (UniqueConstraint('student_id', 'class_id', 'attendance_date', name='unique_attendance'),)

