from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: str = "student"
    student_id: Optional[str] = None
    branch: Optional[str] = None
    year_of_joining: Optional[int] = None


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class StudentPhotoResponse(BaseModel):
    photo_id: int
    photo_path: str
    is_primary: bool
    uploaded_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    branch: Optional[str] = None
    year_of_joining: Optional[int] = None


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: str
    role: str
    student_id: Optional[str]
    branch: Optional[str] = None
    year_of_joining: Optional[int] = None
    is_active: bool
    primary_photo: Optional[StudentPhotoResponse] = None

    class Config:
        from_attributes = True
