"""
One-time script to clear all attendance records from the database.
This will delete ALL attendance records but keep all users (teachers and students).
"""
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.attendance import Attendance
from sqlalchemy import delete

def clear_all_attendance():
    """Clear all attendance records from the database."""
    db = SessionLocal()
    try:
        # Count records before deletion
        count_before = db.query(Attendance).count()
        print(f"Found {count_before} attendance records to delete.")
        
        if count_before == 0:
            print("No attendance records found. Database is already clean.")
            return
        
        # Delete all attendance records (auto-confirmed since user requested this)
        print(f"\nDeleting {count_before} attendance records...")
        deleted_count = db.query(Attendance).delete()
        db.commit()
        
        print(f"\n[SUCCESS] Successfully deleted {deleted_count} attendance records.")
        print("[SUCCESS] All users (teachers and students) remain intact.")
        print("[SUCCESS] Database is now clean and ready for fresh attendance records.")
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Error clearing attendance records: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("ATTENDANCE RECORDS CLEANUP SCRIPT")
    print("=" * 60)
    print("\nThis script will:")
    print("  - Delete ALL attendance records from the database")
    print("  - Keep ALL users (teachers and students)")
    print("  - Keep ALL classes and enrollments")
    print("=" * 60)
    clear_all_attendance()
    print("=" * 60)

