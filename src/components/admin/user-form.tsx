'use client';

import { useState, useEffect } from 'react';
import { User, UserRole, UserCreate, UserUpdate } from '@/types';
import { isValidEmail, isValidPassword } from '@/lib/utils';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Modal from '@/components/ui/modal';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserCreate | UserUpdate) => Promise<void>;
  user?: User | null;
  isLoading?: boolean;
}

export default function UserForm({
  isOpen,
  onClose,
  onSubmit,
  user = null,
  isLoading = false
}: UserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Member' as UserRole,
    region: '',
    constituency: '',
    password: '',
    confirmPassword: '',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        region: user.region || '',
        constituency: user.constituency || '',
        password: '',
        confirmPassword: '',
        isActive: user.isActive
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'Member',
        region: '',
        constituency: '',
        password: '',
        confirmPassword: '',
        isActive: true
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const userRoles: { value: UserRole; label: string; description: string }[] = [
    { value: 'SuperAdmin', label: 'Super Admin', description: 'Full system access and user management' },
    { value: 'PartyHead', label: 'Party Head', description: 'National-level oversight and analytics' },
    { value: 'RegionalLead', label: 'Regional Lead', description: 'Regional management and member oversight' },
    { value: 'Member', label: 'Member (MP/MLA)', description: 'Personal dashboard and AI tools' },
    { value: 'Karyakartha', label: 'Karyakartha', description: 'Local tasks and data collection' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation (only for new users or when password is provided)
    if (!isEditing || formData.password) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (!isValidPassword(formData.password)) {
        newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Role-specific validations
    if (['RegionalLead', 'Member'].includes(formData.role) && !formData.region.trim()) {
      newErrors.region = 'Region is required for this role';
    }

    if (formData.role === 'Member' && !formData.constituency.trim()) {
      newErrors.constituency = 'Constituency is required for Members';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isEditing) {
        const updateData: UserUpdate = {
          name: formData.name.trim(),
          role: formData.role,
          region: formData.region.trim() || undefined,
          constituency: formData.constituency.trim() || undefined,
          isActive: formData.isActive
        };
        
        await onSubmit(updateData);
      } else {
        const createData: UserCreate = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          region: formData.region.trim() || undefined,
          constituency: formData.constituency.trim() || undefined,
          password: formData.password
        };
        
        await onSubmit(createData);
      }
      
      onClose();
    } catch (error) {
      // Error handling is managed by the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit User' : 'Create New User'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Basic Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                error={errors.name}
                placeholder="Enter full name"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(value) => handleInputChange('email', value)}
                error={errors.email}
                placeholder="Enter email address"
                disabled={isSubmitting || isEditing} // Email cannot be changed when editing
              />
            </div>
          </div>
        </div>

        {/* Role and Permissions */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Role and Permissions</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            >
              {userRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            
            {/* Role description */}
            <p className="mt-1 text-xs text-gray-500">
              {userRoles.find(r => r.value === formData.role)?.description}
            </p>
          </div>
        </div>

        {/* Location Information */}
        {(['RegionalLead', 'Member'].includes(formData.role)) && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Location Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region *
                </label>
                <Input
                  type="text"
                  value={formData.region}
                  onChange={(value) => handleInputChange('region', value)}
                  error={errors.region}
                  placeholder="Enter region"
                  disabled={isSubmitting}
                />
              </div>

              {formData.role === 'Member' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Constituency *
                  </label>
                  <Input
                    type="text"
                    value={formData.constituency}
                    onChange={(value) => handleInputChange('constituency', value)}
                    error={errors.constituency}
                    placeholder="Enter constituency"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Password */}
        {(!isEditing || formData.password) && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">
              {isEditing ? 'Change Password' : 'Password'}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isEditing ? 'New Password' : 'Password'} *
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(value) => handleInputChange('password', value)}
                  error={errors.password}
                  placeholder="Enter password"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(value) => handleInputChange('confirmPassword', value)}
                  error={errors.confirmPassword}
                  placeholder="Confirm password"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        {isEditing && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Account Status</h4>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <span className="ml-2 text-sm text-gray-700">
                Active user account
              </span>
            </label>
            <p className="text-xs text-gray-500">
              Inactive users cannot log in to the system
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isLoading}
          >
            {isEditing ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}