import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAttendanceCalendar, getClasses } from '../services/api';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const AttendanceCalendar = () => {
  const { user } = useAuth();
  const [calendarData, setCalendarData] = useState({});
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [calendarResponse, classesResponse] = await Promise.all([
        getAttendanceCalendar(selectedClass ? parseInt(selectedClass) : null),
        getClasses(),
      ]);
      setCalendarData(calendarResponse.data.calendar || {});
      setClasses(classesResponse.data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (user.role === 'student') {
      fetchData();
    }
  }, [fetchData, user.role]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getDateKey = (date) => {
    if (!date) return null;
    return date.toISOString().split('T')[0];
  };

  const getAttendanceStatus = (date) => {
    const dateKey = getDateKey(date);
    if (!dateKey || !calendarData[dateKey]) return null;
    return calendarData[dateKey].status;
  };

  const getAttendanceInfo = (date) => {
    const dateKey = getDateKey(date);
    if (!dateKey || !calendarData[dateKey]) return null;
    return calendarData[dateKey];
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  if (user.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Access denied. Student access required.</p>
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

  const days = getDaysInMonth(currentDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-800">Attendance Calendar</h2>
            </div>
            
            <div className="flex items-center space-x-2">
              {classes.length > 0 && (
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={fetchData}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh calendar"
              >
                <ArrowPathIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Calendar Navigation - Compact */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={previousMonth}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h3 className="text-xl font-bold text-gray-800">{formatMonthYear(currentDate)}</h3>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Legend - Compact */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-xs text-gray-700">Present</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-xs text-gray-700">Absent</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded bg-gray-200 border border-gray-400"></div>
              <span className="text-xs text-gray-700">No Record</span>
            </div>
          </div>

          {/* Calendar Grid - Compact */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers - Compact */}
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-gray-700 py-1 text-xs"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days - Compact */}
            {days.map((date, index) => {
              const status = getAttendanceStatus(date);
              const info = getAttendanceInfo(date);
              const today = isToday(date);
              
              let bgColor = 'bg-gray-100';
              let borderColor = 'border-gray-300';
              let textColor = 'text-gray-600';
              
              if (date && status) {
                if (status === 'present') {
                  bgColor = 'bg-green-500';
                  textColor = 'text-white';
                  borderColor = 'border-green-600';
                } else if (status === 'absent') {
                  bgColor = 'bg-red-500';
                  textColor = 'text-white';
                  borderColor = 'border-red-600';
                }
              }
              
              if (today) {
                borderColor = 'border-blue-500 border-2';
              }

              return (
                <div
                  key={index}
                  className={`
                    aspect-square p-1 rounded border ${borderColor} ${bgColor} ${textColor}
                    flex flex-col items-center justify-center cursor-pointer
                    hover:shadow-sm transition-all duration-200
                    ${!date ? 'invisible' : ''}
                    ${today ? 'ring-1 ring-blue-300' : ''}
                  `}
                  title={
                    date && info
                      ? `${date.toLocaleDateString()}: ${info.status}${info.classes && info.classes.length > 0 ? `\nClasses: ${info.classes.map(c => c.class_name || 'Unknown').join(', ')}` : ''}`
                      : date
                      ? date.toLocaleDateString()
                      : ''
                  }
                >
                  {date && (
                    <>
                      <span className={`text-xs font-semibold ${textColor}`}>
                        {date.getDate()}
                      </span>
                      {status && (
                        <span className="text-[10px] leading-none">
                          {status === 'present' ? '✓' : '✗'}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary - Compact */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> Only days where attendance was marked are shown with colors. 
              Days without attendance records appear in gray.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;

