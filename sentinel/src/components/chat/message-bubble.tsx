'use client';

import { User, Bot, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ChatMessage } from '@/types';
import { formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/button';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onCopy?: (content: string) => void;
  onFeedback?: (messageId: string, feedback: 'up' | 'down') => void;
}

export default function MessageBubble({
  message,
  isStreaming = false,
  onCopy,
  onFeedback
}: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
      // Show toast notification (you could use a toast library here)
      navigator.clipboard.writeText(message.content);
    }
  };

  const handleFeedback = (feedback: 'up' | 'down') => {
    if (onFeedback) {
      onFeedback(message.id, feedback);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-white'
            }`}
          >
            {isUser ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-4 py-3 rounded-2xl ${
              isUser
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm'
            }`}
          >
            {/* Message text */}
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
              {isStreaming && isAI && (
                <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
              )}
            </div>

            {/* Attachments */}
            {message.metadata?.attachments && message.metadata.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.metadata.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className={`text-xs px-2 py-1 rounded ${
                      isUser ? 'bg-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    📎 {attachment}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Actions */}
          <div className="flex items-center mt-2 space-x-2">
            {/* Timestamp */}
            <span className="text-xs text-gray-500">
              {formatDateTime(message.timestamp)}
            </span>

            {/* AI Message Actions */}
            {isAI && !isStreaming && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback('up')}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-green-600"
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback('down')}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}