import { UserRole } from './index';

export interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledBy: string;
  scheduledByRole: UserRole;
  startTime: Date;
  endTime: Date;
  meetingLink: string;
  attendees: MeetingAttendee[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  type: 'one_on_one' | 'team' | 'regional' | 'all_hands' | 'review';
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  agenda?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingAttendee {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'invited' | 'accepted' | 'declined' | 'maybe' | 'attended' | 'absent';
  joinedAt?: Date;
  leftAt?: Date;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  interval: number; // every X days/weeks/months
  endDate?: Date;
  occurrences?: number;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  defaultAttendees: UserRole[];
  agenda: string[];
  isActive: boolean;
}

export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  SuperAdmin: ['PartyHead', 'RegionalLead', 'Member', 'Karyakartha'],
  PartyHead: ['RegionalLead', 'Member', 'Karyakartha'],
  RegionalLead: ['Member', 'Karyakartha'],
  Member: ['Karyakartha'],
  Karyakartha: []
};

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: 'monthly-review',
    name: 'Monthly Performance Review',
    description: 'Regular monthly review of performance metrics and goals',
    duration: 90,
    defaultAttendees: ['RegionalLead', 'Member'],
    agenda: [
      'Review previous month performance',
      'Discuss current challenges',
      'Set goals for next month',
      'Action items and follow-ups'
    ],
    isActive: true
  },
  {
    id: 'strategy-planning',
    name: 'Strategic Planning Session',
    description: 'High-level strategy discussion and planning',
    duration: 120,
    defaultAttendees: ['PartyHead', 'RegionalLead'],
    agenda: [
      'Market analysis review',
      'Strategic initiatives discussion',
      'Resource allocation',
      'Timeline and milestones'
    ],
    isActive: true
  },
  {
    id: 'team-standup',
    name: 'Team Standup',
    description: 'Quick daily standup for team coordination',
    duration: 15,
    defaultAttendees: ['Member', 'Karyakartha'],
    agenda: [
      'What did you work on yesterday?',
      'What will you work on today?',
      'Any blockers or issues?'
    ],
    isActive: true
  },
  {
    id: 'quarterly-review',
    name: 'Quarterly Business Review',
    description: 'Comprehensive quarterly review of all operations',
    duration: 180,
    defaultAttendees: ['SuperAdmin', 'PartyHead', 'RegionalLead'],
    agenda: [
      'Quarterly performance overview',
      'Regional performance analysis',
      'Strategic initiatives review',
      'Budget and resource planning',
      'Next quarter planning'
    ],
    isActive: true
  }
];