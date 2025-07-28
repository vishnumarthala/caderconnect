'use client';

import { TrendingUp, TrendingDown, Users, Activity, AlertTriangle } from 'lucide-react';
import { MetricCard as MetricCardType } from '@/types';
import { formatNumber } from '@/lib/utils';
import Card from '@/components/ui/card';

interface MetricCardProps {
  metric: MetricCardType;
  isLoading?: boolean;
}

const iconMap = {
  Users,
  Activity,
  AlertTriangle,
  TrendingUp
};

export default function MetricCard({ metric, isLoading = false }: MetricCardProps) {
  const Icon = iconMap[metric.icon as keyof typeof iconMap] || TrendingUp;
  
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    purple: 'bg-purple-500 text-white'
  };

  const bgColorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    red: 'bg-red-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50'
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card hover className={bgColorClasses[metric.color]}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            {metric.title}
          </h3>
          
          <div className="flex items-baseline mb-2">
            <span className="text-2xl font-bold text-gray-900">
              {typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}
            </span>
          </div>
          
          {metric.change && (
            <div className="flex items-center text-sm">
              {metric.change.type === 'increase' ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span
                className={`font-medium ${
                  metric.change.type === 'increase' ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {metric.change.value}%
              </span>
              <span className="text-gray-500 ml-1">{metric.change.period}</span>
            </div>
          )}
        </div>
        
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[metric.color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}