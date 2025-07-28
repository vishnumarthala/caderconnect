import { Meeting, MeetingAttendee, ROLE_HIERARCHY, MEETING_TEMPLATES } from '@/types/meeting';
import { UserRole } from '@/types';
import { DEV_USERS } from './dev-auth';

export const generateMeetingLink = (meetingId: string): string => {
  const baseUrl = 'https://meet.google.com/';
  const roomCode = `sentinel-${meetingId.slice(0, 8)}`;
  return `${baseUrl}${roomCode}`;
};

export const getSubordinateRoles = (userRole: UserRole): UserRole[] => {
  return ROLE_HIERARCHY[userRole] || [];
};

export const getSubordinateUsers = (userRole: UserRole, userRegion?: string) => {
  const subordinateRoles = getSubordinateRoles(userRole);
  return DEV_USERS.filter(user => {
    const isSubordinate = subordinateRoles.includes(user.role);
    const sameRegion = !userRegion || user.region === userRegion || !user.region;
    return isSubordinate && sameRegion;
  });
};

export const createMeetingAttendees = (
  selectedUsers: string[],
  schedulerRole: UserRole,
  schedulerRegion?: string
): MeetingAttendee[] => {
  const availableUsers = getSubordinateUsers(schedulerRole, schedulerRegion);
  
  return selectedUsers
    .map(userId => {
      const user = availableUsers.find(u => u.id === userId);
      if (!user) return null;
      
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: 'invited' as const
      };
    })
    .filter((attendee): attendee is MeetingAttendee => attendee !== null);
};

// Mock meetings data
export const generateMockMeetings = (): Meeting[] => {
  const meetings: Meeting[] = [];
  const today = new Date();
  
  // Past meetings
  meetings.push({
    id: 'meeting-1',
    title: 'Monthly Performance Review - North Region',
    description: 'Review of northern region performance metrics and goal setting',
    scheduledBy: 'north.lead@party.com',
    scheduledByRole: 'RegionalLead',
    startTime: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endTime: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 90 min duration
    meetingLink: generateMeetingLink('meeting-1'),
    attendees: [
      {
        userId: '55555555-5555-5555-5555-555555555555',
        name: 'Raj Kumar Singh',
        email: 'mp.delhi@party.com',
        role: 'Member',
        status: 'attended'
      },
      {
        userId: '88888888-8888-8888-8888-888888888888',
        name: 'Amit Patel',
        email: 'worker1@party.com',
        role: 'Karyakartha',
        status: 'attended'
      }
    ],
    status: 'completed',
    type: 'regional',
    isRecurring: true,
    recurringPattern: {
      frequency: 'monthly',
      interval: 1
    },
    agenda: MEETING_TEMPLATES.find(t => t.id === 'monthly-review')?.agenda,
    createdAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  });

  // Upcoming meetings
  meetings.push({
    id: 'meeting-2',
    title: 'Strategic Planning Session',
    description: 'Quarterly strategic planning and resource allocation discussion',
    scheduledBy: 'leader@party.com',
    scheduledByRole: 'PartyHead',
    startTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    endTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000), // 120 min duration
    meetingLink: generateMeetingLink('meeting-2'),
    attendees: [
      {
        userId: '33333333-3333-3333-3333-333333333333',
        name: 'Northern Region Lead',
        email: 'north.lead@party.com',
        role: 'RegionalLead',
        status: 'accepted'
      },
      {
        userId: '44444444-4444-4444-4444-444444444444',
        name: 'Southern Region Lead',
        email: 'south.lead@party.com',
        role: 'RegionalLead',
        status: 'accepted'
      }
    ],
    status: 'scheduled',
    type: 'team',
    isRecurring: false,
    agenda: MEETING_TEMPLATES.find(t => t.id === 'strategy-planning')?.agenda,
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
  });

  meetings.push({
    id: 'meeting-3',
    title: 'Team Standup - Development',
    description: 'Daily standup for development team coordination',
    scheduledBy: 'mp.delhi@party.com',
    scheduledByRole: 'Member',
    startTime: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    endTime: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000), // 15 min duration
    meetingLink: generateMeetingLink('meeting-3'),
    attendees: [
      {
        userId: '88888888-8888-8888-8888-888888888888',
        name: 'Amit Patel',
        email: 'worker1@party.com',
        role: 'Karyakartha',
        status: 'accepted'
      },
      {
        userId: '99999999-9999-9999-9999-999999999999',
        name: 'Sunita Devi',
        email: 'worker2@party.com',
        role: 'Karyakartha',
        status: 'invited'
      }
    ],
    status: 'scheduled',
    type: 'team',
    isRecurring: true,
    recurringPattern: {
      frequency: 'daily',
      interval: 1,
      occurrences: 30
    },
    agenda: MEETING_TEMPLATES.find(t => t.id === 'team-standup')?.agenda,
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
  });

  return meetings;
};

export const getAttendanceStats = (meetings: Meeting[]) => {
  const completed = meetings.filter(m => m.status === 'completed');
  const totalInvited = completed.reduce((sum, meeting) => sum + meeting.attendees.length, 0);
  const totalAttended = completed.reduce((sum, meeting) => 
    sum + meeting.attendees.filter(a => a.status === 'attended').length, 0);
  
  return {
    totalMeetings: completed.length,
    totalInvited,
    totalAttended,
    attendanceRate: totalInvited > 0 ? Math.round((totalAttended / totalInvited) * 100) : 0
  };
};

export const getMeetingsByUser = (meetings: Meeting[], userId: string) => {
  return meetings.filter(meeting =>
    meeting.scheduledBy === userId || 
    meeting.attendees.some(attendee => attendee.userId === userId)
  );
};

export const getUpcomingMeetings = (meetings: Meeting[], limit = 5) => {
  const now = new Date();
  return meetings
    .filter(meeting => meeting.startTime > now && meeting.status === 'scheduled')
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, limit);
};