'use client';

import { FileText, Users, MessageSquare, AlertTriangle, TrendingUp, Settings } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import Card, { CardHeader, CardContent } from '@/components/ui/card';
import Badge from '@/components/ui/badge';

interface ActivityItem {
  id: string;
  type: 'document' | 'user' | 'message' | 'alert' | 'metric' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  metadata?: Record<string, any>;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  showAll?: boolean;
  maxItems?: number;
}

const activityIcons = {
  document: FileText,
  user: Users,
  message: MessageSquare,
  alert: AlertTriangle,
  metric: TrendingUp,
  system: Settings
};

const activityColors = {
  document: 'text-blue-600 bg-blue-100',
  user: 'text-green-600 bg-green-100',
  message: 'text-purple-600 bg-purple-100',
  alert: 'text-red-600 bg-red-100',
  metric: 'text-yellow-600 bg-yellow-100',
  system: 'text-gray-600 bg-gray-100'
};

export default function RecentActivity({
  activities,
  isLoading = false,
  showAll = false,
  maxItems = 10
}: RecentActivityProps) {
  const displayActivities = showAll ? activities : activities.slice(0, maxItems);

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Recent Activity" />
        <CardContent padding="md">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <Card>
        <CardHeader title="Recent Activity" />
        <CardContent padding="md">
          <div className="text-center py-8">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title="Recent Activity" 
        subtitle={`${activities.length} recent activities`}
      />
      <CardContent padding="md">
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const Icon = activityIcons[activity.type];
            const colorClass = activityColors[activity.type];

            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <time className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatRelativeTime(activity.timestamp)}
                    </time>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    {activity.user && (
                      <span className="text-xs text-gray-500">
                        by {activity.user}
                      </span>
                    )}
                    
                    {activity.metadata?.priority && (
                      <Badge
                        variant={
                          activity.metadata.priority === 'high' ? 'danger' :
                          activity.metadata.priority === 'medium' ? 'warning' :
                          'default'
                        }
                        size="sm"
                      >
                        {activity.metadata.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {!showAll && activities.length > maxItems && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
              View all activities ({activities.length - maxItems} more)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}