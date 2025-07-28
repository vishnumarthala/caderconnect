'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, BarChart3, MessageSquare, Users, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, checkAuth, isLoggingOut } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      // Don't check auth if user is logging out
      if (isLoggingOut) {
        setIsLoading(false);
        return;
      }
      
      // Check if user is already authenticated and redirect to dashboard
      try {
        const isAuth = await checkAuth();
        if (isAuth) {
          router.replace('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [checkAuth, router, isLoggingOut]);

  if (isLoading) {
    return <Loading fullScreen text="Loading Sentinel..." />;
  }

  // If user is authenticated, they're being redirected to dashboard
  if (isAuthenticated) {
    return <Loading fullScreen text="Redirecting to dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-900">Sentinel</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Political Intelligence
            <span className="block text-blue-600">Powered by AI</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Advanced platform for political stakeholders featuring real-time analytics, 
            AI-powered insights, and comprehensive constituency management tools.
          </p>

          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/auth/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">
              Real-time insights and data visualization for informed decision making.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Assistant</h3>
            <p className="text-gray-600">
              Intelligent chatbot for policy analysis, speech writing, and strategic planning.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
            <p className="text-gray-600">
              Role-based access control for different levels of political hierarchy.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Alerts</h3>
            <p className="text-gray-600">
              Instant notifications for critical events and trending issues.
            </p>
          </div>
        </div>

        {/* Role-based Access Section */}
        <div className="mt-20 bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Built for Every Level of Leadership
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-red-600 font-bold">SA</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Super Admin</h3>
              <p className="text-gray-600 text-sm">
                Complete system control, user management, and security oversight.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-purple-600 font-bold">PH</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Party Head</h3>
              <p className="text-gray-600 text-sm">
                National-level analytics, strategic planning, and party management.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">RL</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Regional Lead</h3>
              <p className="text-gray-600 text-sm">
                Regional oversight, member coordination, and local analytics.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-green-600 font-bold">MP</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Member (MP/MLA)</h3>
              <p className="text-gray-600 text-sm">
                Personal performance tracking and constituency management tools.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-yellow-600 font-bold">K</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Karyakartha</h3>
              <p className="text-gray-600 text-sm">
                Local task management, data collection, and ground-level insights.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Scalable</h3>
              <p className="text-gray-600 text-sm">
                Enterprise-grade security with role-based permissions and audit trails.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold">Sentinel</span>
            </div>
            <p className="text-gray-400 mb-6">
              Empowering political leaders with intelligent insights and data-driven decisions.
            </p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white">Support</a>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              © 2024 Sentinel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}