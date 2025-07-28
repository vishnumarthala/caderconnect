'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Users, 
  Video, 
  Plus,
  Send,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { MEETING_TEMPLATES } from '@/types/meeting';
import { getSubordinateUsers, generateMeetingLink, createMeetingAttendees } from '@/lib/meeting-utils';

export default function SchedulePage() {
  const { user } = useAuthStore();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('weekly');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledSuccess, setScheduledSuccess] = useState(false);

  if (!user) return null;

  const subordinateUsers = getSubordinateUsers(user.role, user.region);
  const availableTemplates = MEETING_TEMPLATES.filter(template => 
    template.defaultAttendees.some(role => 
      subordinateUsers.some(subUser => subUser.role === role)
    )
  );

  const handleTemplateSelect = (templateId: string) => {
    const template = MEETING_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setMeetingTitle(template.name);
      setMeetingDescription(template.description);
      setDuration(template.duration);
      
      // Auto-select attendees based on template
      const autoSelectedUsers = subordinateUsers
        .filter(subUser => template.defaultAttendees.includes(subUser.role))
        .map(subUser => subUser.id);
      setSelectedAttendees(autoSelectedUsers);
    }
    setSelectedTemplate(templateId);
  };

  const handleAttendeeToggle = (userId: string) => {
    setSelectedAttendees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const generateLink = () => {
    const meetingId = `meeting-${Date.now()}`;
    const link = generateMeetingLink(meetingId);
    setGeneratedLink(link);
  };

  const handleScheduleMeeting = async () => {
    setIsScheduling(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate meeting link if not already generated
    if (!generatedLink) {
      generateLink();
    }
    
    setScheduledSuccess(true);
    setIsScheduling(false);
    
    // Reset form after success
    setTimeout(() => {
      setScheduledSuccess(false);
      resetForm();
    }, 3000);
  };

  const resetForm = () => {
    setMeetingTitle('');
    setMeetingDescription('');
    setStartDate('');
    setStartTime('');
    setDuration(60);
    setSelectedAttendees([]);
    setIsRecurring(false);
    setSelectedTemplate('');
    setGeneratedLink('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getDefaultAllowedLevel = () => {
    switch (user.role) {
      case 'SuperAdmin': return 'All levels below';
      case 'PartyHead': return 'Regional leads and below';
      case 'RegionalLead': return 'Members and Karyakarthas';
      case 'Member': return 'Karyakarthas only';
      default: return 'No subordinates';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Meeting</h1>
            <p className="text-gray-600 mt-1">
              Create and schedule meetings with your team members
            </p>
          </div>
          <div className="mt-4 sm:mt-0 text-sm text-gray-500">
            Default invitation scope: {getDefaultAllowedLevel()}
          </div>
        </div>

        {scheduledSuccess && (
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">Meeting scheduled successfully!</h3>
                <p className="text-green-700">Invitations have been sent to all attendees.</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meeting Form */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Meeting Details</h2>
            
            {/* Template Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Use Template (Optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a template...</option>
                {availableTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Title *
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter meeting title"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={meetingDescription}
                onChange={(e) => setMeetingDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Meeting description and agenda"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>

            {/* Recurring */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Recurring meeting</span>
              </label>
              
              {isRecurring && (
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              )}
            </div>

            {/* Meeting Link */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Click 'Generate Link' to create meeting link"
                />
                <Button variant="outline" onClick={generateLink} disabled={isScheduling}>
                  Generate Link
                </Button>
                {generatedLink && (
                  <Button variant="outline" onClick={() => copyToClipboard(generatedLink)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleScheduleMeeting} 
                disabled={!meetingTitle || !startDate || !startTime || selectedAttendees.length === 0 || isScheduling}
                className="flex-1"
              >
                {isScheduling ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </Card>

          {/* Attendees Selection */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Attendees ({selectedAttendees.length})
            </h2>
            
            <div className="space-y-3">
              {subordinateUsers.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No subordinate users available for your role level.
                </p>
              ) : (
                subordinateUsers.map(subUser => (
                  <div key={subUser.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedAttendees.includes(subUser.id)}
                      onChange={() => handleAttendeeToggle(subUser.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{subUser.name}</div>
                      <div className="text-sm text-gray-500">{subUser.email}</div>
                      <div className="text-xs text-blue-600">{subUser.role}</div>
                      {subUser.region && (
                        <div className="text-xs text-gray-400">{subUser.region} Region</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedAttendees.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Meeting invitations will be sent to:
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  {selectedAttendees.map(userId => {
                    const user = subordinateUsers.find(u => u.id === userId);
                    return user ? (
                      <li key={userId}>• {user.name} ({user.role})</li>
                    ) : null;
                  })}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}