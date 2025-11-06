import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyClasses, createClass, updateClass, deleteClass, enrollStudent, enrollStudentsBulk, getStudents, getClassStudents } from '../services/api';
import { PlusIcon, TrashIcon, XMarkIcon, UserPlusIcon, PhotoIcon, PencilIcon } from '@heroicons/react/24/outline';

const Classes = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classStudentsMap, setClassStudentsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [formData, setFormData] = useState({
    class_name: '',
    class_code: '',
    description: '',
    cctv_feed_url: '',
  });
  const [editFormData, setEditFormData] = useState({
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
      
      // Fetch students for each class
      const studentsMap = {};
      const loadingMap = {};
      for (const cls of classesResponse.data) {
        loadingMap[cls.class_id] = true;
        try {
          const studentsResponse = await getClassStudents(cls.class_id);
          studentsMap[cls.class_id] = studentsResponse.data;
        } catch (error) {
          console.error(`Error fetching students for class ${cls.class_id}:`, error);
          studentsMap[cls.class_id] = [];
        }
        loadingMap[cls.class_id] = false;
      }
      setClassStudentsMap(studentsMap);
      setLoadingStudents(loadingMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentPhotoUrl = (student) => {
    if (student.primary_photo?.photo_path) {
      const path = student.primary_photo.photo_path.startsWith('/') 
        ? student.primary_photo.photo_path 
        : `/${student.primary_photo.photo_path}`;
      return `http://localhost:8000${path}`;
    }
    return null;
  };

  // Get enrolled student IDs for the selected class
  const enrolledStudentIds = useMemo(() => {
    if (!selectedClass) return new Set();
    return new Set((classStudentsMap[selectedClass.class_id] || []).map(s => s.user_id));
  }, [selectedClass, classStudentsMap]);

  // Get available students (not enrolled)
  const availableStudents = useMemo(() => {
    return students.filter(student => !enrolledStudentIds.has(student.user_id));
  }, [students, enrolledStudentIds]);

  // Calculate academic year based on year of joining
  const getCurrentYear = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11
    const currentYear = currentDate.getFullYear();
    
    // Academic year starts in August (month 7)
    if (currentMonth >= 7) {
      return currentYear;
    } else {
      return currentYear - 1;
    }
  };

  // Organize available students by branch and year
  const organizedStudents = useMemo(() => {
    const grouped = {};
    const currentAcademicYear = getCurrentYear();

    availableStudents.forEach(student => {
      const branch = student.branch || 'Unknown';
      const yearOfJoining = student.year_of_joining;
      
      if (!yearOfJoining) {
        if (!grouped[branch]) grouped[branch] = {};
        if (!grouped[branch]['Unknown']) grouped[branch]['Unknown'] = [];
        grouped[branch]['Unknown'].push(student);
        return;
      }

      const yearsIn = currentAcademicYear - yearOfJoining + 1;
      let yearLabel = 'Unknown';
      
      if (yearsIn >= 1 && yearsIn <= 4) {
        yearLabel = `Year ${yearsIn}`;
      } else if (yearsIn > 4) {
        yearLabel = 'Year 4+';
      }

      if (!grouped[branch]) grouped[branch] = {};
      if (!grouped[branch][yearLabel]) grouped[branch][yearLabel] = [];
      grouped[branch][yearLabel].push(student);
    });

    // Sort students within each group
    Object.keys(grouped).forEach(branch => {
      Object.keys(grouped[branch]).forEach(year => {
        grouped[branch][year].sort((a, b) => {
          const nameA = (a.full_name || '').toUpperCase();
          const nameB = (b.full_name || '').toUpperCase();
          if (nameA !== nameB) return nameA.localeCompare(nameB);
          const usnA = (a.student_id || '').toUpperCase();
          const usnB = (b.student_id || '').toUpperCase();
          return usnA.localeCompare(usnB);
        });
      });
    });

    return grouped;
  }, [availableStudents]);

  // Get all unique branches
  const branches = useMemo(() => {
    return Object.keys(organizedStudents).sort();
  }, [organizedStudents]);

  // Get years for selected branch
  const years = useMemo(() => {
    if (!selectedBranch || !organizedStudents[selectedBranch]) return [];
    return Object.keys(organizedStudents[selectedBranch]).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });
  }, [selectedBranch, organizedStudents]);

  // Get filtered students for enrollment
  const filteredStudents = useMemo(() => {
    if (!selectedBranch || !selectedYear) return [];
    return organizedStudents[selectedBranch]?.[selectedYear] || [];
  }, [selectedBranch, selectedYear, organizedStudents]);

  // Auto-select first branch and year when modal opens
  useEffect(() => {
    if (showEnrollModal && branches.length > 0) {
      setSelectedBranch(branches[0]);
    }
  }, [showEnrollModal, branches]);

  useEffect(() => {
    if (showEnrollModal && years.length > 0 && selectedBranch) {
      setSelectedYear(years[0]);
    }
  }, [showEnrollModal, years, selectedBranch]);

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

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setEditFormData({
      class_name: cls.class_name || '',
      class_code: cls.class_code || '',
      description: cls.description || '',
      cctv_feed_url: cls.cctv_feed_url || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateClass(editingClass.class_id, editFormData);
      setShowEditModal(false);
      setEditingClass(null);
      setEditFormData({
        class_name: '',
        class_code: '',
        description: '',
        cctv_feed_url: '',
      });
      fetchData();
      alert('Class updated successfully!');
    } catch (error) {
      alert('Error updating class: ' + (error.response?.data?.detail || error.message));
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
      alert('Student enrolled successfully!');
      fetchData(); // Refresh to show new enrollment - don't close modal so teacher can enroll more
    } catch (error) {
      alert('Error enrolling student: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.user_id)));
    }
  };

  const handleSelectBatch = (branch, year) => {
    const batchKey = `${branch}-${year}`;
    if (selectedBatch === batchKey) {
      setSelectedBatch(null);
      setSelectedStudents(new Set());
    } else {
      setSelectedBatch(batchKey);
      const batchStudents = organizedStudents[branch]?.[year] || [];
      setSelectedStudents(new Set(batchStudents.map(s => s.user_id)));
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student to enroll');
      return;
    }

    try {
      const response = await enrollStudentsBulk({
        student_ids: Array.from(selectedStudents),
        class_id: selectedClass.class_id,
      });
      const result = response.data;
      alert(`${result.message}\nEnrolled: ${result.enrolled_count}\nAlready enrolled: ${result.already_enrolled_count}`);
      setSelectedStudents(new Set());
      setSelectedBatch(null);
      fetchData(); // Refresh to show new enrollments
    } catch (error) {
      alert('Error enrolling students: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (user.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Access denied. Teacher access required.</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {classes.map((cls) => (
                <div
                  key={cls.class_id}
                  className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary-500 transition-all duration-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{cls.class_name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{cls.class_code}</p>
                      {cls.description && (
                        <p className="text-gray-700 text-sm mt-2">{cls.description}</p>
                      )}
                      {cls.cctv_feed_url && (
                        <p className="text-blue-600 text-xs mt-2">📹 CCTV Configured</p>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(cls)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit Class"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cls.class_id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete Class"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                                    <div className="border-t border-gray-200 pt-4 mt-4">
                    {/* Students Section */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Enrolled Students ({classStudentsMap[cls.class_id]?.length || 0})
                      </h4>
                      {loadingStudents[cls.class_id] ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                        </div>
                      ) : classStudentsMap[cls.class_id]?.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {classStudentsMap[cls.class_id].map((student) => (
                            <div
                              key={student.user_id}
                              className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              {/* Student Photo */}
                              {getStudentPhotoUrl(student) ? (
                                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary-500 flex-shrink-0">
                                  <img
                                    src={getStudentPhotoUrl(student)}
                                    alt={student.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center flex-shrink-0">
                                  <PhotoIcon className="h-6 w-6 text-white" />
                                </div>
                              )}
                              
                              {/* Student Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {student.full_name}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {student.student_id || `ID: ${student.user_id}`}
                                </p>
                              </div>
                              
                              {/* Attendance Percentage */}
                              <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-bold ${
                                  student.attendance_percentage >= 75 
                                    ? 'text-green-600' 
                                    : student.attendance_percentage >= 50 
                                    ? 'text-yellow-600' 
                                    : 'text-red-600'
                                }`}>
                                  {student.attendance_percentage.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-500">
                                  {student.total_classes > 0 
                                    ? `${student.present_count}/${student.total_classes}` 
                                    : 'No data'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No students enrolled yet
                        </div>
                      )}
                    </div>

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

      {/* Edit Class Modal */}
      {showEditModal && editingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Edit Class</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingClass(null);
                  setEditFormData({
                    class_name: '',
                    class_code: '',
                    description: '',
                    cctv_feed_url: '',
                  });
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={editFormData.class_name}
                  onChange={(e) => setEditFormData({ ...editFormData, class_name: e.target.value })}
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
                  value={editFormData.class_code}
                  onChange={(e) => setEditFormData({ ...editFormData, class_code: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
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
                  value={editFormData.cctv_feed_url}
                  onChange={(e) => setEditFormData({ ...editFormData, cctv_feed_url: e.target.value })}
                  placeholder="http://example.com/camera/feed"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClass(null);
                    setEditFormData({
                      class_name: '',
                      class_code: '',
                      description: '',
                      cctv_feed_url: '',
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-200"
                >
                  Update Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {showEnrollModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-slide-up">
            <div className="flex justify-between items-center mb-6 p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800">
                Enroll Student in {selectedClass.class_name}
              </h3>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setSelectedClass(null);
                  setSelectedBranch(null);
                  setSelectedYear(null);
                  setSelectedStudents(new Set());
                  setSelectedBatch(null);
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-6">
              {/* Branch Tabs */}
              {branches.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 border-b border-gray-200">
                    {branches.map((branch) => (
                      <button
                        key={branch}
                        onClick={() => {
                          setSelectedBranch(branch);
                          setSelectedYear(null);
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                          selectedBranch === branch
                            ? 'bg-primary-600 text-white border-b-2 border-primary-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        {branch}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Year Tabs */}
              {selectedBranch && years.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {years.map((year) => {
                      const batchKey = `${selectedBranch}-${year}`;
                      const isBatchSelected = selectedBatch === batchKey;
                      const batchStudents = organizedStudents[selectedBranch]?.[year] || [];
                      const allBatchSelected = batchStudents.length > 0 && 
                        batchStudents.every(s => selectedStudents.has(s.user_id));
                      
                      return (
                        <button
                          key={year}
                          onClick={() => {
                            setSelectedYear(year);
                            if (isBatchSelected) {
                              setSelectedBatch(null);
                              setSelectedStudents(new Set());
                            }
                          }}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors relative ${
                            selectedYear === year
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {year}
                          {allBatchSelected && batchStudents.length > 0 && (
                            <span className="ml-1 text-xs">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Batch Selection Button */}
                  {selectedYear && organizedStudents[selectedBranch]?.[selectedYear]?.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => handleSelectBatch(selectedBranch, selectedYear)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          selectedBatch === `${selectedBranch}-${selectedYear}`
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {selectedBatch === `${selectedBranch}-${selectedYear}`
                          ? `✓ Selected All ${selectedBranch} ${selectedYear} (${organizedStudents[selectedBranch]?.[selectedYear]?.length || 0} students)`
                          : `Select All ${selectedBranch} ${selectedYear} (${organizedStudents[selectedBranch]?.[selectedYear]?.length || 0} students)`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Student List */}
              <div className="flex-1 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {!selectedBranch || !selectedYear 
                      ? 'Please select a branch and year to view students'
                      : `No students available for ${selectedBranch} - ${selectedYear}`
                    }
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Select All Checkbox */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Select All ({filteredStudents.length} students)
                        </span>
                      </label>
                      <span className="text-sm text-gray-600">
                        {selectedStudents.size} selected
                      </span>
                    </div>

                    {filteredStudents.map((student) => (
                      <div
                        key={student.user_id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          selectedStudents.has(student.user_id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.user_id)}
                            onChange={() => handleSelectStudent(student.user_id)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0"
                          />
                          {getStudentPhotoUrl(student) ? (
                            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary-500 flex-shrink-0">
                              <img
                                src={getStudentPhotoUrl(student)}
                                alt={student.full_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center flex-shrink-0">
                              <PhotoIcon className="h-6 w-6 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{student.full_name}</p>
                            <p className="text-sm text-gray-600">{student.student_id || `ID: ${student.user_id}`}</p>
                            {student.branch && (
                              <p className="text-xs text-gray-500">Branch: {student.branch}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEnroll(student.user_id)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex-shrink-0 ml-4"
                        >
                          Enroll
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bulk Enroll Button */}
              {selectedStudents.size > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleBulkEnroll}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg font-medium"
                  >
                    Enroll Selected ({selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;

