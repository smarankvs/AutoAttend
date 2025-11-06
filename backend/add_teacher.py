"""
Script to add a new teacher to the database.
Run from backend directory with venv activated.
"""

import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash


def add_teacher(username: str, email: str, full_name: str, password: str):
    """Add a new teacher to the database."""
    db: Session = SessionLocal()
    
    try:
        # Check if username or email already exists
        existing = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing:
            print(f"Error: Username or email already exists")
            return False
        
        # Create new teacher
        hashed_password = get_password_hash(password)
        new_teacher = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            role="teacher"
        )
        
        db.add(new_teacher)
        db.commit()
        db.refresh(new_teacher)
        
        print(f"\nSuccess! Teacher added:")
        print(f"  Username: {username}")
        print(f"  Email: {email}")
        print(f"  Full Name: {full_name}")
        print(f"  Role: teacher")
        print(f"\nYou can now login with:")
        print(f"  Username: {username}")
        print(f"  Password: {password}")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"Error: {str(e)}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("\nUsage:")
        print("  python add_teacher.py <username> <email> <full_name> <password>")
        print("\nExample:")
        print('  python add_teacher.py teacher2 teacher2@school.edu "Jane Smith" mypassword123')
        sys.exit(1)
    
    username = sys.argv[1]
    email = sys.argv[2]
    full_name = sys.argv[3]
    password = sys.argv[4]
    
    add_teacher(username, email, full_name, password)

