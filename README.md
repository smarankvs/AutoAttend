# AutoAttend - Automated Attendance System

## Project Overview

AutoAttend is an intelligent attendance management system that uses facial recognition technology to automatically mark attendance for students in classrooms. The system captures live CCTV footage, performs facial recognition scans, and maintains a comprehensive attendance database.

## Features

### For Students
- View personal attendance records
- Check attendance percentage
- Real-time attendance status

### For Teachers
- View all students' attendance
- Modify/edit attendance records
- Real-time monitoring of class attendance

### Core Technology
- **Facial Recognition**: OpenCV for real-time face detection and recognition
- **Backend**: FastAPI with secure authentication
- **Database**: MySQL for storing student data, facial encodings, and attendance
- **Frontend**: React with modern, attractive UI
- **Authentication**: Secure login system with role-based access (Student/Teacher)

## Tech Stack

- **Backend**: FastAPI, Python, OpenCV, face_recognition, MySQL
- **Frontend**: React, React Router, Axios
- **Database**: MySQL
- **Authentication**: JWT tokens, bcrypt

## Project Structure

```
AA-Web/
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── api/            # API routes
│   │   ├── core/           # Configuration, security
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI app entry point
│   ├── requirements.txt
│   └── database.sql
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── context/        # React context
│   │   └── App.js
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL 8.0+
- Camera/CCTV feed for facial recognition

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up MySQL database:
```bash
mysql -u root -p < database.sql
```

5. Configure environment variables:
Create a `.env` file in the backend directory:
```
DATABASE_URL=mysql://user:password@localhost:3306/autoattend
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

6. Run the backend server:
```bash
uvicorn app.main:app --reload
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm start
```

## Usage

1. **Admin Setup**: Create an admin account in the database to register students and teachers
2. **Student Registration**: Add students with their photos to the system
3. **Class Setup**: Configure CCTV feed for each classroom
4. **Monitoring**: System automatically detects and marks attendance
5. **Dashboard**: Students and teachers can view attendance through the web interface

## Future Enhancements

- Email notifications for low attendance
- Analytics and reporting
- Multi-classroom support
- Attendance history graphs
- Export attendance reports

## Team Members

Final Year Engineering Project - [Your Team Name]

## License

This project is for educational purposes only.

