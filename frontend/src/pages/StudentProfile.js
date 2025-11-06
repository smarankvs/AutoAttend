import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadStudentPhoto, updateProfile, getMe } from '../services/api';
import { PhotoIcon, CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';

const StudentProfile = () => {
  const { user, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    branch: '',
    year_of_joining: new Date().getFullYear(),
  });
  const [saveStatus, setSaveStatus] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        branch: user.branch || '',
        year_of_joining: user.year_of_joining || new Date().getFullYear(),
      });
    }
  }, [user]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setUploadStatus('');

    try {
      await uploadStudentPhoto(user.user_id, file);
      setUploadStatus('Photo uploaded successfully! Your face is now enrolled in the system.');
      // Refresh the page after 2 seconds to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setUploadError(error.response?.data?.detail || 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError('');
    setSaveStatus('');

    try {
      const response = await updateProfile(profileData);
      setUser(response.data);
      setSaveStatus('Profile updated successfully!');
      setEditing(false);
      // Refresh user data after 2 seconds
      setTimeout(async () => {
        const updatedUser = await getMe();
        setUser(updatedUser.data);
      }, 2000);
    } catch (error) {
      setSaveError(error.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getPhotoUrl = () => {
    if (user.primary_photo?.photo_path) {
      // Ensure photo_path starts with / for proper URL construction
      const path = user.primary_photo.photo_path.startsWith('/') 
        ? user.primary_photo.photo_path 
        : `/${user.primary_photo.photo_path}`;
      return `http://localhost:8000${path}`;
    }
    return null;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const branches = ['CSE', 'ISE', 'ECE', 'AIML', 'AICY', 'MEC', 'CIV'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
          <div className="text-center mb-8">
            {getPhotoUrl() ? (
              <div className="mx-auto h-32 w-32 rounded-full overflow-hidden border-4 border-primary-500 shadow-lg mb-4">
                <img 
                  src={getPhotoUrl()} 
                  alt={user.full_name} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="mx-auto h-24 w-24 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mb-4">
                <svg className="h-16 w-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <h2 className="text-3xl font-bold text-gray-800">Student Profile</h2>
            <p className="text-gray-600 mt-2">
              {getPhotoUrl() ? 'Your profile photo' : 'Upload your photo for facial recognition'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 mb-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Profile Information</h3>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <PencilIcon className="h-5 w-5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-gray-700"><span className="font-semibold">Name:</span> {user.full_name}</p>
                <p className="text-gray-700"><span className="font-semibold">Student ID:</span> {user.student_id || 'Not assigned'}</p>
                <p className="text-gray-700"><span className="font-semibold">Username:</span> {user.username}</p>
                <p className="text-gray-700"><span className="font-semibold">Email:</span> {user.email}</p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Edit Profile Details</h4>
              
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                  {saveError}
                </div>
              )}

              {saveStatus && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {saveStatus}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch
                  </label>
                  {editing ? (
                    <select
                      value={profileData.branch}
                      onChange={(e) => setProfileData({ ...profileData, branch: e.target.value })}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select Branch</option>
                      {branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-700">{user.branch || 'Not set'}</p>
                  )}
                </div>

                {/* Year of Joining */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year of Joining
                  </label>
                  {editing ? (
                    <select
                      value={profileData.year_of_joining}
                      onChange={(e) => setProfileData({ ...profileData, year_of_joining: parseInt(e.target.value) })}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-700">{user.year_of_joining || 'Not set'}</p>
                  )}
                </div>
              </div>

              {editing && (
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setProfileData({
                        branch: user.branch || '',
                        year_of_joining: user.year_of_joining || new Date().getFullYear(),
                      });
                      setSaveError('');
                      setSaveStatus('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-primary-500 transition-colors">
            <div className="text-center">
              <PhotoIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Upload Your Photo</h3>
              <p className="text-gray-600 mb-6">
                For the best results, use a clear front-facing photo with good lighting
              </p>

              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                  {uploadError}
                </div>
              )}

              {uploadStatus && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {uploadStatus}
                </div>
              )}

              <div className="flex flex-col items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className={`cursor-pointer flex items-center space-x-2 px-8 py-4 rounded-lg font-semibold transition-all duration-200 ${
                    uploading
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  <PhotoIcon className="h-6 w-6" />
                  <span>{uploading ? 'Uploading...' : 'Choose Photo'}</span>
                </label>
                <p className="text-sm text-gray-500 mt-4">
                  Accepted formats: JPG, PNG, JPEG
                </p>
              </div>
            </div>

            <div className="mt-8 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📸 Photo Requirements:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Clear, front-facing view of your face</li>
                <li>Good lighting (avoid shadows)</li>
                <li>Only you in the photo (no other people)</li>
                <li>No sunglasses, masks, or hats</li>
                <li>Face clearly visible</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This photo will be used for automatic attendance marking in your classes. 
              Make sure it's a recent, accurate photo of you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;

