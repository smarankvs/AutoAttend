"""
Script to add the branch column to the users table.
Run this script once to migrate your existing database.
"""
import sys
from sqlalchemy import text
from app.core.database import engine
from app.core.config import settings

def add_branch_column():
    """Add branch column to users table if it doesn't exist."""
    try:
        with engine.connect() as connection:
            # Check if column exists
            check_query = text("""
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'users'
                AND COLUMN_NAME = 'branch'
            """)
            
            result = connection.execute(check_query)
            count = result.fetchone()[0]
            
            if count > 0:
                print("Column 'branch' already exists in 'users' table.")
                return
            
            # Add the column
            alter_query = text("""
                ALTER TABLE users 
                ADD COLUMN branch VARCHAR(100) NULL AFTER student_id
            """)
            
            connection.execute(alter_query)
            connection.commit()
            print("Successfully added 'branch' column to 'users' table.")
            
    except Exception as e:
        print(f"Error adding branch column: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Adding branch column to users table...")
    add_branch_column()
    print("Migration complete!")

