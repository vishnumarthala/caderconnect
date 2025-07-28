'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Film, Database, AlertCircle, Check } from 'lucide-react';
import { FileUpload as FileUploadType } from '@/types';
import { formatFileSize, getFileExtension, isImageFile } from '@/lib/utils';
import Button from '@/components/ui/button';
import Card, { CardHeader, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export default function FileUpload({
  onUpload,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.csv'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  disabled = false,
  className = ''
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (file: File) => {
    const extension = getFileExtension(file.name);
    
    if (isImageFile(file.name)) {
      return <Image className="w-5 h-5 text-blue-500" />;
    }
    
    switch (extension) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'csv':
      case 'json':
      case 'xml':
        return <Database className="w-5 h-5 text-green-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <Film className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(maxFileSize)}.`;
    }

    // Check file type
    const extension = '.' + getFileExtension(file.name);
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(extension.toLowerCase())) {
      return `File type "${extension}" is not supported. Accepted types: ${acceptedTypes.join(', ')}.`;
    }

    return null;
  };

  const handleFileSelection = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    // Check total file count
    if (selectedFiles.length + fileArray.length > maxFiles) {
      newErrors.push(`You can only upload up to ${maxFiles} files at once.`);
      setErrors(newErrors);
      return;
    }

    // Validate each file
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    // Check for duplicates
    const duplicates = validFiles.filter(file => 
      selectedFiles.some(selected => selected.name === file.name)
    );

    if (duplicates.length > 0) {
      newErrors.push(`Some files are already selected: ${duplicates.map(f => f.name).join(', ')}`);
    }

    const uniqueValidFiles = validFiles.filter(file => 
      !selectedFiles.some(selected => selected.name === file.name)
    );

    setErrors(newErrors);
    if (uniqueValidFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...uniqueValidFiles]);
    }
  }, [selectedFiles, maxFiles, maxFileSize, acceptedTypes]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files);
    }
  }, [disabled, handleFileSelection]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files);
    }
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setErrors([]);
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0 && !disabled) {
      onUpload(selectedFiles);
      setSelectedFiles([]);
      setErrors([]);
    }
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setErrors([]);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader title="File Upload" />
        <CardContent padding="md">
          <div className="space-y-4">
            {/* Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !disabled && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedTypes.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled}
              />

              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {dragActive ? 'Drop files here' : 'Upload files'}
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop your files here, or click to browse
              </p>

              <div className="text-xs text-gray-500 space-y-1">
                <p>Accepted types: {acceptedTypes.join(', ')}</p>
                <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
                <p>Maximum files: {maxFiles}</p>
              </div>
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    Selected Files ({selectedFiles.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </Button>
                </div>

                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {getFileIcon(file)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Upload Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleUpload}
                    disabled={disabled}
                    className="min-w-32"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}