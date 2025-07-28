'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAlertStore } from '@/stores/alert-store';
import Sidebar from './sidebar';
import Topbar from './topbar';
import RoleGuard from '@/components/ui/role-guard';
import { UserRole } from '@/types';

interface MainLayoutProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export default function MainLayout({ 
  children, 
  allowedRoles = ['SuperAdmin', 'PartyHead', 'RegionalLead', 'Member', 'Karyakartha'],
  requireAuth = true 
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, checkAuth } = useAuthStore();
  const { loadAlerts, refreshAlerts } = useAlertStore();

  useEffect(() => {
    // Check authentication on mount
    if (requireAuth) {
      checkAuth();
    }
  }, [checkAuth, requireAuth]);

  useEffect(() => {
    // Load alerts when user is authenticated
    if (user) {
      loadAlerts();
      
      // Set up alert refresh interval
      const cleanup = refreshAlerts();
      return cleanup;
    }
  }, [user, loadAlerts, refreshAlerts]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [children]);

  if (requireAuth && !user) {
    return null; // Will be handled by RoleGuard
  }

  const content = (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <div className="flex-1 flex flex-col lg:ml-64">
        <Topbar onMenuToggle={toggleSidebar} />
        
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );

  if (requireAuth) {
    return (
      <RoleGuard allowedRoles={allowedRoles}>
        {content}
      </RoleGuard>
    );
  }

  return content;
}