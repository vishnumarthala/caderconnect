import { UserRole, NavigationItem, AlertSeverity } from '@/types';

// Role Permissions
export const ROLE_PERMISSIONS = {
  SuperAdmin: [
    'user.create',
    'user.read',
    'user.update',
    'user.delete',
    'admin.access',
    'dashboard.all',
    'alerts.manage',
    'chat.access',
    'upload.all',
    'audit.view'
  ],
  PartyHead: [
    'user.read',
    'dashboard.national',
    'alerts.view',
    'chat.access',
    'upload.documents',
    'reports.national'
  ],
  RegionalLead: [
    'user.read',
    'user.update.regional',
    'dashboard.regional',
    'alerts.view',
    'chat.access',
    'upload.documents',
    'reports.regional'
  ],
  Member: [
    'dashboard.personal',
    'alerts.view',
    'chat.access',
    'upload.documents',
    'profile.update'
  ],
  Karyakartha: [
    'dashboard.local',
    'alerts.view',
    'chat.access',
    'upload.data',
    'tasks.manage'
  ]
} as const;

// Navigation Configuration
export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'BarChart3',
    roleAccess: ['SuperAdmin', 'PartyHead', 'RegionalLead', 'Member', 'Karyakartha']
  },
  {
    id: 'chat',
    label: 'AI Assistant',
    href: '/chat',
    icon: 'MessageSquare',
    roleAccess: ['SuperAdmin', 'PartyHead', 'RegionalLead', 'Member', 'Karyakartha']
  },
  {
    id: 'alerts',
    label: 'Alerts',
    href: '/alerts',
    icon: 'Bell',
    roleAccess: ['SuperAdmin', 'PartyHead', 'RegionalLead', 'Member', 'Karyakartha']
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: 'FileText',
    roleAccess: ['SuperAdmin', 'PartyHead', 'RegionalLead']
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: 'TrendingUp',
    roleAccess: ['SuperAdmin', 'PartyHead', 'RegionalLead']
  },
  {
    id: 'schedule',
    label: 'Schedule Meeting',
    href: '/schedule',
    icon: 'Calendar',
    roleAccess: ['SuperAdmin', 'PartyHead', 'RegionalLead', 'Member']
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    icon: 'CalendarDays',
    roleAccess: ['SuperAdmin', 'PartyHead', 'RegionalLead', 'Member', 'Karyakartha']
  },
  {
    id: 'performance',
    label: 'Performance Review',
    href: '/performance',
    icon: 'Target',
    roleAccess: ['SuperAdmin', 'PartyHead', 'RegionalLead']
  },
  {
    id: 'users',
    label: 'User Management',
    href: '/admin/users',
    icon: 'Users',
    roleAccess: ['SuperAdmin']
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: 'Settings',
    roleAccess: ['SuperAdmin', 'PartyHead', 'RegionalLead', 'Member', 'Karyakartha']
  }
];

// Role-based Dashboard Widgets
export const DASHBOARD_WIDGETS = {
  SuperAdmin: [
    'user-overview',
    'system-health',
    'activity-logs',
    'security-alerts',
    'performance-metrics',
    'regional-summary'
  ],
  PartyHead: [
    'national-overview',
    'regional-performance',
    'public-sentiment',
    'media-mentions',
    'key-metrics',
    'upcoming-events'
  ],
  RegionalLead: [
    'regional-overview',
    'member-performance',
    'local-sentiment',
    'constituency-data',
    'team-activities',
    'regional-alerts'
  ],
  Member: [
    'personal-performance',
    'constituency-overview',
    'public-feedback',
    'upcoming-schedules',
    'recent-activities',
    'ai-insights'
  ],
  Karyakartha: [
    'local-tasks',
    'data-collection',
    'field-reports',
    'community-feedback',
    'task-progress',
    'local-alerts'
  ]
} as const;

// Alert Severity Colors
export const ALERT_SEVERITY_CONFIG = {
  low: {
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    icon: 'Info'
  },
  medium: {
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    icon: 'AlertTriangle'
  },
  high: {
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    icon: 'AlertCircle'
  },
  critical: {
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    icon: 'AlertOctagon'
  }
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: {
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    videos: ['.mp4', '.avi', '.mov', '.wmv'],
    data: ['.csv', '.json', '.xml']
  },
  rolePermissions: {
    SuperAdmin: ['documents', 'images', 'videos', 'data'],
    PartyHead: ['documents', 'images', 'data'],
    RegionalLead: ['documents', 'images', 'data'],
    Member: ['documents', 'images'],
    Karyakartha: ['documents', 'data']
  }
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    profile: '/api/auth/profile'
  },
  users: {
    list: '/api/users',
    create: '/api/users',
    update: (id: string) => `/api/users/${id}`,
    delete: (id: string) => `/api/users/${id}`
  },
  chat: {
    sessions: '/api/chat/sessions',
    messages: (sessionId: string) => `/api/chat/sessions/${sessionId}/messages`,
    stream: '/api/chat/stream'
  },
  alerts: {
    list: '/api/alerts',
    create: '/api/alerts',
    update: (id: string) => `/api/alerts/${id}`,
    dismiss: (id: string) => `/api/alerts/${id}/dismiss`
  },
  upload: {
    file: '/api/upload',
    progress: (id: string) => `/api/upload/${id}/progress`
  }
} as const;

// Default Values
export const DEFAULT_VALUES = {
  pagination: {
    page: 1,
    limit: 10
  },
  chat: {
    maxMessages: 100,
    sessionTimeout: 30 * 60 * 1000 // 30 minutes
  },
  alerts: {
    autoRefreshInterval: 30000, // 30 seconds
    maxUnreadCount: 99
  }
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  },
  name: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/
  }
} as const;

// Chart Colors
export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  tertiary: '#F59E0B',
  quaternary: '#EF4444',
  quintet: '#8B5CF6',
  palette: [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ]
} as const;

// Theme Configuration
export const THEME_CONFIG = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a'
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    }
  }
} as const;