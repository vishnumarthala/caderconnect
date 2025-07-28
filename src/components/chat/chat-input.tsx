'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, Mic, Square } from 'lucide-react';
import Button from '@/components/ui/button';

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: string[]) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  onStopStreaming?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading = false,
  isStreaming = false,
  onStopStreaming,
  placeholder = 'Ask me anything...',
  disabled = false
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled && !isLoading) {
      onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // Max height in pixels
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileNames = Array.from(files).map(file => file.name);
      setAttachments(prev => [...prev, ...fileNames]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleStopStreaming = () => {
    if (onStopStreaming) {
      onStopStreaming();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
            >
              <Paperclip className="w-3 h-3 mr-1" />
              <span className="truncate max-w-32">{attachment}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="ml-2 text-blue-500 hover:text-blue-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* File Upload Button */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading}
            className="h-10 w-10 p-0"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '48px' }}
          />
        </div>

        {/* Voice Input Button (placeholder) */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isLoading}
          className="h-10 w-10 p-0"
        >
          <Mic className="w-4 h-4" />
        </Button>

        {/* Send/Stop Button */}
        {isStreaming ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleStopStreaming}
            className="h-10 w-10 p-0"
          >
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!message.trim() || disabled || isLoading}
            isLoading={isLoading}
            className="h-10 w-10 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </form>

      {/* Input Hints */}
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <span>Press Enter to send, Shift + Enter for new line</span>
        {message.length > 0 && (
          <span className={message.length > 2000 ? 'text-red-500' : ''}>
            {message.length}/2000
          </span>
        )}
      </div>
    </div>
  );
}