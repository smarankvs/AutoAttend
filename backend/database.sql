-- AutoAttend Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS autoattend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE autoattend;

-- Users table (Students and Teachers)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher') NOT NULL DEFAULT 'student',
    student_id VARCHAR(20) UNIQUE NULL,  -- For students only
    branch VARCHAR(100) NULL,  -- Branch/Department for students and teachers
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_student_id (student_id),
    INDEX idx_role (role)
);

-- Student photos table (for facial recognition)
CREATE TABLE IF NOT EXISTS student_photos (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    photo_path VARCHAR(255) NOT NULL,
    face_encoding BLOB,  -- Store face encoding as binary data
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    class_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    teacher_id INT NOT NULL,
    cctv_feed_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(user_id),
    INDEX idx_class_code (class_code),
    INDEX idx_teacher_id (teacher_id)
);

-- Enrollments table (Students enrolled in classes)
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_enrollment (student_id, class_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    INDEX idx_student_id (student_id),
    INDEX idx_class_id (class_id)
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent') NOT NULL,
    marked_by ENUM('system', 'teacher') DEFAULT 'system',
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    teacher_modified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (student_id, class_id, attendance_date),
    INDEX idx_student_id (student_id),
    INDEX idx_class_id (class_id),
    INDEX idx_attendance_date (attendance_date)
);

-- Insert sample teacher (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (username, email, full_name, hashed_password, role) VALUES
('teacher1', 'teacher1@autoattend.edu', 'John Teacher', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5r3J.HCKjEGt2', 'teacher');

-- Insert sample student (password: admin123)
INSERT INTO users (username, email, full_name, hashed_password, role, student_id) VALUES
('student1', 'student1@autoattend.edu', 'John Student', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5r3J.HCKjEGt2', 'student', 'S001');

