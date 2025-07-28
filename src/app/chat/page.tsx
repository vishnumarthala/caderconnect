'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Sparkles, AlertCircle, Settings } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import MainLayout from '@/components/layout/main-layout';
import ChatSidebar from '@/components/chat/chat-sidebar';
import MessageBubble from '@/components/chat/message-bubble';
import ChatInput from '@/components/chat/chat-input';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';

export default function ChatPage() {
  const { user } = useAuthStore();
  const {
    currentSession,
    sessions,
    messages,
    isLoading,
    isStreaming,
    error,
    selectedModel,
    createSession,
    loadSession,
    sendMessage,
    deleteSession,
    updateSessionTitle,
    loadSessions,
    clearError,
    setSelectedModel
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    // Load chat sessions on mount
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleCreateSession = async (title?: string) => {
    try {
      await createSession(title);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleSendMessage = async (content: string, attachments?: string[]) => {
    try {
      if (!currentSession) {
        // Create a new session if none exists
        await createSession('New Chat');
      }
      await sendMessage(content, attachments);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // You could show a toast notification here
  };

  const handleMessageFeedback = (messageId: string, feedback: 'up' | 'down') => {
    // Implement feedback functionality
    console.log('Message feedback:', messageId, feedback);
  };

  const availableModels = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
    { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
    { id: 'command-r-plus', name: 'Command R+', provider: 'Cohere' },
    { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral' }
  ];

  const suggestedPrompts = [
    "Analyze voter sentiment in my constituency",
    "Generate weekly performance report",
    "Draft a speech for upcoming event",
    "Summarize recent policy changes",
    "Create social media content strategy"
  ];

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <ChatSidebar
            sessions={sessions}
            currentSession={currentSession}
            onCreateSession={handleCreateSession}
            onSelectSession={handleSelectSession}
            onDeleteSession={deleteSession}
            onUpdateSessionTitle={updateSessionTitle}
            isLoading={isLoading && sessions.length === 0}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {currentSession?.title || 'AI Assistant'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Your intelligent political assistant
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Model Selector */}
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </option>
                    ))}
                  </select>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  {showSidebar ? 'Hide' : 'Show'} History
                </Button>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-red-800">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">{error}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="text-red-600 hover:text-red-800"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="max-w-2xl text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome to Sentinel AI
                  </h2>
                  
                  <p className="text-gray-600 mb-8">
                    Your intelligent assistant for political insights, analysis, and communication.
                    Ask me anything about your constituency, policies, or campaign strategies.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                    {suggestedPrompts.map((prompt, index) => (
                      <Card
                        key={index}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleSendMessage(prompt)}
                      >
                        <p className="text-sm text-gray-700">{prompt}</p>
                      </Card>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500">
                    Choose a suggestion above or type your own message to get started.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isStreaming={isStreaming && message.sender === 'ai' && message.id === messages[messages.length - 1]?.id}
                    onCopy={handleCopyMessage}
                    onFeedback={handleMessageFeedback}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isStreaming={isStreaming}
            placeholder="Ask me about policies, constituencies, campaigns, or anything else..."
            disabled={!user}
          />
        </div>
      </div>
    </MainLayout>
  );
}