import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAttendance, getClasses, getMyEnrolledClasses, updateAttendance, scanClassAttendance, uploadClassPhoto, getMyStats } from '../services/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  VideoCameraIcon,
  PhotoIcon,
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedClass]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedClass ? { class_id: selectedClass } : {};
      const promises = [getAttendance(params)];
      
      // Fetch classes based on role
      if (user.role === 'student') {
        promises.push(getMyEnrolledClasses());
        promises.push(getMyStats(selectedClass || null));
      } else {
        promises.push(getClasses());
      }
      
      const results = await Promise.all(promises);
      setAttendance(results[0].data);
      setClasses(results[1].data);
      
      if (user.role === 'student' && results[2]) {
        setStats(results[2].data);
      }
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

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!selectedClass) {
      alert('Please select a class first');
      return;
    }

    // Validate date - cannot be in the future
    const selectedDate = new Date(attendanceDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate > today) {
      alert('Cannot mark attendance for future dates');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);

    setUploadingPhoto(true);
    try {
      const response = await uploadClassPhoto(selectedClass, file, attendanceDate);
      const result = response.data;
      
      // Show detailed results
      let message = `${result.message}\n\nPresent (${result.present.length}):\n`;
      result.present.forEach(student => {
        message += `- ${student.name} (${Math.round(student.confidence * 100)}%)\n`;
      });
      
      if (result.absent.length > 0) {
        message += `\nAbsent (${result.absent.length}):\n`;
        result.absent.forEach(student => {
          message += `- ${student.name}\n`;
        });
      }
      
      alert(message);
      setPhotoPreview(null);
      event.target.value = ''; // Reset file input
      fetchData();
    } catch (error) {
      alert('Error processing photo: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploadingPhoto(false);
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
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Date:</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <label className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg cursor-pointer disabled:opacity-50">
                  <PhotoIcon className="h-5 w-5" />
                  <span>{uploadingPhoto ? 'Processing...' : 'Upload Class Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => handleScan(selectedClass)}
                  disabled={scanning}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  <VideoCameraIcon className="h-5 w-5" />
                  <span>{scanning ? 'Scanning...' : 'Scan Class'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Student Stats Display */}
          {user.role === 'student' && stats && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                <p className="text-blue-100 text-sm">Total Classes</p>
                <p className="text-3xl font-bold mt-1">{stats.total_classes}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                <p className="text-green-100 text-sm">Present</p>
                <p className="text-3xl font-bold mt-1">{stats.present_count}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
                <p className="text-red-100 text-sm">Absent</p>
                <p className="text-3xl font-bold mt-1">{stats.absent_count || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                <p className="text-purple-100 text-sm">Attendance %</p>
                <p className="text-3xl font-bold mt-1">{stats.attendance_percentage}%</p>
                <p className="text-purple-200 text-xs mt-1">
                  {stats.present_count} / {stats.total_classes} classes
                </p>
              </div>
            </div>
          )}

          {/* Class Filter for both roles */}
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

          {photoPreview && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-blue-300">
              <p className="text-sm font-medium text-gray-700 mb-2">Photo Preview:</p>
              <img
                src={photoPreview}
                alt="Class photo preview"
                className="max-w-md rounded-lg shadow-md"
              />
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
                    {(user.role === 'student' || user.role === 'teacher') && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Class</th>
                    )}
                    {user.role === 'teacher' && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
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
                      {(user.role === 'student' || user.role === 'teacher') && (
                        <td className="py-3 px-4">{record.class_name || 'Unknown Class'}</td>
                      )}
                      {user.role === 'teacher' && (
                        <td className="py-3 px-4">{record.student_name}</td>
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

