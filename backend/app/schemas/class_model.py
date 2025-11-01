from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClassCreate(BaseModel):
    class_name: str
    class_code: str
    description: Optional[str] = None
    cctv_feed_url: Optional[str] = None


class ClassResponse(BaseModel):
    class_id: int
    class_name: str
    class_code: str
    description: Optional[str]
    teacher_id: int
    cctv_feed_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    student_id: int
    class_id: int

