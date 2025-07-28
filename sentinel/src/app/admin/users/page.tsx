'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Download, Upload, RefreshCw } from 'lucide-react';
import { User, UserCreate, UserUpdate } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import MainLayout from '@/components/layout/main-layout';
import UserTable from '@/components/admin/user-table';
import UserForm from '@/components/admin/user-form';
import Button from '@/components/ui/button';
import Card, { CardHeader, CardContent } from '@/components/ui/card';

// Mock data - in real app, this would come from API
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@sentinel.gov',
    name: 'System Administrator',
    role: 'SuperAdmin',
    avatar: undefined,
    lastLogin: new Date(Date.now() - 1000 * 60 * 30),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    email: 'party.head@bjp.org',
    name: 'Narendra Modi',
    role: 'PartyHead',
    region: 'National',
    avatar: undefined,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: '3',
    email: 'regional.lead@maharashtra.gov',
    name: 'Devendra Fadnavis',
    role: 'RegionalLead',
    region: 'Maharashtra',
    avatar: undefined,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 4),
    isActive: true,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  },
  {
    id: '4',
    email: 'member@mumbai.gov',
    name: 'Piyush Goyal',
    role: 'Member',
    region: 'Maharashtra',
    constituency: 'Mumbai North',
    avatar: undefined,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 8),
    isActive: true,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04')
  },
  {
    id: '5',
    email: 'karyakartha@local.org',
    name: 'Rajesh Kumar',
    role: 'Karyakartha',
    region: 'Maharashtra',
    constituency: 'Mumbai North',
    avatar: undefined,
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isActive: false,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  }
];

export default function UsersPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Statistics
  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    roles: {
      SuperAdmin: users.filter(u => u.role === 'SuperAdmin').length,
      PartyHead: users.filter(u => u.role === 'PartyHead').length,
      RegionalLead: users.filter(u => u.role === 'RegionalLead').length,
      Member: users.filter(u => u.role === 'Member').length,
      Karyakartha: users.filter(u => u.role === 'Karyakartha').length
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (userId: string) => {
    setIsLoading(true);
    try {
      // In real app, make API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    setIsLoading(true);
    try {
      // In real app, make API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isActive, updatedAt: new Date() } : u
      ));
    } catch (error) {
      console.error('Failed to update user status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = async (data: UserCreate | UserUpdate) => {
    setIsSubmitting(true);
    try {
      // In real app, make API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (editingUser) {
        // Update existing user
        setUsers(prev => prev.map(u =>
          u.id === editingUser.id
            ? { ...u, ...data, updatedAt: new Date() }
            : u
        ));
      } else {
        // Create new user
        const newUser: User = {
          id: Date.now().toString(),
          ...(data as UserCreate),
          avatar: undefined,
          lastLogin: undefined,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setUsers(prev => [newUser, ...prev]);
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // In real app, refetch users from API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to refresh users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportUsers = () => {
    // In real app, generate and download CSV/Excel file
    const csvContent = [
      ['Name', 'Email', 'Role', 'Region', 'Constituency', 'Status', 'Created'],
      ...users.map(user => [
        user.name,
        user.email,
        user.role,
        user.region || '',
        user.constituency || '',
        user.isActive ? 'Active' : 'Inactive',
        user.createdAt.toISOString().split('T')[0]
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!user || user.role !== 'SuperAdmin') {
    return null; // This will be handled by RoleGuard
  }

  return (
    <MainLayout allowedRoles={['SuperAdmin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-7 h-7 mr-3" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage system users, roles, and permissions.
            </p>
          </div>

          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <Button
              variant="outline" 
              size="sm"
              onClick={handleExportUsers}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button size="sm" onClick={handleCreateUser}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactive Users</p>
                  <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="w-4 h-4 bg-red-500 rounded-full"></span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.roles.SuperAdmin}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm font-bold">A</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Distribution */}
        <Card>
          <CardHeader title="Role Distribution" />
          <CardContent padding="md">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.roles).map(([role, count]) => (
                <div key={role} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{role}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <UserTable
          users={users}
          isLoading={isLoading}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
          onToggleUserStatus={handleToggleUserStatus}
        />

        {/* User Form Modal */}
        <UserForm
          isOpen={showUserForm}
          onClose={() => setShowUserForm(false)}
          onSubmit={handleUserSubmit}
          user={editingUser}
          isLoading={isSubmitting}
        />
      </div>
    </MainLayout>
  );
}