import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAttendance, getClasses, updateAttendance, scanClassAttendance } from '../services/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { useSearchParams } from 'react-router-dom';

const Attendance = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(searchParams.get('class') || '');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedClass]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedClass ? { class_id: selectedClass } : {};
      const [attendanceResponse, classesResponse] = await Promise.all([
        getAttendance(params),
        getClasses(),
      ]);
      setAttendance(attendanceResponse.data);
      setClasses(classesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (classId) => {
    setScanning(true);
    try {
      const response = await scanClassAttendance(classId);
      alert(response.data.message);
      fetchData();
    } catch (error) {
      alert('Error scanning attendance: ' + (error.response?.data?.detail || error.message));
    } finally {
      setScanning(false);
    }
  };

  const handleEdit = async (attendanceId) => {
    if (!editStatus) {
      setEditingId(null);
      return;
    }

    try {
      await updateAttendance(attendanceId, { status: editStatus });
      setEditingId(null);
      setEditStatus('');
      fetchData();
    } catch (error) {
      alert('Error updating attendance: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Attendance Records</h2>
            {user.role === 'teacher' && selectedClass && (
              <button
                onClick={() => handleScan(selectedClass)}
                disabled={scanning}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg disabled:opacity-50"
              >
                <VideoCameraIcon className="h-5 w-5" />
                <span>{scanning ? 'Scanning...' : 'Scan Class'}</span>
              </button>
            )}
          </div>

          {user.role === 'teacher' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {attendance.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No attendance records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    {user.role === 'teacher' && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                    )}
                    {user.role === 'teacher' && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Class</th>
                    )}
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    {user.role === 'teacher' && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.attendance_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {new Date(record.attendance_date).toLocaleDateString()}
                      </td>
                      {user.role === 'teacher' && (
                        <td className="py-3 px-4">{record.student_name}</td>
                      )}
                      {user.role === 'teacher' && (
                        <td className="py-3 px-4">{record.class_name}</td>
                      )}
                      <td className="py-3 px-4">
                        {editingId === record.attendance_id ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select...</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status === 'present' ? (
                              <CheckCircleIcon className="h-5 w-5" />
                            ) : (
                              <XCircleIcon className="h-5 w-5" />
                            )}
                            <span className="font-medium capitalize">{record.status}</span>
                          </span>
                        )}
                      </td>
                      {user.role === 'teacher' && (
                        <td className="py-3 px-4">
                          {editingId === record.attendance_id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(record.attendance_id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditStatus('');
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <XCircleIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(record.attendance_id);
                                setEditStatus(record.status);
                              }}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;

