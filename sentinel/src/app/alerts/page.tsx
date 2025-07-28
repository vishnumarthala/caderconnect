'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, Bell, Search, Plus } from 'lucide-react';
import { useAlertStore } from '@/stores/alert-store';
import { useAuthStore } from '@/stores/auth-store';
import { Alert, AlertSeverity, AlertStatus } from '@/types';
import { hasPermission } from '@/lib/utils';
import MainLayout from '@/components/layout/main-layout';
import AlertItem from '@/components/alerts/alert-item';
import AlertFilters from '@/components/alerts/alert-filters';
import Button from '@/components/ui/button';
import Card, { CardHeader, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';

export default function AlertsPage() {
  const { user } = useAuthStore();
  const {
    alerts,
    unreadCount,
    isLoading,
    error,
    filters,
    loadAlerts,
    markAsRead,
    markAllAsRead,
    dismissAlert,
    resolveAlert,
    setFilters,
    clearFilters,
    clearError
  } = useAlertStore();

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAlerts();
    setIsRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleAlertAction = async (action: string, alertId: string) => {
    switch (action) {
      case 'read':
        await markAsRead(alertId);
        break;
      case 'dismiss':
        await dismissAlert(alertId);
        break;
      case 'resolve':
        await resolveAlert(alertId);
        break;
    }
    
    // Close detail view if current alert was modified
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(null);
    }
  };

  // Filter alerts based on search query
  const filteredAlerts = alerts.filter(alert =>
    alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(alerts.map(alert => alert.category)));

  // Group alerts by status for better organization
  const unreadAlerts = filteredAlerts.filter(alert => alert.status === 'unread');
  const readAlerts = filteredAlerts.filter(alert => alert.status === 'read');
  const resolvedAlerts = filteredAlerts.filter(alert => alert.status === 'resolved');

  const canCreateAlerts = user && hasPermission(user.role, 'alerts.manage');

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Bell className="w-7 h-7 mr-3" />
              Alerts & Notifications
            </h1>
            <p className="text-gray-600 mt-1">
              Stay updated with important system notifications and alerts.
            </p>
          </div>

          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark all read ({unreadCount})
              </Button>
            )}

            {canCreateAlerts && (
              <Button
                size="sm"
                onClick={() => setShowCreateAlert(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent padding="md">
              <div className="flex items-center justify-between">
                <div className="text-red-800">
                  <p className="font-medium">Error loading alerts</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearError}
                  className="text-red-600 border-red-300 hover:bg-red-100"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
                </div>
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-blue-600">{unreadAlerts.length}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {alerts.filter(a => a.severity === 'critical').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-sm font-bold">!</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{resolvedAlerts.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <AlertFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
            categories={categories}
          />
        </div>

        {/* Alerts List */}
        <div className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent padding="md">
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredAlerts.length === 0 ? (
            <Card>
              <CardContent padding="lg">
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || Object.values(filters).some(Boolean) 
                      ? 'No alerts match your criteria' 
                      : 'No alerts yet'
                    }
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery || Object.values(filters).some(Boolean)
                      ? 'Try adjusting your search or filters to find what you\'re looking for.'
                      : 'You\'re all caught up! New alerts will appear here when they arrive.'
                    }
                  </p>
                  {(searchQuery || Object.values(filters).some(Boolean)) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        clearFilters();
                      }}
                    >
                      Clear search and filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Unread Alerts */}
              {unreadAlerts.length > 0 && (
                <Card>
                  <CardHeader 
                    title="Unread Alerts" 
                    subtitle={`${unreadAlerts.length} new notifications`}
                  />
                  <CardContent padding="none">
                    <div className="divide-y divide-gray-200">
                      {unreadAlerts.map((alert) => (
                        <div key={alert.id} className="group">
                          <AlertItem
                            alert={alert}
                            onMarkAsRead={(id) => handleAlertAction('read', id)}
                            onDismiss={(id) => handleAlertAction('dismiss', id)}
                            onResolve={(id) => handleAlertAction('resolve', id)}
                            isSelected={selectedAlert?.id === alert.id}
                            onClick={() => setSelectedAlert(alert)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Read Alerts */}
              {readAlerts.length > 0 && (
                <Card>
                  <CardHeader 
                    title="Read Alerts" 
                    subtitle={`${readAlerts.length} read notifications`}
                  />
                  <CardContent padding="none">
                    <div className="divide-y divide-gray-200">
                      {readAlerts.map((alert) => (
                        <div key={alert.id} className="group">
                          <AlertItem
                            alert={alert}
                            onDismiss={(id) => handleAlertAction('dismiss', id)}
                            onResolve={(id) => handleAlertAction('resolve', id)}
                            isSelected={selectedAlert?.id === alert.id}
                            onClick={() => setSelectedAlert(alert)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resolved Alerts */}
              {resolvedAlerts.length > 0 && (
                <Card>
                  <CardHeader 
                    title="Resolved Alerts" 
                    subtitle={`${resolvedAlerts.length} resolved notifications`}
                  />
                  <CardContent padding="none">
                    <div className="divide-y divide-gray-200">
                      {resolvedAlerts.map((alert) => (
                        <div key={alert.id} className="group">
                          <AlertItem
                            alert={alert}
                            isSelected={selectedAlert?.id === alert.id}
                            onClick={() => setSelectedAlert(alert)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAlert(null)}
          title="Alert Details"
          size="lg"
        >
          <div className="space-y-6">
            <AlertItem
              alert={selectedAlert}
              onMarkAsRead={(id) => handleAlertAction('read', id)}
              onDismiss={(id) => handleAlertAction('dismiss', id)}
              onResolve={(id) => handleAlertAction('resolve', id)}
            />
            
            {selectedAlert.metadata && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Information</h4>
                <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-auto">
                  {JSON.stringify(selectedAlert.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}