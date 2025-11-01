# AutoAttend - Project Structure

## 📁 Complete Directory Structure

```
AA-Web/
│
├── README.md                          # Main project overview
├── QUICKSTART.md                      # Quick 5-minute setup guide
├── SETUP_INSTRUCTIONS.md              # Detailed setup instructions
├── PROJECT_STRUCTURE.md               # This file
│
├── .gitignore                         # Git ignore rules
│
├── backend/                           # FastAPI Backend
│   ├── app/
│   │   ├── __init__.py                # Python package init
│   │   ├── main.py                    # FastAPI app entry point
│   │   │
│   │   ├── api/                       # API Routes
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # Authentication endpoints
│   │   │   ├── attendance.py          # Attendance management
│   │   │   ├── students.py            # Student CRUD operations
│   │   │   ├── classes.py             # Class management
│   │   │   └── facial_recognition.py  # Facial recognition endpoints
│   │   │
│   │   ├── core/                      # Core configuration
│   │   │   ├── config.py              # Settings & configuration
│   │   │   ├── database.py            # Database connection & session
│   │   │   ├── security.py            # Password hashing & JWT tokens
│   │   │   └── dependencies.py        # Dependency injection
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM Models
│   │   │   ├── __init__.py
│   │   │   ├── user.py                # User & StudentPhoto models
│   │   │   ├── class_model.py         # Class & Enrollment models
│   │   │   └── attendance.py          # Attendance model
│   │   │
│   │   ├── schemas/                   # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py                # User request/response schemas
│   │   │   ├── class_model.py         # Class schemas
│   │   │   └── attendance.py          # Attendance schemas
│   │   │
│   │   └── services/                  # Business logic services
│   │       └── facial_recognition.py  # Facial recognition service
│   │
│   ├── database.sql                   # MySQL database schema
│   ├── requirements.txt               # Python dependencies
│   └── .gitignore                     # Backend git ignore
│
└── frontend/                          # React Frontend
    ├── public/
    │   └── index.html                 # HTML template
    │
    ├── src/
    │   ├── App.js                     # Main React app component
    │   ├── index.js                   # React entry point
    │   ├── index.css                  # Global styles with Tailwind
    │   │
    │   ├── pages/                     # Page components
    │   │   ├── Login.js               # Login page
    │   │   ├── Dashboard.js           # Main dashboard
    │   │   ├── Attendance.js          # Attendance management page
    │   │   ├── Students.js            # Student management page
    │   │   └── Classes.js             # Class management page
    │   │
    │   ├── components/                # Reusable components
    │   │   └── PrivateRoute.js        # Protected route wrapper
    │   │
    │   ├── context/                   # React Context
    │   │   └── AuthContext.js         # Authentication context
    │   │
    │   └── services/                  # API services
    │       └── api.js                 # Axios API client
    │
    ├── package.json                   # Node.js dependencies
    ├── tailwind.config.js             # Tailwind CSS configuration
    ├── postcss.config.js              # PostCSS configuration
    └── .gitignore                     # Frontend git ignore
```

---

## 🏗️ Architecture Overview

### Backend Architecture (FastAPI + SQLAlchemy)

```
┌─────────────────────────────────────────┐
│         Client (Browser)                │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│         FastAPI Application             │
│  ┌───────────────────────────────────┐  │
│  │         API Routes                │  │
│  │  - auth.py                        │  │
│  │  - students.py                    │  │
│  │  - classes.py                     │  │
│  │  - attendance.py                  │  │
│  │  - facial_recognition.py          │  │
│  └──────────┬────────────────────────┘  │
│             ↓                            │
│  ┌───────────────────────────────────┐  │
│  │      Business Logic Layer         │  │
│  │  - Services                       │  │
│  │  - Dependencies                   │  │
│  └──────────┬────────────────────────┘  │
│             ↓                            │
│  ┌───────────────────────────────────┐  │
│  │        Data Access Layer          │  │
│  │  - Models (SQLAlchemy ORM)        │  │
│  │  - Schemas (Pydantic)             │  │
│  └──────────┬────────────────────────┘  │
└─────────────┼───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         MySQL Database                  │
│  - users                                │
│  - student_photos                       │
│  - classes                              │
│  - enrollments                          │
│  - attendance                           │
└─────────────────────────────────────────┘
```

### Frontend Architecture (React)

```
┌─────────────────────────────────────────┐
│            React App                    │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │        Routing (App.js)           │ │
│  │  - /login                          │ │
│  │  - /dashboard                      │ │
│  │  - /attendance                     │ │
│  │  - /students                       │ │
│  │  - /classes                        │ │
│  └──────────┬────────────────────────┘ │
│             ↓                           │
│  ┌───────────────────────────────────┐ │
│  │      Auth Context                 │ │
│  │  - User state management          │ │
│  │  - Login/logout                   │ │
│  └──────────┬────────────────────────┘ │
│             ↓                           │
│  ┌───────────────────────────────────┐ │
│  │      Page Components              │ │
│  │  - Login.js                       │ │
│  │  - Dashboard.js                   │ │
│  │  - Attendance.js                  │ │
│  │  - Students.js                    │ │
│  │  - Classes.js                     │ │
│  └──────────┬────────────────────────┘ │
│             ↓                           │
│  ┌───────────────────────────────────┐ │
│  │      API Service                  │ │
│  │  - Axios client                   │ │
│  │  - API endpoints                  │ │
│  └──────────┬────────────────────────┘ │
└─────────────┼───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│    FastAPI Backend (localhost:8000)    │
└─────────────────────────────────────────┘
```

---

## 📊 Database Schema

```
┌──────────────┐       ┌─────────────────┐
│    users     │───────│ student_photos  │
│              │       │                 │
│ - user_id    │       │ - photo_id      │
│ - username   │       │ - user_id (FK)  │
│ - email      │       │ - photo_path    │
│ - full_name  │       │ - face_encoding │
│ - role       │       │ - is_primary    │
│ - student_id │       └─────────────────┘
└──────┬───────┘
       │
       │ 1:N
       │
       ↓
┌──────────────┐       ┌─────────────────┐
│  enrollments │◄──────┤     classes     │
│              │       │                 │
│ - enroll_id  │       │ - class_id      │
│ - student_id │       │ - class_name    │
│ - class_id   │       │ - class_code    │
│              │       │ - teacher_id(FK)│
└──────┬───────┘       │ - cctv_feed_url │
       │               └─────────────────┘
       │                     │
       │                     │ N:1
       │                     ↓
       │               ┌──────────────┐
       │               │    users     │
       │               │  (teachers)  │
       └───────────────┤              │
                       │              │
                       └──────────────┘
                              │
                              │ N:1
                              ↓
                       ┌──────────────┐
                       │  attendance  │
                       │              │
                       │ - att_id     │
                       │ - student_id │
                       │ - class_id   │
                       │ - date       │
                       │ - status     │
                       └──────────────┘
```

---

## 🔑 Key Components

### Backend Components

#### 1. **Authentication (app/api/auth.py)**
- POST `/auth/login` - User login with JWT
- POST `/auth/register` - New user registration
- GET `/auth/me` - Get current user info

#### 2. **Students (app/api/students.py)**
- GET `/students/` - List all students
- POST `/students/` - Create new student
- POST `/students/{id}/upload-photo` - Upload student photo
- DELETE `/students/{id}` - Delete student

#### 3. **Classes (app/api/classes.py)**
- GET `/classes/` - List all classes
- GET `/classes/my-classes` - List teacher's classes
- POST `/classes/` - Create new class
- POST `/classes/enroll` - Enroll student in class
- DELETE `/classes/{id}` - Delete class

#### 4. **Attendance (app/api/attendance.py)**
- GET `/attendance/` - List attendance records
- GET `/attendance/my-stats` - Get statistics
- PUT `/attendance/{id}` - Update attendance

#### 5. **Facial Recognition (app/api/facial_recognition.py)**
- POST `/facial-recognition/scan-class/{id}` - Scan class attendance
- POST `/facial-recognition/load-students` - Load all faces

### Frontend Components

#### 1. **Pages**
- **Login.js** - Authentication page
- **Dashboard.js** - Role-based dashboard
- **Attendance.js** - Attendance viewing/editing
- **Students.js** - Student management
- **Classes.js** - Class management

#### 2. **Context**
- **AuthContext.js** - Global authentication state

#### 3. **Services**
- **api.js** - Centralized API client with Axios

---

## 🔐 Security Features

### Backend Security
- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (Student/Teacher/Admin)
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ CORS configuration
- ✅ Environment variables for secrets

### Frontend Security
- ✅ Protected routes
- ✅ Token storage in localStorage
- ✅ Auto-logout on token expiry
- ✅ Role-based UI access

---

## 🎨 UI/UX Features

- ✅ **Modern Design** - Clean, professional interface
- ✅ **Responsive** - Works on desktop and mobile
- ✅ **Tailwind CSS** - Utility-first CSS framework
- ✅ **Gradient Backgrounds** - Beautiful visual design
- ✅ **Icons** - Heroicons for better UX
- ✅ **Loading States** - User feedback during operations
- ✅ **Error Handling** - Clear error messages
- ✅ **Animations** - Smooth transitions

---

## 🚀 Technology Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Python 3.8+ | Programming language |
| FastAPI | Web framework |
| SQLAlchemy | ORM for database |
| MySQL | Database system |
| OpenCV | Computer vision |
| face_recognition | Facial recognition library |
| JWT | Authentication tokens |
| bcrypt | Password hashing |
| Pydantic | Data validation |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| React Router | Client-side routing |
| Axios | HTTP client |
| Tailwind CSS | CSS framework |
| Heroicons | Icon library |

---

## 📝 File Naming Conventions

### Backend
- **Files**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`

### Frontend
- **Files**: `PascalCase.js`
- **Components**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

---

## 🧪 Testing Considerations

### Recommended Test Files (To be added)
```
backend/
├── tests/
│   ├── test_auth.py
│   ├── test_students.py
│   ├── test_classes.py
│   ├── test_attendance.py
│   └── test_facial_recognition.py

frontend/
├── src/
│   └── __tests__/
│       ├── Login.test.js
│       ├── Dashboard.test.js
│       └── api.test.js
```

---

## 📦 Deployment Checklist

### Backend
- [ ] Set up production server (AWS, Heroku, DigitalOcean)
- [ ] Configure production database
- [ ] Set up environment variables
- [ ] Configure domain and SSL
- [ ] Set up logging
- [ ] Configure CORS for production domain

### Frontend
- [ ] Build production bundle: `npm run build`
- [ ] Deploy to hosting (Vercel, Netlify, etc.)
- [ ] Configure API endpoint
- [ ] Set up custom domain
- [ ] Enable HTTPS

---

## 🔧 Configuration Files

### Environment Variables (.env)
```env
DATABASE_URL=mysql+pymysql://user:pass@host:port/db
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Tailwind Config
- Custom colors (primary, secondary)
- Animations (fade-in, slide-up)
- Breakpoints for responsive design

---

## 📚 Additional Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com
- **React Docs**: https://react.dev
- **Tailwind Docs**: https://tailwindcss.com
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org
- **face_recognition**: https://github.com/ageitgey/face_recognition

---

**This structure provides a clean, maintainable, and scalable architecture for your final year project!** 🎓

