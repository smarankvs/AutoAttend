import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import AttendanceCalendar from './pages/AttendanceCalendar';
import Students from './pages/Students';
import Classes from './pages/Classes';
import StudentProfile from './pages/StudentProfile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/attendance"
            element={
              <PrivateRoute>
                <Attendance />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/attendance-calendar"
            element={
              <PrivateRoute allowedRoles={['student']}>
                <AttendanceCalendar />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/students"
            element={
              <PrivateRoute allowedRoles={['teacher']}>
                <Students />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/classes"
            element={
              <PrivateRoute allowedRoles={['teacher']}>
                <Classes />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <PrivateRoute allowedRoles={['student']}>
                <StudentProfile />
              </PrivateRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

