import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DashboardWidget, MetricCard, ChartData, UserRole } from '@/types';
import { DASHBOARD_WIDGETS } from '@/constants';

interface DashboardStore {
  // State
  widgets: DashboardWidget[];
  metrics: MetricCard[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  selectedTimeRange: '24h' | '7d' | '30d' | '90d' | '1y';
  
  // Actions
  loadDashboard: (userRole: UserRole) => Promise<void>;
  updateWidget: (widgetId: string, data: any) => void;
  reorderWidgets: (widgets: DashboardWidget[]) => void;
  toggleWidget: (widgetId: string, visible: boolean) => void;
  setTimeRange: (range: DashboardStore['selectedTimeRange']) => void;
  refreshDashboard: () => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      widgets: [],
      metrics: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
      selectedTimeRange: '7d',

      // Actions
      loadDashboard: async (userRole: UserRole) => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem('token');
          const { selectedTimeRange } = get();
          
          // Get role-specific widget configurations
          const roleWidgets = DASHBOARD_WIDGETS[userRole] || [];
          
          // Fetch dashboard data from API
          const response = await fetch(`/api/dashboard?role=${userRole}&timeRange=${selectedTimeRange}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load dashboard data');
          }

          const dashboardData = await response.json();

          // Map API data to widgets with default positions
          const widgets: DashboardWidget[] = roleWidgets.map((widgetType, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            
            return {
              id: widgetType,
              title: getWidgetTitle(widgetType),
              type: getWidgetType(widgetType),
              data: dashboardData.widgets?.[widgetType] || getDefaultWidgetData(widgetType),
              position: { x: col * 4, y: row * 3, w: 4, h: 3 },
              roleAccess: [userRole]
            };
          });

          // Extract metrics from dashboard data
          const metrics: MetricCard[] = dashboardData.metrics || getDefaultMetrics(userRole);

          set({
            widgets,
            metrics,
            isLoading: false,
            lastUpdated: new Date(),
            error: null
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load dashboard'
          });
        }
      },

      updateWidget: (widgetId: string, data: any) => {
        set(state => ({
          widgets: state.widgets.map(widget =>
            widget.id === widgetId
              ? { ...widget, data, lastUpdated: new Date() }
              : widget
          )
        }));
      },

      reorderWidgets: (newWidgets: DashboardWidget[]) => {
        set({ widgets: newWidgets });
        
        // Persist layout to localStorage
        localStorage.setItem('dashboard-layout', JSON.stringify(
          newWidgets.map(w => ({ id: w.id, position: w.position }))
        ));
      },

      toggleWidget: (widgetId: string, visible: boolean) => {
        set(state => ({
          widgets: state.widgets.map(widget =>
            widget.id === widgetId
              ? { ...widget, visible }
              : widget
          )
        }));
      },

      setTimeRange: (range: DashboardStore['selectedTimeRange']) => {
        set({ selectedTimeRange: range });
        
        // Reload dashboard with new time range
        const userRole = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user?.role;
        if (userRole) {
          get().loadDashboard(userRole);
        }
      },

      refreshDashboard: async () => {
        const userRole = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user?.role;
        if (userRole) {
          await get().loadDashboard(userRole);
        }
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    { name: 'dashboard-store' }
  )
);

// Helper functions
function getWidgetTitle(widgetType: string): string {
  const titles: Record<string, string> = {
    'user-overview': 'User Overview',
    'system-health': 'System Health',
    'activity-logs': 'Recent Activity',
    'security-alerts': 'Security Alerts',
    'performance-metrics': 'Performance',
    'regional-summary': 'Regional Summary',
    'national-overview': 'National Overview',
    'regional-performance': 'Regional Performance',
    'public-sentiment': 'Public Sentiment',
    'media-mentions': 'Media Mentions',
    'key-metrics': 'Key Metrics',
    'upcoming-events': 'Upcoming Events',
    'member-performance': 'Member Performance',
    'local-sentiment': 'Local Sentiment',
    'constituency-data': 'Constituency Data',
    'team-activities': 'Team Activities',
    'regional-alerts': 'Regional Alerts',
    'personal-performance': 'Personal Performance',
    'constituency-overview': 'Constituency Overview',
    'public-feedback': 'Public Feedback',
    'upcoming-schedules': 'Upcoming Schedules',
    'recent-activities': 'Recent Activities',
    'ai-insights': 'AI Insights',
    'local-tasks': 'Local Tasks',
    'data-collection': 'Data Collection',
    'field-reports': 'Field Reports',
    'community-feedback': 'Community Feedback',
    'task-progress': 'Task Progress',
    'local-alerts': 'Local Alerts'
  };
  
  return titles[widgetType] || 'Dashboard Widget';
}

function getWidgetType(widgetType: string): 'chart' | 'metric' | 'list' | 'map' {
  const types: Record<string, 'chart' | 'metric' | 'list' | 'map'> = {
    'user-overview': 'metric',
    'system-health': 'chart',
    'activity-logs': 'list',
    'security-alerts': 'list',
    'performance-metrics': 'chart',
    'regional-summary': 'chart',
    'national-overview': 'chart',
    'regional-performance': 'chart',
    'public-sentiment': 'chart',
    'media-mentions': 'list',
    'key-metrics': 'metric',
    'upcoming-events': 'list',
    'member-performance': 'chart',
    'local-sentiment': 'chart',
    'constituency-data': 'map',
    'team-activities': 'list',
    'regional-alerts': 'list',
    'personal-performance': 'chart',
    'constituency-overview': 'metric',
    'public-feedback': 'list',
    'upcoming-schedules': 'list',
    'recent-activities': 'list',
    'ai-insights': 'list',
    'local-tasks': 'list',
    'data-collection': 'metric',
    'field-reports': 'list',
    'community-feedback': 'list',
    'task-progress': 'chart',
    'local-alerts': 'list'
  };
  
  return types[widgetType] || 'chart';
}

function getDefaultWidgetData(widgetType: string): any {
  // Return mock data based on widget type
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Sample Data',
      data: [12, 19, 3, 5, 2, 3],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  };

  const listData = [
    { id: '1', title: 'Sample Item 1', description: 'Sample description', timestamp: new Date() },
    { id: '2', title: 'Sample Item 2', description: 'Sample description', timestamp: new Date() },
    { id: '3', title: 'Sample Item 3', description: 'Sample description', timestamp: new Date() }
  ];

  const metricData = {
    value: '1,234',
    change: { value: 12, type: 'increase', period: 'vs last month' }
  };

  const type = getWidgetType(widgetType);
  
  switch (type) {
    case 'chart':
      return chartData;
    case 'list':
      return listData;
    case 'metric':
      return metricData;
    case 'map':
      return { regions: [], markers: [] };
    default:
      return {};
  }
}

function getDefaultMetrics(userRole: UserRole): MetricCard[] {
  const baseMetrics: MetricCard[] = [
    {
      id: 'total-users',
      title: 'Total Users',
      value: '2,543',
      change: { value: 12, type: 'increase', period: 'vs last month' },
      icon: 'Users',
      color: 'blue'
    },
    {
      id: 'active-sessions',
      title: 'Active Sessions',
      value: '1,234',
      change: { value: 8, type: 'increase', period: 'vs yesterday' },
      icon: 'Activity',
      color: 'green'
    },
    {
      id: 'alerts',
      title: 'Active Alerts',
      value: '23',
      change: { value: 5, type: 'decrease', period: 'vs last week' },
      icon: 'AlertTriangle',
      color: 'yellow'
    },
    {
      id: 'performance',
      title: 'Performance Score',
      value: '98%',
      change: { value: 2, type: 'increase', period: 'vs last month' },
      icon: 'TrendingUp',
      color: 'purple'
    }
  ];

  return baseMetrics;
}