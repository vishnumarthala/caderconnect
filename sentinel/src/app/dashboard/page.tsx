'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Filter, Download, Calendar } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useAlertStore } from '@/stores/alert-store';
import MainLayout from '@/components/layout/main-layout';
import MetricCard from '@/components/dashboard/widgets/metric-card';
import ChartWidget from '@/components/dashboard/widgets/chart-widget';
import RecentActivity from '@/components/dashboard/widgets/recent-activity';
import Button from '@/components/ui/button';
import Card, { CardHeader, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { 
    widgets, 
    metrics, 
    isLoading, 
    error, 
    lastUpdated, 
    selectedTimeRange, 
    loadDashboard, 
    setTimeRange, 
    refreshDashboard 
  } = useDashboardStore();
  const { alerts } = useAlertStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboard(user.role);
    }
  }, [user, loadDashboard]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDashboard();
    setIsRefreshing(false);
  };

  const handleTimeRangeChange = (range: typeof selectedTimeRange) => {
    setTimeRange(range);
  };

  // Mock activity data (in real app, this would come from API)
  const recentActivities = [
    {
      id: '1',
      type: 'user' as const,
      title: 'New user registered',
      description: 'John Doe has joined as Regional Lead for Maharashtra',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      user: 'System Admin'
    },
    {
      id: '2',
      type: 'alert' as const,
      title: 'High priority alert',
      description: 'Unusual activity detected in Mumbai region',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      user: 'Alert System',
      metadata: { priority: 'high' }
    },
    {
      id: '3',
      type: 'message' as const,
      title: 'AI Chat Session',
      description: 'New chat session started for constituency analysis',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
      user: user?.name
    },
    {
      id: '4',
      type: 'document' as const,
      title: 'Report generated',
      description: 'Monthly performance report has been generated',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
      user: 'Report System'
    }
  ];

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user.name}. Here's what's happening today.
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {formatDate(lastUpdated)}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            {/* Time Range Selector */}
            <select
              value={selectedTimeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value as typeof selectedTimeRange)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent padding="md">
              <div className="flex items-center">
                <div className="text-red-800">
                  <p className="font-medium">Error loading dashboard</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {widgets
            .filter(widget => widget.type === 'chart')
            .map((widget) => (
              <ChartWidget
                key={widget.id}
                title={widget.title}
                type="line"
                data={widget.data}
                isLoading={isLoading}
              />
            ))}
        </div>

        {/* Activity and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity
            activities={recentActivities}
            isLoading={isLoading}
            maxItems={8}
          />

          {/* Recent Alerts */}
          <Card>
            <CardHeader title="Recent Alerts" subtitle={`${alerts.length} active alerts`} />
            <CardContent padding="md">
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${
                        alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                        alert.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                        alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {alert.title}
                        </p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                  ))}
                  
                  <div className="pt-3 border-t border-gray-200">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Alerts
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No active alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Role-specific widgets would be rendered here based on user.role */}
        {user.role === 'SuperAdmin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader title="System Health" />
              <CardContent padding="md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Server Status</span>
                    <span className="text-sm font-medium text-green-600">Healthy</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database</span>
                    <span className="text-sm font-medium text-green-600">Connected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Response</span>
                    <span className="text-sm font-medium text-green-600">120ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="User Distribution" />
              <CardContent padding="md">
                <ChartWidget
                  title=""
                  type="doughnut"
                  data={{
                    labels: ['SuperAdmin', 'PartyHead', 'RegionalLead', 'Member', 'Karyakartha'],
                    datasets: [{
                      data: [2, 5, 15, 450, 1200],
                      label: 'Users'
                    }]
                  }}
                  height={200}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Security Overview" />
              <CardContent padding="md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Failed Logins</span>
                    <span className="text-sm font-medium text-yellow-600">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Sessions</span>
                    <span className="text-sm font-medium text-green-600">127</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Security Alerts</span>
                    <span className="text-sm font-medium text-red-600">1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}