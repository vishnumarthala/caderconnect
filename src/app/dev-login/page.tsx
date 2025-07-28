'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DEV_USERS, createDevSession, type DevUser } from '@/lib/dev-auth';
import { useAuthStore } from '@/stores/auth-store';

export default function DevLoginPage() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<DevUser | null>(null);
  const { checkAuth } = useAuthStore();

  const handleLogin = async (user: DevUser) => {
    createDevSession(user);
    // Force auth store to check for the new dev session
    const authSuccess = await checkAuth();
    if (authSuccess) {
      router.push('/dashboard');
    } else {
      console.error('Failed to authenticate with dev session');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin': return 'bg-red-100 text-red-800';
      case 'PartyHead': return 'bg-purple-100 text-purple-800';
      case 'RegionalLead': return 'bg-blue-100 text-blue-800';
      case 'Member': return 'bg-green-100 text-green-800';
      case 'Karyakartha': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎯 Project Sentinel
          </h1>
          <p className="text-gray-600 mb-4">Development Mode - Choose Test Account</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <strong>⚠️ Development Only:</strong> This page allows you to test different user roles without authentication.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DEV_USERS.map((user) => (
            <Card 
              key={user.id} 
              className={`p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                selectedUser?.id === user.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {user.name}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600">{user.email}</p>
                
                {user.region && (
                  <p className="text-sm text-blue-600">
                    📍 {user.region} {user.constituency ? `- ${user.constituency}` : ''}
                  </p>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <div>
                    <strong>Access Level:</strong>{' '}
                    {user.role === 'SuperAdmin' && 'Full System Access'}
                    {user.role === 'PartyHead' && 'National Analytics & Strategy'}
                    {user.role === 'RegionalLead' && 'Regional Management'}
                    {user.role === 'Member' && 'Personal Dashboard & AI Tools'}
                    {user.role === 'Karyakartha' && 'Ground-level Data Input'}
                  </div>
                </div>

                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogin(user);
                  }}
                  className="w-full mt-4"
                  variant={selectedUser?.id === user.id ? 'default' : 'outline'}
                >
                  Login as {user.role}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-4">🎭 Role Descriptions:</h3>
          <div className="grid gap-3 text-sm">
            <div><strong>SuperAdmin:</strong> System administration, user management, full data access</div>
            <div><strong>PartyHead:</strong> National-level analytics, strategic insights, member performance</div>
            <div><strong>RegionalLead:</strong> Regional analytics, member coordination, local insights</div>
            <div><strong>Member:</strong> Personal dashboard, constituency data, AI assistance</div>
            <div><strong>Karyakartha:</strong> Local intelligence input, basic analytics, talking points</div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            💡 Each role has different dashboard views and permissions. Try logging in as different roles to see the platform's capabilities.
          </p>
        </div>
      </Card>
    </div>
  );
}