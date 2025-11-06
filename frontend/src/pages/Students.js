import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStudents, createStudent, deleteStudent, uploadStudentPhoto, updateStudentProfile } from '../services/api';
import { UserPlusIcon, TrashIcon, PhotoIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';

const Students = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState({});
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    student_id: '',
  });
  const [editProfileData, setEditProfileData] = useState({
    branch: '',
    year_of_joining: new Date().getFullYear(),
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await getStudents();
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate current year of study (1st, 2nd, 3rd, 4th)
  const getCurrentYear = (yearOfJoining) => {
    if (!yearOfJoining) return null;
    const currentYear = new Date().getFullYear();
    const month = new Date().getMonth(); // 0-11
    // If before July, academic year hasn't progressed yet
    const academicYear = month < 6 ? currentYear - 1 : currentYear;
    const yearsIn = academicYear - yearOfJoining + 1;
    if (yearsIn >= 1 && yearsIn <= 4) return yearsIn;
    return null;
  };

  // Group students by branch and year
  const organizedStudents = useMemo(() => {
    const grouped = {};
    
    students
      .filter(s => s.role === 'student')
      .forEach(student => {
        const branch = student.branch || 'Unknown';
        const year = getCurrentYear(student.year_of_joining);
        const yearKey = year ? `Year ${year}` : 'Unknown';
        
        if (!grouped[branch]) {
          grouped[branch] = {};
        }
        if (!grouped[branch][yearKey]) {
          grouped[branch][yearKey] = [];
        }
        grouped[branch][yearKey].push(student);
      });

    // Sort within each group: alphabetically by name, then by USN
    Object.keys(grouped).forEach(branch => {
      Object.keys(grouped[branch]).forEach(year => {
        grouped[branch][year].sort((a, b) => {
          // First sort by name
          const nameCompare = a.full_name.localeCompare(b.full_name);
          if (nameCompare !== 0) return nameCompare;
          // Then by USN/roll number
          const usnA = (a.student_id || '').toUpperCase();
          const usnB = (b.student_id || '').toUpperCase();
          return usnA.localeCompare(usnB);
        });
      });
    });

    return grouped;
  }, [students]);

  // Get all unique branches
  const branches = useMemo(() => {
    return Object.keys(organizedStudents).sort();
  }, [organizedStudents]);

  // Get years for selected branch
  const years = useMemo(() => {
    if (!selectedBranch || !organizedStudents[selectedBranch]) return [];
    return Object.keys(organizedStudents[selectedBranch]).sort((a, b) => {
      // Sort: Year 1, Year 2, Year 3, Year 4, Unknown
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });
  }, [selectedBranch, organizedStudents]);

  // Get filtered students
  const filteredStudents = useMemo(() => {
    if (!selectedBranch || !selectedYear) return [];
    return organizedStudents[selectedBranch]?.[selectedYear] || [];
  }, [selectedBranch, selectedYear, organizedStudents]);

  // Auto-select first branch and year if available
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]);
    }
  }, [branches, selectedBranch]);

  useEffect(() => {
    if (years.length > 0 && !selectedYear && selectedBranch) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear, selectedBranch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createStudent(formData);
      setShowModal(false);
      setFormData({
        username: '',
        email: '',
        full_name: '',
        password: '',
        student_id: '',
      });
      fetchStudents();
      alert('Student created successfully!');
    } catch (error) {
      alert('Error creating student: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }
    try {
      await deleteStudent(studentId);
      fetchStudents();
      alert('Student deleted successfully!');
    } catch (error) {
      alert('Error deleting student: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handlePhotoUpload = async (studentId, file) => {
    if (!file) return;

    setUploading({ ...uploading, [studentId]: true });
    try {
      await uploadStudentPhoto(studentId, file);
      alert('Photo uploaded successfully!');
      fetchStudents();
    } catch (error) {
      alert('Error uploading photo: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading({ ...uploading, [studentId]: false });
    }
  };

  const handleEditProfile = (student) => {
    setEditingStudent(student.user_id);
    setEditProfileData({
      branch: student.branch || '',
      year_of_joining: student.year_of_joining || new Date().getFullYear(),
    });
  };

  const handleSaveProfile = async (studentId) => {
    setSavingProfile(true);
    try {
      await updateStudentProfile(studentId, editProfileData);
      alert('Student profile updated successfully!');
      setEditingStudent(null);
      fetchStudents();
    } catch (error) {
      alert('Error updating profile: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSavingProfile(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const branchOptions = ['CSE', 'ISE', 'ECE', 'AIML', 'AICY', 'MEC', 'CIV'];

  const getStudentPhotoUrl = (student) => {
    if (student.primary_photo?.photo_path) {
      const path = student.primary_photo.photo_path.startsWith('/') 
        ? student.primary_photo.photo_path 
        : `/${student.primary_photo.photo_path}`;
      return `http://localhost:8000${path}`;
    }
    return null;
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
            <h2 className="text-3xl font-bold text-gray-800">Student Management</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 shadow-lg"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>Add Student</span>
            </button>
          </div>

          {branches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No students found.</p>
            </div>
          ) : (
            <>
              {/* Branch Tabs */}
              <div className="mb-6 border-b border-gray-200">
                <div className="flex space-x-1 overflow-x-auto">
                  {branches.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => {
                        setSelectedBranch(branch);
                        setSelectedYear(null); // Reset year selection
                      }}
                      className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                        selectedBranch === branch
                          ? 'border-b-2 border-primary-600 text-primary-600'
                          : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                      }`}
                    >
                      {branch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Tabs */}
              {selectedBranch && years.length > 0 && (
                <div className="mb-6 border-b border-gray-200">
                  <div className="flex space-x-1 overflow-x-auto">
                    {years.map((year) => (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                          selectedYear === year
                            ? 'border-b-2 border-primary-600 text-primary-600'
                            : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Students List */}
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">
                    No students found for {selectedBranch} - {selectedYear || 'All Years'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.user_id}
                      className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary-500 transition-all duration-200 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getStudentPhotoUrl(student) ? (
                            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary-500 flex-shrink-0">
                              <img 
                                src={getStudentPhotoUrl(student)} 
                                alt={student.full_name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                              <PhotoIcon className="h-8 w-8 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-800 truncate">{student.full_name}</h3>
                            <p className="text-gray-600 text-sm truncate">@{student.username}</p>
                            {student.student_id && (
                              <p className="text-gray-600 text-sm font-semibold">USN: {student.student_id}</p>
                            )}
                            {student.branch && (
                              <p className="text-gray-500 text-xs">Branch: {student.branch}</p>
                            )}
                            {student.year_of_joining && (
                              <p className="text-gray-500 text-xs">Joined: {student.year_of_joining}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditProfile(student)}
                            className="text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
                            title="Edit Profile"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.user_id)}
                            className="text-red-600 hover:text-red-800 transition-colors flex-shrink-0"
                            title="Delete Student"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Edit Profile Section */}
                      {editingStudent === student.user_id && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-3">Edit Profile</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Branch
                              </label>
                              <select
                                value={editProfileData.branch}
                                onChange={(e) => setEditProfileData({ ...editProfileData, branch: e.target.value })}
                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              >
                                <option value="">Select Branch</option>
                                {branchOptions.map(branch => (
                                  <option key={branch} value={branch}>{branch}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Year of Joining
                              </label>
                              <select
                                value={editProfileData.year_of_joining}
                                onChange={(e) => setEditProfileData({ ...editProfileData, year_of_joining: parseInt(e.target.value) })}
                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              >
                                {yearOptions.map(year => (
                                  <option key={year} value={year}>{year}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex space-x-2 mt-3">
                            <button
                              onClick={() => handleSaveProfile(student.user_id)}
                              disabled={savingProfile}
                              className="flex-1 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {savingProfile ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingStudent(null);
                                setEditProfileData({ branch: '', year_of_joining: new Date().getFullYear() });
                              }}
                              className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload Photo for Recognition
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handlePhotoUpload(student.user_id, file);
                            }}
                            className="hidden"
                            id={`photo-${student.user_id}`}
                          />
                          <label
                            htmlFor={`photo-${student.user_id}`}
                            className="flex-1 cursor-pointer flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <PhotoIcon className="h-5 w-5" />
                            <span>
                              {uploading[student.user_id] ? 'Uploading...' : 'Upload Photo'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Add New Student</h3>
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
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID
                </label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
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
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
