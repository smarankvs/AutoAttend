#!/usr/bin/env python3
"""
Script to recreate the AutoAttend database with correct structure
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text, inspect
from app.core.database import engine, Base
from app.models.user import User, StudentPhoto
from app.models.class_model import Class, Enrollment
from app.models.attendance import Attendance
from app.core.security import get_password_hash

def recreate_database():
    """Drop and recreate all tables"""
    print("=" * 60)
    print("AutoAttend - Database Recreation Script")
    print("=" * 60)
    print()
    
    # Drop all tables
    print("Dropping existing tables...")
    try:
        with engine.connect() as conn:
            # Drop tables in correct order (respecting foreign keys)
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            conn.execute(text("DROP TABLE IF EXISTS attendance"))
            conn.execute(text("DROP TABLE IF EXISTS enrollments"))
            conn.execute(text("DROP TABLE IF EXISTS classes"))
            conn.execute(text("DROP TABLE IF EXISTS student_photos"))
            conn.execute(text("DROP TABLE IF EXISTS users"))
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            conn.commit()
        print("[OK] Tables dropped successfully")
    except Exception as e:
        print(f"[WARNING] Error dropping tables: {e}")
    
    print()
    print("Creating new tables...")
    
    # Create all tables
    try:
        Base.metadata.create_all(bind=engine)
        print("[OK] Tables created successfully")
    except Exception as e:
        print(f"[ERROR] Error creating tables: {e}")
        return False
    
    print()
    print("Adding default users...")
    
    # Add default users
    try:
        from app.core.database import SessionLocal
        db = SessionLocal()
        
        # Create teacher
        teacher = User(
            username="teacher1",
            email="teacher1@autoattend.edu",
            full_name="John Teacher",
            hashed_password=get_password_hash("admin123"),
            role="teacher",
            is_active=True
        )
        db.add(teacher)
        
        # Create student
        student = User(
            username="student1",
            email="student1@autoattend.edu",
            full_name="John Student",
            hashed_password=get_password_hash("admin123"),
            role="student",
            student_id="S001",
            is_active=True
        )
        db.add(student)
        
        db.commit()
        print("[OK] Default users created successfully")
        print()
        print("Created users:")
        print("  - Teacher: teacher1 / admin123")
        print("  - Student: student1 / admin123")
        
        db.close()
    except Exception as e:
        print(f"[ERROR] Error creating users: {e}")
        db.rollback()
        db.close()
        return False
    
    print()
    print("=" * 60)
    print("DATABASE RECREATED SUCCESSFULLY!")
    print("=" * 60)
    print()
    print("You can now:")
    print("  1. Start the backend server")
    print("  2. Login with:")
    print("     Teacher: teacher1 / admin123")
    print("     Student: student1 / admin123")
    print()
    
    return True

if __name__ == "__main__":
    try:
        recreate_database()
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        sys.exit(1)

