from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class AttendanceCreate(BaseModel):
    student_id: int
    class_id: int
    attendance_date: date
    status: str  # "present" or "absent"
    marked_by: str = "system"
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    attendance_id: int
    student_id: int
    class_id: int
    attendance_date: date
    status: str
    marked_by: str
    marked_at: datetime
    notes: Optional[str]
    teacher_modified: bool
    student_name: Optional[str] = None
    class_name: Optional[str] = None

    class Config:
        from_attributes = True

