'use client';

import { useState } from 'react';
import { Filter, X, CheckCircle } from 'lucide-react';
import { AlertSeverity, AlertStatus } from '@/types';
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import Modal from '@/components/ui/modal';

interface AlertFiltersProps {
  filters: {
    severity?: AlertSeverity;
    status?: AlertStatus;
    category?: string;
  };
  onFiltersChange: (filters: AlertFiltersProps['filters']) => void;
  onClearFilters: () => void;
  categories: string[];
}

export default function AlertFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  categories
}: AlertFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const severityOptions: { value: AlertSeverity; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  const statusOptions: { value: AlertStatus; label: string; color: string }[] = [
    { value: 'unread', label: 'Unread', color: 'bg-blue-100 text-blue-800' },
    { value: 'read', label: 'Read', color: 'bg-gray-100 text-gray-800' },
    { value: 'dismissed', label: 'Dismissed', color: 'bg-gray-100 text-gray-800' },
    { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' }
  ];

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setTempFilters({});
    onFiltersChange({});
    setShowFilters(false);
  };

  const handleFilterChange = (key: keyof typeof tempFilters, value: string | undefined) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(true)}
            className="relative"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge
                variant="danger"
                size="sm"
                className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 flex items-center justify-center text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            <div className="flex items-center space-x-2">
              {filters.severity && (
                <Badge variant="outline" size="sm">
                  Severity: {filters.severity}
                </Badge>
              )}
              {filters.status && (
                <Badge variant="outline" size="sm">
                  Status: {filters.status}
                </Badge>
              )}
              {filters.category && (
                <Badge variant="outline" size="sm">
                  Category: {filters.category}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <Modal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Alerts"
        size="md"
      >
        <div className="space-y-6">
          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Severity
            </label>
            <div className="grid grid-cols-2 gap-2">
              {severityOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="severity"
                    value={option.value}
                    checked={tempFilters.severity === option.value}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className={`px-2 py-1 rounded-full text-xs ${option.color}`}>
                    {option.label}
                  </span>
                </label>
              ))}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="severity"
                  value=""
                  checked={!tempFilters.severity}
                  onChange={() => handleFilterChange('severity', undefined)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-600">All severities</span>
              </label>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={tempFilters.status === option.value}
                    onChange={(e) => handleFilterChange('status', e.target.value as AlertStatus)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className={`px-2 py-1 rounded-full text-xs ${option.color}`}>
                    {option.label}
                  </span>
                </label>
              ))}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value=""
                  checked={!tempFilters.status}
                  onChange={() => handleFilterChange('status', undefined)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-600">All statuses</span>
              </label>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Category
            </label>
            <select
              value={tempFilters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={handleResetFilters}
            >
              Reset all
            </Button>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyFilters}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply filters
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}