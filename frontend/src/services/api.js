import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = (username, password) => {
  return api.post('/auth/login', { username, password });
};

export const register = (userData) => {
  return api.post('/auth/register', userData);
};

export const getMe = () => {
  return api.get('/auth/me');
};

// Attendance endpoints
export const getAttendance = (params = {}) => {
  return api.get('/attendance/', { params });
};

export const getMyStats = (classId) => {
  return api.get('/attendance/my-stats', { params: { class_id: classId } });
};

export const updateAttendance = (attendanceId, data) => {
  return api.put(`/attendance/${attendanceId}`, data);
};

// Student endpoints
export const getStudents = () => {
  return api.get('/students/');
};

export const createStudent = (studentData) => {
  const formData = new FormData();
  Object.keys(studentData).forEach(key => {
    formData.append(key, studentData[key]);
  });
  return api.post('/students/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadStudentPhoto = (studentId, photo) => {
  const formData = new FormData();
  formData.append('photo', photo);
  return api.post(`/students/${studentId}/upload-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteStudent = (studentId) => {
  return api.delete(`/students/${studentId}`);
};

// Class endpoints
export const getClasses = () => {
  return api.get('/classes/');
};

export const getMyClasses = () => {
  return api.get('/classes/my-classes');
};

export const createClass = (classData) => {
  return api.post('/classes/', classData);
};

export const enrollStudent = (enrollmentData) => {
  return api.post('/classes/enroll', enrollmentData);
};

export const deleteClass = (classId) => {
  return api.delete(`/classes/${classId}`);
};

// Facial Recognition endpoints
export const scanClassAttendance = (classId) => {
  return api.post(`/facial-recognition/scan-class/${classId}`);
};

export const loadAllStudentFaces = () => {
  return api.post('/facial-recognition/load-students');
};

export default api;

