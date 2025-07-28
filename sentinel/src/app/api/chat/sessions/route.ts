/**
 * Chat Sessions API endpoint
 * Provides mock chat session data for development
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Mock chat sessions data
const mockSessions = [
  {
    id: 'session-1',
    userId: 'dev-user-id',
    title: 'Policy Analysis Discussion',
    messages: [
      {
        id: 'msg-1',
        content: 'Can you help me analyze the new healthcare policy?',
        sender: 'user',
        timestamp: new Date(Date.now() - 3600000),
        userId: 'dev-user-id'
      }
    ],
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3600000),
    isActive: true
  },
  {
    id: 'session-2', 
    userId: 'dev-user-id',
    title: 'Speech Writing Assistant',
    messages: [
      {
        id: 'msg-2',
        content: 'Draft a speech about infrastructure development',
        sender: 'user',
        timestamp: new Date(Date.now() - 7200000),
        userId: 'dev-user-id'
      }
    ],
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(Date.now() - 7200000),
    isActive: true
  },
  {
    id: 'session-3',
    userId: 'dev-user-id',
    title: 'Constituency Feedback Analysis',
    messages: [
      {
        id: 'msg-3',
        content: 'Analyze the sentiment from recent town halls',
        sender: 'user',
        timestamp: new Date(Date.now() - 86400000),
        userId: 'dev-user-id'
      }
    ],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
    isActive: true
  }
];

export async function GET(request: NextRequest) {
  // Return mock chat sessions
  return NextResponse.json(mockSessions);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title } = body;

    // Create new mock session
    const newSession = {
      id: uuidv4(),
      userId: 'dev-user-id',
      title: title || 'New Chat Session',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    return NextResponse.json(newSession);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}