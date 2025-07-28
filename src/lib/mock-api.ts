/**
 * Mock API Service for Development Testing
 * Simulates backend API responses with realistic data
 */

import { 
  MOCK_ALERTS, 
  MOCK_DOCUMENTS, 
  getMockMetricsForUser, 
  getMockAlertsForUser, 
  getMockDocumentsForUser,
  getMockChatResponse,
  MOCK_RESPONSES 
} from './mock-data';

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

export class MockAPI {
  // Dashboard Analytics
  static async getDashboardAnalytics(userId: string, role: string) {
    await delay();
    
    const metrics = getMockMetricsForUser(userId);
    const alerts = getMockAlertsForUser(userId, role);
    
    // Calculate summary stats
    const recentSentiment = metrics
      .filter(m => m.metric_name === 'sentiment_score')
      .slice(0, 7) // Last 7 days
      .reduce((acc, m) => acc + m.metric_value, 0) / 7;
    
    const totalMentions = metrics
      .filter(m => m.metric_name === 'media_mentions')
      .slice(0, 7)
      .reduce((acc, m) => acc + m.metric_value, 0);
    
    return {
      success: true,
      data: {
        summary: {
          sentiment_score: Math.round(recentSentiment * 100) / 100,
          media_mentions: Math.floor(totalMentions),
          active_alerts: alerts.filter(a => a.status === 'new').length,
          engagement_rate: Math.round(Math.random() * 30 + 60) // 60-90%
        },
        charts: {
          sentiment_trend: metrics
            .filter(m => m.metric_name === 'sentiment_score')
            .slice(0, 14)
            .reverse()
            .map(m => ({
              date: m.date,
              value: Math.round(m.metric_value * 100) / 100
            })),
          media_mentions: metrics
            .filter(m => m.metric_name === 'media_mentions')
            .slice(0, 14)
            .reverse()
            .map(m => ({
              date: m.date,
              value: Math.floor(m.metric_value)
            }))
        },
        recent_alerts: alerts.slice(0, 5),
        performance_metrics: {
          public_engagement: Math.round(Math.random() * 20 + 70), // 70-90
          project_completion: Math.round(Math.random() * 15 + 80), // 80-95
          media_sentiment: Math.round(recentSentiment * 100),
          social_reach: Math.floor(Math.random() * 5000 + 10000) // 10k-15k
        }
      }
    };
  }

  // AI Chat
  static async sendChatMessage(message: string, userId: string, conversationId?: string) {
    await delay(800); // Simulate AI processing time
    
    const response = getMockChatResponse(message);
    
    return {
      success: true,
      data: {
        conversationId: conversationId || `conv-${Date.now()}`,
        message: {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
          sources: [
            { type: 'internal', source: 'Performance Database', relevance: 0.95 },
            { type: 'web', source: 'Recent Media Analysis', relevance: 0.87 },
            { type: 'internal', source: 'Constituency Feedback', relevance: 0.82 }
          ]
        },
        usage: {
          model: 'gpt-4',
          tokensUsed: 150 + Math.floor(Math.random() * 100)
        }
      }
    };
  }

  // Alerts Management
  static async getAlerts(userId: string, role: string, filters?: any) {
    await delay();
    
    let alerts = getMockAlertsForUser(userId, role);
    
    // Apply filters
    if (filters?.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters?.status) {
      alerts = alerts.filter(a => a.status === filters.status);
    }
    
    return {
      success: true,
      data: {
        alerts,
        total: alerts.length,
        unread: alerts.filter(a => a.status === 'new').length
      }
    };
  }

  static async updateAlertStatus(alertId: string, status: string) {
    await delay(200);
    
    return {
      success: true,
      data: {
        id: alertId,
        status,
        updated_at: new Date().toISOString()
      }
    };
  }

  // Documents
  static async getDocuments(userId: string, role: string) {
    await delay();
    
    const documents = getMockDocumentsForUser(userId, role);
    
    return {
      success: true,
      data: {
        documents,
        total: documents.length,
        storage_used: documents.reduce((acc, doc) => acc + doc.file_size, 0)
      }
    };
  }

  static async uploadDocument(file: File, userId: string) {
    await delay(1000); // Simulate upload time
    
    const document = {
      id: `doc-${Date.now()}`,
      filename: file.name,
      uploader_id: userId,
      status: 'processing' as const,
      file_size: file.size,
      file_type: file.type,
      created_at: new Date().toISOString(),
      metadata: {
        title: file.name.replace(/\.[^/.]+$/, ""),
        description: 'Uploaded document',
        tags: ['uploaded'],
        security_level: 'internal'
      }
    };
    
    // Simulate processing completion after a delay
    setTimeout(() => {
      document.status = 'processed';
    }, 2000);
    
    return {
      success: true,
      data: document
    };
  }

  // Performance Metrics
  static async getPerformanceMetrics(userId: string, timeframe: string = 'last_month') {
    await delay();
    
    const metrics = getMockMetricsForUser(userId);
    let filteredMetrics = metrics;
    
    // Filter by timeframe
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeframe) {
      case 'last_week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'last_month':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case 'last_quarter':
        cutoffDate.setDate(now.getDate() - 90);
        break;
    }
    
    filteredMetrics = metrics.filter(m => new Date(m.date) >= cutoffDate);
    
    return {
      success: true,
      data: {
        metrics: filteredMetrics,
        summary: MOCK_RESPONSES.performanceSummary,
        charts: {
          sentiment: filteredMetrics
            .filter(m => m.metric_name === 'sentiment_score')
            .map(m => ({ date: m.date, value: m.metric_value })),
          engagement: filteredMetrics
            .filter(m => m.metric_name === 'public_engagement')
            .map(m => ({ date: m.date, value: m.metric_value })),
          completion: filteredMetrics
            .filter(m => m.metric_name === 'project_completion')
            .map(m => ({ date: m.date, value: m.metric_value })),
          mentions: filteredMetrics
            .filter(m => m.metric_name === 'media_mentions')
            .map(m => ({ date: m.date, value: m.metric_value }))
        }
      }
    };
  }

  // User Management (SuperAdmin only)
  static async getUsers() {
    await delay();
    
    // Return the dev users as if they were from database
    const users = [
      { id: '11111111-1111-1111-1111-111111111111', email: 'admin@party.com', name: 'System Administrator', role: 'SuperAdmin', status: 'active' },
      { id: '22222222-2222-2222-2222-222222222222', email: 'leader@party.com', name: 'Party National Leader', role: 'PartyHead', status: 'active' },
      { id: '33333333-3333-3333-3333-333333333333', email: 'north.lead@party.com', name: 'Northern Region Lead', role: 'RegionalLead', status: 'active' },
      { id: '44444444-4444-4444-4444-444444444444', email: 'south.lead@party.com', name: 'Southern Region Lead', role: 'RegionalLead', status: 'active' },
      { id: '55555555-5555-5555-5555-555555555555', email: 'mp.delhi@party.com', name: 'Raj Kumar Singh', role: 'Member', status: 'active' },
      { id: '66666666-6666-6666-6666-666666666666', email: 'mla.mumbai@party.com', name: 'Priya Sharma', role: 'Member', status: 'active' },
      { id: '77777777-7777-7777-7777-777777777777', email: 'mp.chennai@party.com', name: 'Arjun Reddy', role: 'Member', status: 'active' },
      { id: '88888888-8888-8888-8888-888888888888', email: 'worker1@party.com', name: 'Amit Patel', role: 'Karyakartha', status: 'active' },
      { id: '99999999-9999-9999-9999-999999999999', email: 'worker2@party.com', name: 'Sunita Devi', role: 'Karyakartha', status: 'active' }
    ];
    
    return {
      success: true,
      data: {
        users,
        total: users.length,
        by_role: {
          SuperAdmin: 1,
          PartyHead: 1,
          RegionalLead: 2,
          Member: 3,
          Karyakartha: 2
        }
      }
    };
  }

  // Sandbox Code Execution
  static async executeSandboxCode(query: string, code?: string) {
    await delay(1500); // Simulate code execution time
    
    // Generate mock chart data or analysis based on query
    const result = {
      success: true,
      execution_time: Math.floor(Math.random() * 1000 + 500),
      output: `Analysis completed successfully!\n\nQuery: "${query}"\n\nGenerated insights based on your data.`,
      images: [] as string[],
      data: []
    };
    
    if (query.toLowerCase().includes('chart') || query.toLowerCase().includes('graph')) {
      // Mock base64 chart image (you could generate real charts here)
      result.images = ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==']; // 1x1 transparent pixel
      result.output += '\n\nChart generated successfully! See visualization above.';
    }
    
    if (query.toLowerCase().includes('data') || query.toLowerCase().includes('table')) {
      result.data = [
        {
          type: 'dataframe',
          title: 'Analysis Results',
          data: [
            { metric: 'Sentiment Score', value: 0.68, trend: 'up' },
            { metric: 'Media Mentions', value: 156, trend: 'stable' },
            { metric: 'Engagement Rate', value: 0.72, trend: 'down' },
            { metric: 'Project Completion', value: 0.85, trend: 'up' }
          ],
          columns: ['metric', 'value', 'trend']
        }
      ];
      result.output += '\n\nData analysis completed! See table above for detailed results.';
    }
    
    return {
      success: true,
      data: {
        execution_id: `exec_${Date.now()}`,
        result,
        generated_code: code || `# Generated code for: ${query}\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n# Your analysis code would be here\nprint("Analysis completed!")`,
        metadata: {
          execution_type: 'mock',
          timestamp: new Date().toISOString()
        }
      }
    };
  }
}