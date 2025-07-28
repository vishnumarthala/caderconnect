'use client';

import { AlertTriangle, AlertCircle, Info, AlertOctagon, Check, X, Eye } from 'lucide-react';
import { Alert, AlertSeverity } from '@/types';
import { formatRelativeTime, cn } from '@/lib/utils';
import { ALERT_SEVERITY_CONFIG } from '@/constants';
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';

interface AlertItemProps {
  alert: Alert;
  onMarkAsRead?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  isSelected?: boolean;
  onClick?: () => void;
}

const severityIcons = {
  low: Info,
  medium: AlertTriangle,
  high: AlertCircle,
  critical: AlertOctagon
};

export default function AlertItem({
  alert,
  onMarkAsRead,
  onDismiss,
  onResolve,
  isSelected = false,
  onClick
}: AlertItemProps) {
  const severityConfig = ALERT_SEVERITY_CONFIG[alert.severity];
  const SeverityIcon = severityIcons[alert.severity];
  
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead?.(alert.id);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(alert.id);
  };

  const handleResolve = (e: React.MouseEvent) => {
    e.stopPropagation();
    onResolve?.(alert.id);
  };

  return (
    <div
      className={cn(
        'p-4 border-l-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors',
        severityConfig.borderColor,
        isSelected && 'bg-blue-50 ring-2 ring-blue-200',
        alert.status === 'unread' && 'shadow-sm'
      )}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Severity Icon */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          severityConfig.bgColor
        )}>
          <SeverityIcon className={cn('w-4 h-4', severityConfig.textColor)} />
        </div>

        {/* Alert Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <h3 className={cn(
                'text-sm font-medium truncate',
                alert.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
              )}>
                {alert.title}
              </h3>
              
              {alert.status === 'unread' && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  alert.severity === 'critical' ? 'danger' :
                  alert.severity === 'high' ? 'warning' :
                  alert.severity === 'medium' ? 'info' :
                  'default'
                }
                size="sm"
              >
                {alert.severity}
              </Badge>
              
              <span className="text-xs text-gray-500">
                {formatRelativeTime(alert.createdAt)}
              </span>
            </div>
          </div>

          <p className={cn(
            'text-sm line-clamp-2 mb-3',
            alert.status === 'unread' ? 'text-gray-700' : 'text-gray-600'
          )}>
            {alert.description}
          </p>

          {/* Alert Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>Category: {alert.category}</span>
              {alert.resolvedAt && (
                <span className="text-green-600">
                  Resolved {formatRelativeTime(alert.resolvedAt)}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {alert.status === 'unread' && onMarkAsRead && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMarkAsRead}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                  title="Mark as read"
                >
                  <Eye className="w-3 h-3" />
                </Button>
              )}

              {alert.status !== 'resolved' && onResolve && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResolve}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-green-600"
                  title="Mark as resolved"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}

              {alert.status !== 'dismissed' && onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                  title="Dismiss alert"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}