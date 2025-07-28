'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { UserRole } from '@/types';
import { canAccessRoute } from '@/lib/utils';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  showFallback?: boolean;
}

export default function RoleGuard({
  children,
  allowedRoles,
  fallback,
  redirectTo = '/auth/login',
  showFallback = true
}: RoleGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth, isLoggingOut } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated) {
        await checkAuth();
      }
      setIsChecking(false);
    };

    verifyAuth();
  }, [isAuthenticated, checkAuth]);

  // Show loading state while checking authentication or logging out
  if (isLoading || isChecking || isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {isLoggingOut ? 'Logging out...' : 'Verifying access...'}
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (but not if logging out)
  if ((!isAuthenticated || !user) && !isLoggingOut) {
    router.replace(redirectTo);
    return null;
  }

  // Check role-based access
  const hasAccess = canAccessRoute(user.role, allowedRoles);

  if (!hasAccess) {
    if (!showFallback) {
      router.push('/dashboard');
      return null;
    }

    // Show custom fallback or default access denied
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm text-yellow-800 font-medium mb-1">
                  Insufficient Permissions
                </p>
                <p className="text-sm text-yellow-700">
                  Your current role ({user.role}) does not have access to this resource.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Required roles:</strong> {allowedRoles.join(', ')}
            </p>
            <p>
              <strong>Your role:</strong> {user.role}
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Go to Dashboard
            </button>
            
            <button
              onClick={() => router.back()}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Go Back
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If you believe this is an error, please contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
}

// Higher-order component for protecting pages
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  options?: {
    fallback?: React.ReactNode;
    redirectTo?: string;
    showFallback?: boolean;
  }
) {
  const ProtectedComponent = (props: P) => {
    return (
      <RoleGuard
        allowedRoles={allowedRoles}
        fallback={options?.fallback}
        redirectTo={options?.redirectTo}
        showFallback={options?.showFallback}
      >
        <Component {...props} />
      </RoleGuard>
    );
  };

  ProtectedComponent.displayName = `withRoleGuard(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
}

// Hook for checking permissions in components
export function useRoleCheck(requiredRoles: UserRole[]) {
  const { user, isAuthenticated } = useAuthStore();
  
  const hasAccess = isAuthenticated && user && canAccessRoute(user.role, requiredRoles);
  const userRole = user?.role;
  
  return {
    hasAccess,
    userRole,
    isAuthenticated
  };
}