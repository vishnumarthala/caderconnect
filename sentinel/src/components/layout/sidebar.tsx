'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, 
  X, 
  BarChart3, 
  MessageSquare, 
  Bell, 
  FileText, 
  TrendingUp, 
  Users, 
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Calendar,
  CalendarDays,
  Target
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAlertStore } from '@/stores/alert-store';
import { NavigationItem, UserRole } from '@/types';
import { NAVIGATION_ITEMS } from '@/constants';
import { canAccessRoute, getRoleColor } from '@/lib/utils';
import Badge from '@/components/ui/badge';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const iconMap = {
  BarChart3,
  MessageSquare,
  Bell,
  FileText,
  TrendingUp,
  Users,
  Settings,
  Calendar,
  CalendarDays,
  Target
};

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useAlertStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  if (!user) return null;

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleLogout = async () => {
    try {
      // Redirect first, then logout to avoid race conditions with auth guards
      router.replace('/');
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure redirect happens even if logout fails
      router.replace('/');
    }
  };

  const filteredNavItems = NAVIGATION_ITEMS.filter(item =>
    canAccessRoute(user.role, item.roleAccess)
  );

  const renderNavItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isActive = pathname === item.href || (hasChildren && item.children?.some(child => pathname === child.href));
    const Icon = iconMap[item.icon as keyof typeof iconMap];

    return (
      <div key={item.id}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            style={{ paddingLeft: `${0.75 + level * 1}rem` }}
          >
            <div className="flex items-center">
              {Icon && <Icon className="w-5 h-5 mr-3" />}
              <span>{item.label}</span>
              {item.badge && (
                <Badge variant="danger" size="sm" className="ml-2">
                  {item.badge}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <Link
            href={item.href}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            style={{ paddingLeft: `${0.75 + level * 1}rem` }}
          >
            {Icon && <Icon className="w-5 h-5 mr-3" />}
            <span>{item.label}</span>
            {item.id === 'alerts' && unreadCount > 0 && (
              <Badge variant="danger" size="sm" className="ml-auto">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
            {item.badge && item.id !== 'alerts' && (
              <Badge variant="info" size="sm" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </Link>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Sentinel</span>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
                <Badge size="sm" className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {filteredNavItems.map(item => renderNavItem(item))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Mobile menu button component
interface MobileMenuButtonProps {
  onClick: () => void;
}

export function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}