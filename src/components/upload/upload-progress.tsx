'use client';

import { CheckCircle, XCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { FileUpload } from '@/types';
import { formatFileSize } from '@/lib/utils';
import Button from '@/components/ui/button';
import Card, { CardHeader, CardContent } from '@/components/ui/card';

interface UploadProgressProps {
  uploads: FileUpload[];
  onCancel?: (uploadId: string) => void;
  onRetry?: (uploadId: string) => void;
  onClear?: (uploadId: string) => void;
  showCompleted?: boolean;
}

export default function UploadProgress({
  uploads,
  onCancel,
  onRetry,
  onClear,
  showCompleted = true
}: UploadProgressProps) {
  const activeUploads = uploads.filter(upload => 
    upload.status === 'pending' || upload.status === 'uploading'
  );
  
  const completedUploads = uploads.filter(upload => 
    upload.status === 'completed' || upload.status === 'error'
  );

  const getStatusIcon = (upload: FileUpload) => {
    switch (upload.status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 text-gray-400" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (upload: FileUpload) => {
    switch (upload.status) {
      case 'pending':
        return 'bg-gray-200';
      case 'uploading':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-200';
    }
  };

  const getStatusText = (upload: FileUpload) => {
    switch (upload.status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return `Uploading... ${upload.uploadProgress}%`;
      case 'completed':
        return 'Upload complete';
      case 'error':
        return upload.error || 'Upload failed';
      default:
        return 'Unknown status';
    }
  };

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Active Uploads */}
      {activeUploads.length > 0 && (
        <Card>
          <CardHeader 
            title="Uploading Files" 
            subtitle={`${activeUploads.length} file${activeUploads.length !== 1 ? 's' : ''} in progress`}
          />
          <CardContent padding="md">
            <div className="space-y-4">
              {activeUploads.map((upload) => (
                <div key={upload.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getStatusIcon(upload)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {upload.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(upload.fileSize)} • {getStatusText(upload)}
                        </p>
                      </div>
                    </div>

                    {upload.status === 'uploading' && onCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(upload.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {upload.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(upload)}`}
                        style={{ width: `${upload.uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Uploads */}
      {showCompleted && completedUploads.length > 0 && (
        <Card>
          <CardHeader 
            title="Upload History" 
            subtitle={`${completedUploads.length} completed upload${completedUploads.length !== 1 ? 's' : ''}`}
          />
          <CardContent padding="md">
            <div className="space-y-3">
              {completedUploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(upload)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(upload.fileSize)} • {getStatusText(upload)}
                        {upload.uploadedAt && ` • ${new Date(upload.uploadedAt).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {upload.status === 'error' && onRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRetry(upload.id)}
                        className="text-xs px-2 py-1 h-7"
                      >
                        Retry
                      </Button>
                    )}

                    {onClear && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClear(upload.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Clear All Button */}
              {completedUploads.length > 1 && onClear && (
                <div className="pt-3 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => completedUploads.forEach(upload => onClear(upload.id))}
                    className="w-full text-gray-500 hover:text-gray-700"
                  >
                    Clear all completed uploads
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}