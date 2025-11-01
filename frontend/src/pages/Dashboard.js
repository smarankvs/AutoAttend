import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  ClipboardDocumentCheckIcon,
  PhotoIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { getClasses, getMyClasses, getMyStats, scanClassAttendance } from '../services/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (user.role === 'student') {
        const statsResponse = await getMyStats();
        setStats(statsResponse.data);
      } else if (user.role === 'teacher') {
        const classesResponse = await getMyClasses();
        setClasses(classesResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
      {/* Header */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  AutoAttend
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.full_name}</span>
              <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'student' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Attendance Statistics</h2>
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">Total Classes</p>
                        <p className="text-4xl font-bold mt-2">{stats.total_classes}</p>
                      </div>
                      <ClipboardDocumentCheckIcon className="h-12 w-12 opacity-80" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">Present</p>
                        <p className="text-4xl font-bold mt-2">{stats.present_count}</p>
                      </div>
                      <ChartBarIcon className="h-12 w-12 opacity-80" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100">Attendance %</p>
                        <p className="text-4xl font-bold mt-2">{stats.attendance_percentage}%</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl">📊</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/attendance')}
                  className="flex items-center justify-between p-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center space-x-4">
                    <ClipboardDocumentCheckIcon className="h-8 w-8" />
                    <span className="text-lg font-semibold">View Attendance</span>
                  </div>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate('/attendance')}
                  className="flex items-center justify-between p-6 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl hover:from-secondary-600 hover:to-secondary-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center space-x-4">
                    <ChartBarIcon className="h-8 w-8" />
                    <span className="text-lg font-semibold">View Statistics</span>
                  </div>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {user.role === 'teacher' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Classes</h2>
              {classes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classes.map((cls) => (
                    <div key={cls.class_id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary-500 transition-all duration-200 hover:shadow-lg">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{cls.class_name}</h3>
                      <p className="text-gray-600 mb-4">{cls.class_code}</p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/attendance?class=${cls.class_id}`)}
                          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          View Attendance
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No classes assigned yet.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate('/classes')}
                  className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                >
                  <UsersIcon className="h-12 w-12 mb-3" />
                  <span className="text-lg font-semibold">Manage Classes</span>
                </button>

                <button
                  onClick={() => navigate('/students')}
                  className="flex flex-col items-center p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg"
                >
                  <UsersIcon className="h-12 w-12 mb-3" />
                  <span className="text-lg font-semibold">Manage Students</span>
                </button>

                <button
                  onClick={() => navigate('/attendance')}
                  className="flex flex-col items-center p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
                >
                  <ClipboardDocumentCheckIcon className="h-12 w-12 mb-3" />
                  <span className="text-lg font-semibold">View Attendance</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

