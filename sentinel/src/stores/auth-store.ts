import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, AuthState, LoginCredentials, AuthResponse } from '@/types';
import { API_ENDPOINTS } from '@/constants';
import { getDevSession, clearDevSession, getDevUser, createDevSession, type DevUser } from '@/lib/dev-auth';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
  isLoggingOut: boolean;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        isLoggingOut: false,

        // Actions
        login: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null });
          
          // In development mode, check if this matches a dev user
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
            const devUser = getDevUser(credentials.email);
            if (devUser && credentials.password === 'TestPassword123!') {
              const user: User = {
                id: devUser.id,
                email: devUser.email,
                name: devUser.name,
                role: devUser.role,
                region: devUser.region,
                constituency: devUser.constituency,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              createDevSession(devUser);
              
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });

              return true;
            }
          }
          
          try {
            const response = await fetch(API_ENDPOINTS.auth.login, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(credentials),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Login failed');
            }

            const data: AuthResponse = await response.json();
            
            // Store tokens in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);

            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });

            return true;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Login failed',
              isAuthenticated: false,
              user: null
            });
            return false;
          }
        },

        logout: async () => {
          set({ isLoggingOut: true });
          
          // Clear all storage and state
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
          }
          
          // In development mode, clear dev session
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
            clearDevSession();
          }
          
          // Reset auth state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isLoggingOut: false,
            error: null
          });
        },

        refreshToken: async () => {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) return false;

          try {
            const response = await fetch(API_ENDPOINTS.auth.refresh, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
              throw new Error('Token refresh failed');
            }

            const data: AuthResponse = await response.json();
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);

            set({
              user: data.user,
              isAuthenticated: true,
              error: null
            });

            return true;
          } catch (error) {
            // If refresh fails, logout user
            get().logout();
            return false;
          }
        },

        updateUser: (userData: Partial<User>) => {
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: { ...currentUser, ...userData }
            });
          }
        },

        clearError: () => {
          set({ error: null });
        },

        checkAuth: async () => {
          // In development mode, check for dev session synchronously
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
            const devUser = getDevSession();
            if (devUser) {
              const user: User = {
                id: devUser.id,
                email: devUser.email,
                name: devUser.name,
                role: devUser.role,
                region: devUser.region,
                constituency: devUser.constituency,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });
              return true;
            }
            
            set({ isAuthenticated: false, user: null, isLoading: false });
            return false;
          }

          // Production auth check
          const token = localStorage.getItem('token');
          if (!token) {
            set({ isAuthenticated: false, user: null });
            return false;
          }

          set({ isLoading: true });

          try {
            const response = await fetch(API_ENDPOINTS.auth.profile, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              // Try to refresh token
              const refreshSuccess = await get().refreshToken();
              if (!refreshSuccess) {
                throw new Error('Authentication failed');
              }
              return true;
            }

            const user: User = await response.json();
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });

            return true;
          } catch (error) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Authentication check failed'
            });
            return false;
          }
        }
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated
        })
      }
    ),
    { name: 'auth-store' }
  )
);