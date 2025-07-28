/**
 * SENTINEL AI CHAT API ENDPOINT
 * Secure AI chat with streaming, prompt injection protection, and comprehensive monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiSchemas } from '@/lib/validation';
import { auditLogger } from '@/lib/audit-logger';
import { config } from '@/lib/config';
import { aiProviderService } from '@/lib/ai-providers';
import { RAGSystem } from '@/lib/rag-system';
import { v4 as uuidv4 } from 'uuid';

const ragSystem = new RAGSystem();

// AI service configuration
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * POST /api/ai/chat - Send message to AI with streaming response
 * Requires: analyst role or higher
 */
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');
  const startTime = Date.now();

  try {
    // Authorization check - requires analyst role or higher
    const allowedRoles = ['admin', 'analyst', 'operator'];
    if (!allowedRoles.includes(userRole || '')) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'ai_chat',
          requiredRoles: allowedRoles,
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for AI chat' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = apiSchemas.chatMessage.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'security_violation',
        severity: 'medium',
        details: {
          type: 'validation_failed',
          operation: 'ai_chat',
          errors,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { message, conversationId, model = 'gpt-4' } = validation.data;

    // Enhanced security checks for the message
    const securityCheckResult = await performSecurityChecks(message, userId!, requestId);
    if (!securityCheckResult.passed) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'security_violation',
        severity: 'high',
        details: {
          type: 'ai_security_violation',
          operation: 'ai_chat',
          violations: securityCheckResult.violations,
          message: message.substring(0, 200), // Log first 200 chars
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { 
          error: 'Message violates security policies',
          violations: securityCheckResult.violations 
        },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation: ChatSession;
    if (conversationId) {
      conversation = await getConversation(conversationId, userId!);
      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
    } else {
      conversation = await createConversation(userId!, message);
    }

    // Add user message to conversation
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      metadata: {
        requestId,
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent'),
      },
    };

    await saveMessage(conversation.id, userMessage);

    // Check if streaming is requested
    const acceptHeader = req.headers.get('accept');
    const isStreamingRequest = acceptHeader?.includes('text/event-stream');

    if (isStreamingRequest) {
      // Return streaming response
      return handleStreamingChat(conversation, userMessage, model, userId!, requestId);
    } else {
      // Return standard JSON response
      return await handleStandardChat(conversation, userMessage, model, userId!, requestId);
    }

  } catch (error) {
    console.error('AI Chat API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'ai_chat',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'AI chat service unavailable' },
      { status: 500 }
    );
  }
}

/**
 * Perform comprehensive security checks on the user message
 */
async function performSecurityChecks(
  message: string, 
  userId: string, 
  requestId: string
): Promise<{ passed: boolean; violations: string[] }> {
  const violations: string[] = [];

  // Check for prompt injection attempts
  const promptInjectionPatterns = [
    /ignore\s+(previous|all)\s+instructions/i,
    /system\s*:\s*you\s+are/i,
    /\[INST\]/i, // Llama instruction format
    /###\s*Human:/i,
    /assistant\s*:/i,
    /jailbreak/i,
    /DAN\s*mode/i, // "Do Anything Now" mode
    /pretend\s+you\s+are/i,
    /act\s+as\s+if/i,
    /roleplay\s+as/i,
  ];

  for (const pattern of promptInjectionPatterns) {
    if (pattern.test(message)) {
      violations.push('prompt_injection_attempt');
      break;
    }
  }

  // Check for sensitive information requests
  const sensitivePatterns = [
    /password|secret|key|token/i,
    /credit\s+card|ssn|social\s+security/i,
    /bank\s+account|routing\s+number/i,
    /personal\s+information|pii/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(message)) {
      violations.push('sensitive_information_request');
      break;
    }
  }

  // Check for attempts to access system information
  const systemPatterns = [
    /\/etc\/passwd|\/proc\/|\/sys\//i,
    /cmd\.exe|powershell|bash|sh\s/i,
    /SELECT\s+\*\s+FROM|DROP\s+TABLE/i,
    /eval\s*\(|exec\s*\(/i,
  ];

  for (const pattern of systemPatterns) {
    if (pattern.test(message)) {
      violations.push('system_access_attempt');
      break;
    }
  }

  // Check message length for potential DoS
  if (message.length > 10000) {
    violations.push('excessive_message_length');
  }

  // Check for repetitive patterns (potential spam/DoS)
  const words = message.toLowerCase().split(/\s+/);
  const wordCount = new Map<string, number>();
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }

  const maxWordFrequency = Math.max(...wordCount.values());
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

  if (maxWordFrequency > words.length * 0.3 && avgWordLength < 10) {
    violations.push('repetitive_content');
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Handle streaming chat response
 */
function handleStreamingChat(
  conversation: ChatSession,
  userMessage: ChatMessage,
  model: string,
  userId: string,
  requestId: string
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Build message history for AI service
        const messages = [
          {
            role: 'system' as const,
            content: aiToolsService.getSystemPromptWithTools()
          },
          // Add conversation history (last 10 messages for context)
          ...conversation.messages.slice(-10).map(msg => ({
            role: msg.role === 'ai' ? 'assistant' as const : msg.role as 'user' | 'assistant',
            content: msg.content
          })),
          {
            role: 'user' as const,
            content: userMessage.content
          }
        ];
        
        // Create assistant message
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          metadata: {
            model,
            requestId,
          },
        };

        let fullContent = '';

        try {
          // Stream AI response
          for await (const chunk of aiProviderService.generateStreamResponse(messages, model)) {
            fullContent += chunk;
            assistantMessage.content = fullContent;

            const sseData = `data: ${JSON.stringify({
              id: assistantMessage.id,
              content: fullContent,
              finished: false,
            })}\n\n`;

            controller.enqueue(encoder.encode(sseData));
          }

          // Send final message
          const finalData = `data: ${JSON.stringify({
            id: assistantMessage.id,
            content: fullContent,
            finished: true,
          })}\n\n`;

          controller.enqueue(encoder.encode(finalData));

          // Save complete assistant message
          assistantMessage.content = fullContent;
          await saveMessage(conversation.id, assistantMessage);

          // Log successful AI interaction
          await auditLogger.logAuditEvent({
            userId,
            action: 'create',
            resourceType: 'ai_chat',
            resourceId: conversation.id,
            success: true,
            additionalData: {
              operation: 'ai_chat_streaming',
              model,
              messageLength: userMessage.content.length,
              responseLength: fullContent.length,
              conversationId: conversation.id,
            },
            requestId,
          });

        } catch (error) {
          console.error('Streaming AI error:', error);
          // Send fallback response
          const fallbackContent = "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.";
          assistantMessage.content = fallbackContent;
          
          const errorData = `data: ${JSON.stringify({
            id: assistantMessage.id,
            content: fallbackContent,
            finished: true,
          })}\n\n`;

          controller.enqueue(encoder.encode(errorData));
          await saveMessage(conversation.id, assistantMessage);
        }

        controller.close();

      } catch (error) {
        console.error('Streaming error:', error);
        const errorData = `data: ${JSON.stringify({
          error: 'AI service error',
          finished: true,
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': config.api.corsOrigins[0] || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Handle standard (non-streaming) chat response
 */
async function handleStandardChat(
  conversation: ChatSession,
  userMessage: ChatMessage,
  model: string,
  userId: string,
  requestId: string
): Promise<NextResponse> {
  try {
    // Generate AI response
    const aiResponse = await generateAIResponse(conversation, userMessage, model);

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      metadata: {
        model,
        requestId,
      },
    };

    // Save assistant message
    await saveMessage(conversation.id, assistantMessage);

    // Log successful AI interaction
    await auditLogger.logAuditEvent({
      userId,
      action: 'create',
      resourceType: 'ai_chat',
      resourceId: conversation.id,
      success: true,
      additionalData: {
        operation: 'ai_chat_standard',
        model,
        messageLength: userMessage.content.length,
        responseLength: aiResponse.length,
        conversationId: conversation.id,
      },
      requestId,
    });

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation.id,
        message: assistantMessage,
        usage: {
          model,
          tokensUsed: Math.ceil((userMessage.content.length + aiResponse.length) / 4), // Rough estimate
        },
      },
    });

  } catch (error) {
    console.error('Standard chat error:', error);
    throw error;
  }
}

/**
 * Generate AI response using the selected model
 */
async function generateAIResponse(
  conversation: ChatSession,
  userMessage: ChatMessage,
  model: string
): Promise<string> {
  // Build message history for context
  const messages = [
    {
      role: 'system' as const,
      content: aiToolsService.getSystemPromptWithTools()
    },
    // Add conversation history (last 10 messages for context)
    ...conversation.messages.slice(-10).map(msg => ({
      role: msg.role === 'ai' ? 'assistant' as const : msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user' as const,
      content: userMessage.content
    }
  ];

  try {
    // Use tools for enhanced capabilities
    const response = await aiProviderService.generateResponse(messages, model, AVAILABLE_TOOLS);
    
    // Handle tool calls if present
    if (response.toolCalls && response.toolCalls.length > 0) {
      let finalContent = response.content || '';
      
      for (const toolCall of response.toolCalls) {
        try {
          const toolResult = await aiToolsService.executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            userMessage.metadata?.userId
          );
          
          if (toolResult.success) {
            if (toolCall.function.name === 'execute_code') {
              finalContent += `\n\n**Code Execution Result:**\n${toolResult.result.output}`;
              if (toolResult.result.plots && toolResult.result.plots.length > 0) {
                finalContent += `\n\nGenerated ${toolResult.result.plots.length} visualization(s).`;
              }
            } else if (toolCall.function.name === 'search_web') {
              const results = toolResult.result.slice(0, 3);
              finalContent += `\n\n**Web Search Results:**\n` + 
                results.map((r: any) => `• [${r.title}](${r.url}): ${r.snippet}`).join('\n');
            } else if (toolCall.function.name === 'search_documents') {
              if (toolResult.result.length > 0) {
                finalContent += `\n\n**From your documents:**\n` + 
                  toolResult.result.map((r: any) => `• ${r.content.substring(0, 200)}...`).join('\n');
              }
            }
          } else {
            finalContent += `\n\n*Tool execution failed: ${toolResult.error}*`;
          }
        } catch (toolError) {
          console.error('Tool execution error:', toolError);
          finalContent += `\n\n*Tool execution error occurred*`;
        }
      }
      
      return finalContent;
    }
    
    return response.content;
  } catch (error) {
    console.error('AI provider error:', error);
    // Fallback response
    return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment or contact support if the issue persists.";
  }
}

/**
 * Get existing conversation
 */
async function getConversation(conversationId: string, userId: string): Promise<ChatSession | null> {
  // This would typically fetch from a conversations table
  // For now, return a mock conversation
  return {
    id: conversationId,
    userId,
    title: 'Political Intelligence Chat',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create new conversation
 */
async function createConversation(userId: string, firstMessage: string): Promise<ChatSession> {
  const conversationId = uuidv4();
  
  // Generate title from first message
  const title = firstMessage.length > 50 
    ? firstMessage.substring(0, 47) + '...'
    : firstMessage;

  return {
    id: conversationId,
    userId,
    title,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Save message to conversation
 */
async function saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
  // In production, save to database
  // For now, just log the message
  console.log(`Saving message to conversation ${conversationId}:`, {
    id: message.id,
    role: message.role,
    contentLength: message.content.length,
    timestamp: message.timestamp,
  });
}

/**
 * Handle unsupported methods
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

/**
 * Get client IP address from request
 */
function getClientIP(req: NextRequest): string {
  const forwardedFor = req.headers.get('X-Forwarded-For');
  const realIP = req.headers.get('X-Real-IP');
  const cfConnectingIP = req.headers.get('CF-Connecting-IP');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return req.ip || '127.0.0.1';
}