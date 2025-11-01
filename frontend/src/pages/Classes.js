import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyClasses, createClass, deleteClass, enrollStudent, getStudents } from '../services/api';
import { PlusIcon, TrashIcon, XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const Classes = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formData, setFormData] = useState({
    class_name: '',
    class_code: '',
    description: '',
    cctv_feed_url: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesResponse, studentsResponse] = await Promise.all([
        getMyClasses(),
        getStudents(),
      ]);
      setClasses(classesResponse.data);
      setStudents(studentsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createClass(formData);
      setShowModal(false);
      setFormData({
        class_name: '',
        class_code: '',
        description: '',
        cctv_feed_url: '',
      });
      fetchData();
      alert('Class created successfully!');
    } catch (error) {
      alert('Error creating class: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class?')) {
      return;
    }
    try {
      await deleteClass(classId);
      fetchData();
      alert('Class deleted successfully!');
    } catch (error) {
      alert('Error deleting class: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEnroll = async (studentId) => {
    try {
      await enrollStudent({
        student_id: studentId,
        class_id: selectedClass.class_id,
      });
      setShowEnrollModal(false);
      setSelectedClass(null);
      alert('Student enrolled successfully!');
    } catch (error) {
      alert('Error enrolling student: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (user.role !== 'teacher' && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Access denied. Teacher or admin access required.</p>
        </div>
      </div>
    );
  }

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
            <h2 className="text-3xl font-bold text-gray-800">Class Management</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 shadow-lg"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Class</span>
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No classes found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <div
                  key={cls.class_id}
                  className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary-500 transition-all duration-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{cls.class_name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{cls.class_code}</p>
                      {cls.description && (
                        <p className="text-gray-700 text-sm mt-2">{cls.description}</p>
                      )}
                      {cls.cctv_feed_url && (
                        <p className="text-blue-600 text-xs mt-2">📹 CCTV Configured</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(cls.class_id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() => {
                        setSelectedClass(cls);
                        setShowEnrollModal(true);
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <UserPlusIcon className="h-5 w-5" />
                      <span>Enroll Student</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Create New Class</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Code
                </label>
                <input
                  type="text"
                  value={formData.class_code}
                  onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CCTV Feed URL
                </label>
                <input
                  type="text"
                  value={formData.cctv_feed_url}
                  onChange={(e) => setFormData({ ...formData, cctv_feed_url: e.target.value })}
                  placeholder="http://example.com/camera/feed"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-200"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {showEnrollModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Enroll Student in {selectedClass.class_name}
              </h3>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setSelectedClass(null);
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <div
                  key={student.user_id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{student.full_name}</p>
                    <p className="text-sm text-gray-600">{student.student_id}</p>
                  </div>
                  <button
                    onClick={() => handleEnroll(student.user_id)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Enroll
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;

