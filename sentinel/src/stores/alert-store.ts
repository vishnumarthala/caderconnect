import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Alert, AlertSeverity, AlertStatus } from '@/types';
import { API_ENDPOINTS, DEFAULT_VALUES } from '@/constants';

interface AlertStore {
  // State
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  filters: {
    severity?: AlertSeverity;
    status?: AlertStatus;
    category?: string;
  };

  // Actions
  loadAlerts: () => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string, notes?: string) => Promise<void>;
  createAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  setFilters: (filters: Partial<AlertStore['filters']>) => void;
  clearFilters: () => void;
  refreshAlerts: () => void;
  clearError: () => void;
}

export const useAlertStore = create<AlertStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      alerts: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      filters: {},

      // Actions
      loadAlerts: async () => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem('token');
          const { filters } = get();
          
          const queryParams = new URLSearchParams();
          if (filters.severity) queryParams.append('severity', filters.severity);
          if (filters.status) queryParams.append('status', filters.status);
          if (filters.category) queryParams.append('category', filters.category);

          const url = `${API_ENDPOINTS.alerts.list}?${queryParams.toString()}`;
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load alerts');
          }

          const alerts: Alert[] = await response.json();
          const unreadCount = alerts.filter(alert => alert.status === 'unread').length;

          set({
            alerts,
            unreadCount,
            isLoading: false
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load alerts'
          });
        }
      },

      markAsRead: async (alertId: string) => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.alerts.update(alertId), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ status: 'read' }),
          });

          if (!response.ok) {
            throw new Error('Failed to mark alert as read');
          }

          set(state => {
            const updatedAlerts = state.alerts.map(alert =>
              alert.id === alertId
                ? { ...alert, status: 'read' as AlertStatus, updatedAt: new Date() }
                : alert
            );
            
            const unreadCount = updatedAlerts.filter(alert => alert.status === 'unread').length;

            return {
              alerts: updatedAlerts,
              unreadCount
            };
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to mark alert as read'
          });
        }
      },

      markAllAsRead: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_ENDPOINTS.alerts.list}/mark-all-read`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to mark all alerts as read');
          }

          set(state => ({
            alerts: state.alerts.map(alert => ({
              ...alert,
              status: alert.status === 'unread' ? 'read' as AlertStatus : alert.status,
              updatedAt: new Date()
            })),
            unreadCount: 0
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to mark all alerts as read'
          });
        }
      },

      dismissAlert: async (alertId: string) => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.alerts.dismiss(alertId), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to dismiss alert');
          }

          set(state => {
            const updatedAlerts = state.alerts.map(alert =>
              alert.id === alertId
                ? { ...alert, status: 'dismissed' as AlertStatus, updatedAt: new Date() }
                : alert
            );
            
            const unreadCount = updatedAlerts.filter(alert => alert.status === 'unread').length;

            return {
              alerts: updatedAlerts,
              unreadCount
            };
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to dismiss alert'
          });
        }
      },

      resolveAlert: async (alertId: string, notes?: string) => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.alerts.update(alertId), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: 'resolved',
              resolvedAt: new Date(),
              metadata: { resolveNotes: notes }
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to resolve alert');
          }

          set(state => {
            const updatedAlerts = state.alerts.map(alert =>
              alert.id === alertId
                ? {
                    ...alert,
                    status: 'resolved' as AlertStatus,
                    resolvedAt: new Date(),
                    updatedAt: new Date(),
                    metadata: { ...alert.metadata, resolveNotes: notes }
                  }
                : alert
            );
            
            const unreadCount = updatedAlerts.filter(alert => alert.status === 'unread').length;

            return {
              alerts: updatedAlerts,
              unreadCount
            };
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to resolve alert'
          });
        }
      },

      createAlert: async (alertData: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.alerts.create, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(alertData),
          });

          if (!response.ok) {
            throw new Error('Failed to create alert');
          }

          const newAlert: Alert = await response.json();

          set(state => ({
            alerts: [newAlert, ...state.alerts],
            unreadCount: newAlert.status === 'unread' ? state.unreadCount + 1 : state.unreadCount
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create alert'
          });
        }
      },

      setFilters: (newFilters: Partial<AlertStore['filters']>) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters }
        }));
        
        // Reload alerts with new filters
        get().loadAlerts();
      },

      clearFilters: () => {
        set({ filters: {} });
        get().loadAlerts();
      },

      refreshAlerts: () => {
        const intervalId = setInterval(() => {
          get().loadAlerts();
        }, DEFAULT_VALUES.alerts.autoRefreshInterval);

        // Store interval ID for cleanup (in a real app, you'd want to manage this better)
        return () => clearInterval(intervalId);
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    { name: 'alert-store' }
  )
);