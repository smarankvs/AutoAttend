"""
Script to add the year_of_joining column to the users table.
"""
import sys
from sqlalchemy import text
from app.core.database import engine

def add_year_of_joining_column():
    """Add year_of_joining column to users table if it doesn't exist."""
    try:
        with engine.connect() as connection:
            # Check if column exists
            check_query = text("""
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'users'
                AND COLUMN_NAME = 'year_of_joining'
            """)
            
            result = connection.execute(check_query)
            count = result.fetchone()[0]
            
            if count > 0:
                print("Column 'year_of_joining' already exists in 'users' table.")
                return
            
            # Add the column
            alter_query = text("""
                ALTER TABLE users 
                ADD COLUMN year_of_joining INT NULL AFTER branch
            """)
            
            connection.execute(alter_query)
            connection.commit()
            print("Successfully added 'year_of_joining' column to 'users' table.")
            
    except Exception as e:
        print(f"Error adding year_of_joining column: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Adding year_of_joining column to users table...")
    add_year_of_joining_column()
    print("Migration complete!")

