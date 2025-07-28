'use client';

import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Users,
  Video,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { generateMockMeetings, getMeetingsByUser } from '@/lib/meeting-utils';
import { Meeting } from '@/types/meeting';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarPage() {
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const allMeetings = generateMockMeetings();
  const userMeetings = user ? getMeetingsByUser(allMeetings, user.email) : [];

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = new Date();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      days.push(new Date(date));
    }
    
    return days;
  }, [currentMonth, currentYear]);

  // Get meetings for a specific date
  const getMeetingsForDate = (date: Date) => {
    return userMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth;
  };

  const getStatusIcon = (meeting: Meeting) => {
    switch (meeting.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (meeting: Meeting) => {
    switch (meeting.status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'cancelled': return 'bg-red-100 border-red-300 text-red-800';
      case 'in_progress': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const selectedDateMeetings = selectedDate ? getMeetingsForDate(selectedDate) : [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600 mt-1">
              View and manage your scheduled meetings
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Button variant="outline" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" onClick={() => setViewMode('month')} 
                    className={viewMode === 'month' ? 'bg-blue-50' : ''}>
              Month
            </Button>
            <Button variant="outline" onClick={() => setViewMode('week')}
                    className={viewMode === 'week' ? 'bg-blue-50' : ''}>
              Week
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {MONTHS[currentMonth]} {currentYear}
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {DAYS.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {calendarDays.map((date, index) => {
                  const dayMeetings = getMeetingsForDate(date);
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[80px] p-1 border border-gray-200 cursor-pointer hover:bg-gray-50
                        ${isCurrentMonth(date) ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                        ${isToday(date) ? 'bg-blue-50 border-blue-300' : ''}
                        ${isSelected ? 'ring-2 ring-blue-500' : ''}
                      `}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className={`text-sm ${isToday(date) ? 'font-bold text-blue-600' : ''}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1 mt-1">
                        {dayMeetings.slice(0, 2).map(meeting => (
                          <div
                            key={meeting.id}
                            className={`text-xs p-1 rounded border text-center truncate ${getStatusColor(meeting)}`}
                          >
                            {meeting.title}
                          </div>
                        ))}
                        {dayMeetings.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayMeetings.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Meeting Details Sidebar */}
          <div className="space-y-4">
            {/* Selected Date Info */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                {selectedDate ? selectedDate.toLocaleDateString() : 'Select a date'}
              </h3>
              {selectedDate && (
                <p className="text-sm text-gray-600">
                  {selectedDateMeetings.length} meeting{selectedDateMeetings.length !== 1 ? 's' : ''} scheduled
                </p>
              )}
            </Card>

            {/* Meeting List for Selected Date */}
            {selectedDate && selectedDateMeetings.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Meetings</h3>
                <div className="space-y-3">
                  {selectedDateMeetings.map(meeting => (
                    <div key={meeting.id} className="border-l-4 border-blue-500 pl-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{meeting.title}</h4>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3" />
                            {meeting.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="w-3 h-3" />
                            {meeting.attendees.length} attendees
                          </div>
                          {meeting.meetingLink && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                              <Video className="w-3 h-3" />
                              <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" 
                                 className="hover:underline">
                                Join meeting
                              </a>
                            </div>
                          )}
                        </div>
                        {getStatusIcon(meeting)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">This Month</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Meetings:</span>
                  <span className="font-medium">{userMeetings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">
                    {userMeetings.filter(m => m.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Upcoming:</span>
                  <span className="font-medium text-blue-600">
                    {userMeetings.filter(m => m.status === 'scheduled').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Attendance Rate:</span>
                  <span className="font-medium text-purple-600">85%</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}