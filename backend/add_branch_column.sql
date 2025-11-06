-- Migration script to add branch column to users table
-- Run this if you have an existing database

USE autoattend;

-- Add branch column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS branch VARCHAR(100) NULL AFTER student_id;

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'autoattend' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'branch';

