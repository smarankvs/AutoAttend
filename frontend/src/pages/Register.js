import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserCircleIcon, LockClosedIcon, IdentificationIcon, PhotoIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const Register = () => {
  const [step, setStep] = useState(1); // 1: Upload ID, 2: Fill details
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirm_password: '',
    full_name: '',
    roll_number: '',
    branch: '',
    year_of_joining: new Date().getFullYear(),
  });
  const [idCardFront, setIdCardFront] = useState(null);
  const [idCardBack, setIdCardBack] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (file, type) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    if (type === 'front') {
      setIdCardFront(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFrontPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setIdCardBack(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractData = async () => {
    if (!idCardFront) {
      setError('Please upload the front side of your ID card');
      return;
    }

    setError('');
    setProcessing(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('id_card_front', idCardFront);
      if (idCardBack) {
        formDataToSend.append('id_card_back', idCardBack);
      }
      
      // First, extract data from ID card (we'll need a new endpoint for this)
      // For now, we'll process it during full registration
      // This is a preview step - we'll extract during final submission
      setExtractedData({
        full_name: 'Extracted Name', // Will be filled from OCR
        roll_number: 'Extracted USN', // Will be filled from OCR
        branch: 'Extracted Branch', // Will be filled from OCR
      });
      
      // Move to step 2
      setStep(2);
    } catch (error) {
      setError('Failed to process ID card. Please try again.');
      console.error('Extraction error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!idCardFront) {
      setError('Please upload the front side of your ID card');
      setStep(1);
      return;
    }

    if (!formData.full_name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!formData.roll_number.trim()) {
      setError('Please enter your roll number/USN');
      return;
    }

    if (!formData.branch || !formData.branch.trim()) {
      setError('Please select your branch');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (!formData.username || formData.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('id_card_front', idCardFront);
      if (idCardBack) {
        formDataToSend.append('id_card_back', idCardBack);
      }
      formDataToSend.append('username', formData.username);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('full_name', formData.full_name);
      formDataToSend.append('roll_number', formData.roll_number);
      formDataToSend.append('branch', formData.branch);
      formDataToSend.append('year_of_joining', formData.year_of_joining.toString());
      
      const response = await fetch('http://localhost:8000/auth/register-with-id', {
        method: 'POST',
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Registration successful!\n\nName: ${data.full_name}\nStudent ID: ${data.student_id}\nBranch: ${data.branch}\nYear: ${data.year_of_joining}\n\nPlease login to continue.`);
        navigate('/login');
      } else {
        setError(data.detail || 'Registration failed. Please check your information and try again.');
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mb-4">
              <IdentificationIcon className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Student Registration</h2>
            <p className="text-gray-600 mt-2">Register with ID Card</p>
            
            {/* Step Indicator */}
            <div className="flex items-center justify-center mt-6 space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                  {step > 1 ? <CheckCircleIcon className="h-5 w-5" /> : '1'}
                </div>
                <span className="ml-2 text-sm font-medium">Upload ID Card</span>
              </div>
              <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Fill Details</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start">
                <XCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 && (
              <>
                {/* ID Card Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600" />
                    ID Card Upload
                  </h3>
                  
                  {/* Front ID Card */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Card Front <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-primary-500 border-dashed rounded-lg cursor-pointer hover:bg-primary-50 transition-colors">
                        <PhotoIcon className="h-6 w-6 text-primary-600 mr-2" />
                        <span className="text-sm font-medium text-primary-600">
                          {idCardFront ? idCardFront.name : 'Upload Front Side'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e.target.files[0], 'front')}
                          className="hidden"
                          required
                        />
                      </label>
                      {frontPreview && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300">
                          <img src={frontPreview} alt="Front preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Upload a clear image of the front side of your ID card</p>
                  </div>

                  {/* Back ID Card */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Card Back <span className="text-gray-400">(Optional)</span>
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <PhotoIcon className="h-6 w-6 text-gray-600 mr-2" />
                        <span className="text-sm font-medium text-gray-600">
                          {idCardBack ? idCardBack.name : 'Upload Back Side (Optional)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e.target.files[0], 'back')}
                          className="hidden"
                        />
                      </label>
                      {backPreview && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300">
                          <img src={backPreview} alt="Back preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExtractData}
                  disabled={!idCardFront || processing}
                  className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing ID Card...' : 'Continue to Fill Details'}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                {extractedData && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                    <p className="font-semibold mb-2">Information extracted from ID card:</p>
                    <p className="text-sm">Please verify and fill in the details below. The name and roll number must match your ID card.</p>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Must match ID card)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your full name as on ID card"
                  />
                </div>

                {/* Roll Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roll Number / USN <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Must match ID card)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value.toUpperCase() })}
                    required
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                    placeholder="Enter your roll number/USN"
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    required
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Branch</option>
                    <option value="CSE">CSE - Computer Science and Engineering</option>
                    <option value="ISE">ISE - Information Science and Engineering</option>
                    <option value="ECE">ECE - Electronics and Communication Engineering</option>
                    <option value="AIML">AIML - Artificial Intelligence and Machine Learning</option>
                    <option value="AICY">AICY - Artificial Intelligence and Cyber Security</option>
                    <option value="MEC">MEC - Mechanical Engineering</option>
                    <option value="CIV">CIV - Civil Engineering</option>
                  </select>
                </div>

                {/* Year of Joining */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year of Joining <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.year_of_joining}
                    onChange={(e) => setFormData({ ...formData, year_of_joining: parseInt(e.target.value) })}
                    required
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserCircleIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                      minLength={3}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Choose a username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    required
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Registering...' : 'Register'}
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-800 font-semibold">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
