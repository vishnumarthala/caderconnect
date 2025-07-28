/**
 * Dashboard API endpoint
 * Provides mock data for development
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const timeRange = searchParams.get('timeRange') || '7d';

  // Mock dashboard data based on role
  const mockData = {
    SuperAdmin: {
      metrics: [
        { label: 'Total Users', value: '2,847', change: '+12%', trend: 'up' },
        { label: 'System Health', value: '99.9%', change: '+0.1%', trend: 'up' },
        { label: 'Security Alerts', value: '3', change: '-25%', trend: 'down' },
        { label: 'Active Sessions', value: '156', change: '+8%', trend: 'up' }
      ],
      charts: {
        userActivity: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          data: [120, 150, 180, 200, 170, 90, 110]
        },
        systemPerformance: {
          cpu: 45,
          memory: 62,
          storage: 78
        }
      }
    },
    PartyHead: {
      metrics: [
        { label: 'National Support', value: '72%', change: '+3%', trend: 'up' },
        { label: 'Media Mentions', value: '1,247', change: '+15%', trend: 'up' },
        { label: 'Regional Performance', value: '8.2/10', change: '+0.5', trend: 'up' },
        { label: 'Member Activity', value: '89%', change: '+2%', trend: 'up' }
      ],
      charts: {
        supportTrend: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          data: [68, 70, 69, 71, 73, 72]
        },
        regionalBreakdown: {
          North: 75,
          South: 68,
          East: 74,
          West: 71
        }
      }
    },
    RegionalLead: {
      metrics: [
        { label: 'Regional Support', value: '75%', change: '+2%', trend: 'up' },
        { label: 'Member Count', value: '234', change: '+5', trend: 'up' },
        { label: 'Active Projects', value: '18', change: '+3', trend: 'up' },
        { label: 'Completion Rate', value: '84%', change: '+7%', trend: 'up' }
      ],
      charts: {
        memberPerformance: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          data: [80, 85, 82, 88]
        }
      }
    },
    Member: {
      metrics: [
        { label: 'Constituency Support', value: '68%', change: '+1%', trend: 'up' },
        { label: 'Public Interactions', value: '342', change: '+23', trend: 'up' },
        { label: 'Media Coverage', value: '12', change: '+4', trend: 'up' },
        { label: 'Project Progress', value: '76%', change: '+12%', trend: 'up' }
      ],
      charts: {
        supportTrend: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          data: [65, 67, 66, 68]
        }
      }
    },
    Karyakartha: {
      metrics: [
        { label: 'Tasks Completed', value: '28', change: '+5', trend: 'up' },
        { label: 'Local Support', value: '82%', change: '+3%', trend: 'up' },
        { label: 'Data Collected', value: '156', change: '+12', trend: 'up' },
        { label: 'Community Events', value: '8', change: '+2', trend: 'up' }
      ],
      charts: {
        taskProgress: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          data: [5, 7, 6, 8, 4]
        }
      }
    }
  };

  const data = mockData[role as keyof typeof mockData] || mockData.Member;

  return NextResponse.json({
    success: true,
    data: {
      role,
      timeRange,
      ...data,
      lastUpdated: new Date().toISOString()
    }
  });
}