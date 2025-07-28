import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ChatMessage, ChatSession, AIResponse } from '@/types';
import { API_ENDPOINTS, DEFAULT_VALUES } from '@/constants';

interface ChatStore {
  // State
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  selectedModel: string;

  // Actions
  createSession: (title?: string) => Promise<ChatSession>;
  loadSession: (sessionId: string) => Promise<void>;
  sendMessage: (content: string, attachments?: string[]) => Promise<void>;
  clearCurrentSession: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  setSelectedModel: (model: string) => void;
}

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSession: null,
      sessions: [],
      messages: [],
      isLoading: false,
      isStreaming: false,
      error: null,
      selectedModel: typeof window !== 'undefined' 
        ? localStorage.getItem('selectedAiModel') || 'gpt-4'
        : 'gpt-4',

      // Actions
      createSession: async (title = 'New Chat') => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.chat.sessions, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ title }),
          });

          if (!response.ok) {
            throw new Error('Failed to create chat session');
          }

          const session: ChatSession = await response.json();
          
          set(state => ({
            currentSession: session,
            sessions: [session, ...state.sessions],
            messages: [],
            isLoading: false
          }));

          return session;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to create session'
          });
          throw error;
        }
      },

      loadSession: async (sessionId: string) => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.chat.messages(sessionId), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load chat session');
          }

          const data = await response.json();
          const session = get().sessions.find(s => s.id === sessionId);

          set({
            currentSession: session || null,
            messages: data.messages || [],
            isLoading: false
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load session'
          });
        }
      },

      sendMessage: async (content: string, attachments?: string[]) => {
        const { currentSession } = get();
        if (!currentSession) {
          throw new Error('No active chat session');
        }

        const userMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          content,
          sender: 'user',
          timestamp: new Date(),
          userId: currentSession.userId,
          metadata: attachments ? { attachments } : undefined
        };

        // Add user message immediately
        set(state => ({
          messages: [...state.messages, userMessage],
          isStreaming: true,
          error: null
        }));

        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.chat.stream, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              sessionId: currentSession.id,
              message: content,
              attachments,
              model: get().selectedModel
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to send message');
          }

          // Handle streaming response
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response stream available');
          }

          let aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            content: '',
            sender: 'ai',
            timestamp: new Date(),
            userId: 'system'
          };

          // Add empty AI message
          set(state => ({
            messages: [...state.messages, aiMessage]
          }));

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    aiMessage.content += parsed.content;
                    
                    // Update the AI message in state
                    set(state => ({
                      messages: state.messages.map(msg => 
                        msg.id === aiMessage.id 
                          ? { ...msg, content: aiMessage.content }
                          : msg
                      )
                    }));
                  }
                } catch (e) {
                  console.error('Error parsing stream data:', e);
                }
              }
            }
          }

          set({ isStreaming: false });

        } catch (error) {
          // Remove the user message on error
          set(state => ({
            messages: state.messages.filter(msg => msg.id !== userMessage.id),
            isStreaming: false,
            error: error instanceof Error ? error.message : 'Failed to send message'
          }));
        }
      },

      clearCurrentSession: () => {
        set({
          currentSession: null,
          messages: [],
          error: null
        });
      },

      deleteSession: async (sessionId: string) => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_ENDPOINTS.chat.sessions}/${sessionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to delete session');
          }

          set(state => ({
            sessions: state.sessions.filter(s => s.id !== sessionId),
            currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
            messages: state.currentSession?.id === sessionId ? [] : state.messages
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete session'
          });
        }
      },

      updateSessionTitle: async (sessionId: string, title: string) => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_ENDPOINTS.chat.sessions}/${sessionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ title }),
          });

          if (!response.ok) {
            throw new Error('Failed to update session title');
          }

          const updatedSession: ChatSession = await response.json();

          set(state => ({
            sessions: state.sessions.map(s => 
              s.id === sessionId ? updatedSession : s
            ),
            currentSession: state.currentSession?.id === sessionId 
              ? updatedSession 
              : state.currentSession
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update session'
          });
        }
      },

      loadSessions: async () => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.chat.sessions, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load chat sessions');
          }

          const sessions: ChatSession[] = await response.json();
          
          set({
            sessions,
            isLoading: false
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load sessions'
          });
        }
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      clearError: () => {
        set({ error: null });
      },

      setSelectedModel: (model: string) => {
        set({ selectedModel: model });
        localStorage.setItem('selectedAiModel', model);
      }
    }),
    { name: 'chat-store' }
  )
);