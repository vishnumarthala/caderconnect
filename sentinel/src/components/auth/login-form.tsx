'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { LoginCredentials } from '@/types';
import { isValidEmail } from '@/lib/utils';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export default function LoginForm({ onSuccess, redirectTo = '/dashboard' }: LoginFormProps) {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    try {
      const success = await login(formData);
      if (success) {
        onSuccess?.();
        router.push(redirectTo);
      }
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear global error
    if (error) {
      clearError();
    }
  };

  const fillCredentials = (email: string) => {
    setFormData({
      email,
      password: 'TestPassword123!'
    });
    clearError();
    setErrors({});
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-xl rounded-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Sign In to Sentinel</h2>
          <p className="text-gray-600 mt-2">Welcome back! Please sign in to your account.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 placeholder-gray-500 ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
              disabled={isLoading}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 placeholder-gray-500 ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Development Test Accounts:</h3>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin@party.com')}
                  className="w-full text-left bg-red-50 text-gray-900 p-2 rounded hover:bg-red-100 transition-colors"
                >
                  <strong>Super Admin:</strong> admin@party.com / TestPassword123!
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('leader@party.com')}
                  className="w-full text-left bg-purple-50 text-gray-900 p-2 rounded hover:bg-purple-100 transition-colors"
                >
                  <strong>Party Head:</strong> leader@party.com / TestPassword123!
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('north.lead@party.com')}
                  className="w-full text-left bg-blue-50 text-gray-900 p-2 rounded hover:bg-blue-100 transition-colors"
                >
                  <strong>Regional Lead:</strong> north.lead@party.com / TestPassword123!
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('mp.delhi@party.com')}
                  className="w-full text-left bg-green-50 text-gray-900 p-2 rounded hover:bg-green-100 transition-colors"
                >
                  <strong>Member (MP):</strong> mp.delhi@party.com / TestPassword123!
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('worker1@party.com')}
                  className="w-full text-left bg-yellow-50 text-gray-900 p-2 rounded hover:bg-yellow-100 transition-colors"
                >
                  <strong>Karyakartha:</strong> worker1@party.com / TestPassword123!
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click on any credential above to copy, or type manually.
              </p>
            </div>
          )}
          <p className="text-center text-sm text-gray-600">
            Need access? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}