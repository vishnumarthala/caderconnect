/**
 * Mock Data for Development Testing
 * This provides dummy data to test the frontend without needing a real database
 */

export interface MockPerformanceMetric {
  id: string;
  member_id: string;
  date: string;
  metric_name: string;
  metric_value: number;
  metadata: any;
}

export interface MockAlert {
  id: string;
  member_id: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  alert_type: string;
  status: 'new' | 'acknowledged' | 'resolved';
  created_at: string;
  metadata: any;
}

export interface MockDocument {
  id: string;
  filename: string;
  uploader_id: string;
  status: 'pending' | 'processed' | 'error';
  file_size: number;
  file_type: string;
  created_at: string;
  metadata: any;
}

// Generate dummy performance metrics for the last 30 days
export function generateMockMetrics(memberId: string): MockPerformanceMetric[] {
  const metrics: MockPerformanceMetric[] = [];
  const metricTypes = ['sentiment_score', 'media_mentions', 'public_engagement', 'project_completion'];
  
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    metricTypes.forEach(metricType => {
      let value: number;
      switch (metricType) {
        case 'sentiment_score':
          value = Math.random() * 1.3 - 0.5; // -0.5 to 0.8
          break;
        case 'media_mentions':
          value = Math.floor(Math.random() * 24) + 1; // 1-25
          break;
        case 'public_engagement':
          value = Math.random() * 0.6 + 0.3; // 0.3-0.9
          break;
        case 'project_completion':
          value = Math.random() * 0.5 + 0.5; // 0.5-1.0
          break;
        default:
          value = Math.random();
      }
      
      metrics.push({
        id: `metric-${memberId}-${metricType}-${i}`,
        member_id: memberId,
        date: date.toISOString().split('T')[0],
        metric_name: metricType,
        metric_value: value,
        metadata: {
          source: 'mock_data',
          confidence: Math.random() * 0.3 + 0.7
        }
      });
    });
  }
  
  return metrics;
}

export const MOCK_ALERTS: MockAlert[] = [
  {
    id: 'alert-1',
    member_id: '55555555-5555-5555-5555-555555555555',
    severity: 'high',
    title: 'Negative Media Coverage Spike',
    message: 'Unusual increase in negative media mentions detected in the last 24 hours. Sentiment score dropped by 35%. Immediate response recommended.',
    alert_type: 'media_monitoring',
    status: 'new',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: {
      affected_region: 'Delhi',
      media_sources: ['Times of India', 'NDTV', 'India Today'],
      sentiment_drop: 0.35,
      mention_count: 47,
      trending_keywords: ['policy', 'criticism', 'response']
    }
  },
  {
    id: 'alert-2',
    member_id: '66666666-6666-6666-6666-666666666666',
    severity: 'medium',
    title: 'Social Media Engagement Drop',
    message: 'Social media engagement has decreased by 28% compared to last week average. Consider increasing social media activity.',
    alert_type: 'social_media',
    status: 'acknowledged',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      affected_platforms: ['Twitter', 'Facebook', 'Instagram'],
      engagement_drop: 0.28,
      period: 'last_week',
      follower_growth: -12
    }
  },
  {
    id: 'alert-3',
    member_id: null,
    severity: 'low',
    title: 'Scheduled Policy Review Meeting',
    message: 'Monthly policy review meeting scheduled for next Tuesday. All regional leads are requested to prepare quarterly reports.',
    alert_type: 'system_notification',
    status: 'new',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    metadata: {
      meeting_date: '2024-02-15',
      participants: ['Policy Team', 'Regional Leads'],
      agenda_items: ['Healthcare Policy Update', 'Education Reforms', 'Infrastructure Projects']
    }
  },
  {
    id: 'alert-4',
    member_id: '77777777-7777-7777-7777-777777777777',
    severity: 'medium',
    title: 'Constituency Issue Trending',
    message: 'Local infrastructure concerns are gaining traction on social media. Public sentiment shows growing concern about road conditions.',
    alert_type: 'public_sentiment',
    status: 'new',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    metadata: {
      issue_type: 'infrastructure',
      sentiment_trend: 'declining',
      social_mentions: 156,
      location: 'Chennai South',
      urgency: 'medium'
    }
  },
  {
    id: 'alert-5',
    member_id: null,
    severity: 'critical',
    title: 'Security Alert - Unusual Login Activity',
    message: 'Multiple failed login attempts detected from unusual IP addresses. Security protocols have been automatically enhanced.',
    alert_type: 'security',
    status: 'resolved',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    metadata: {
      ip_addresses: ['192.168.1.100', '10.0.0.1'],
      failed_attempts: 15,
      security_action: 'IP_blocked',
      resolved_by: '11111111-1111-1111-1111-111111111111'
    }
  }
];

export const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: 'doc-1',
    filename: 'Party_Manifesto_2024.pdf',
    uploader_id: '22222222-2222-2222-2222-222222222222',
    status: 'processed',
    file_size: 2048576,
    file_type: 'pdf',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      title: 'Party Manifesto 2024',
      description: 'Complete party manifesto and policy framework',
      tags: ['manifesto', 'policy', '2024'],
      security_level: 'public',
      page_count: 45
    }
  },
  {
    id: 'doc-2',
    filename: 'North_Region_Performance_Q1.docx',
    uploader_id: '33333333-3333-3333-3333-333333333333',
    status: 'processed',
    file_size: 1024768,
    file_type: 'docx',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      title: 'Northern Region Q1 Performance Report',
      description: 'Quarterly performance analysis and metrics',
      tags: ['performance', 'north', 'Q1'],
      security_level: 'internal',
      page_count: 23
    }
  },
  {
    id: 'doc-3',
    filename: 'Media_Strategy_Guidelines.pdf',
    uploader_id: '22222222-2222-2222-2222-222222222222',
    status: 'processed',
    file_size: 512384,
    file_type: 'pdf',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      title: 'Media Communication Strategy',
      description: 'Guidelines for media interactions and public communications',
      tags: ['media', 'communication', 'strategy'],
      security_level: 'restricted',
      page_count: 18
    }
  },
  {
    id: 'doc-4',
    filename: 'Constituency_Feedback_Mumbai.txt',
    uploader_id: '66666666-6666-6666-6666-666666666666',
    status: 'processed',
    file_size: 256192,
    file_type: 'txt',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      title: 'Mumbai North Constituency Feedback',
      description: 'Citizen feedback and local issues compilation',
      tags: ['feedback', 'mumbai', 'constituency'],
      security_level: 'internal',
      page_count: 8
    }
  }
];

// Mock API responses
export const MOCK_RESPONSES = {
  sentimentAnalysis: {
    current_score: 0.65,
    trend: 'improving',
    change_24h: 0.12,
    breakdown: {
      positive: 45,
      neutral: 35,
      negative: 20
    },
    top_keywords: ['infrastructure', 'development', 'healthcare', 'education'],
    media_sources: 12
  },
  
  performanceSummary: {
    overall_score: 8.2,
    rank: 5,
    total_members: 42,
    metrics: {
      sentiment: 0.68,
      engagement: 0.72,
      completion: 0.85,
      mentions: 156
    },
    trends: {
      sentiment: 'up',
      engagement: 'stable',
      completion: 'up',
      mentions: 'down'
    }
  },
  
  aiChatResponses: [
    {
      query: 'sentiment analysis',
      response: `Based on the latest data analysis, your current public sentiment score is **0.68** (68% positive), which shows a **12% improvement** over the last 24 hours.

**Key Insights:**
• **Positive Coverage:** 45% of mentions are positive, primarily focusing on your infrastructure initiatives
• **Media Reach:** 12 major media outlets covered your recent statements
• **Trending Topics:** Healthcare policy, education reforms, and local development projects

**Recommendations:**
1. Continue emphasizing infrastructure development success stories
2. Increase social media engagement on education policy
3. Address concerns about healthcare accessibility in rural areas

The overall trend is positive, with strong public support for your development agenda.`
    },
    {
      query: 'performance report',
      response: `Here's your comprehensive performance analysis for this quarter:

**Overall Performance Score: 8.2/10** (Rank: 5/42 members)

**Key Metrics:**
• **Public Sentiment:** 68% positive (↑12% from last month)
• **Project Completion:** 85% completion rate (↑5% from target)
• **Media Engagement:** 156 mentions this month (balanced coverage)
• **Public Interaction:** 72% engagement rate in community events

**Top Achievements:**
1. Completed 3 infrastructure projects ahead of schedule
2. Successfully launched healthcare mobile clinic program
3. Increased social media following by 15%

**Areas for Improvement:**
1. Response time to constituency queries (current: 2.3 days, target: 1 day)
2. Rural outreach programs (coverage: 65%, target: 80%)

**Strategic Recommendations:**
• Focus on digital governance initiatives
• Expand rural healthcare access programs
• Increase direct citizen engagement through town halls`
    }
  ]
};

// Helper functions
export function getMockMetricsForUser(userId: string): MockPerformanceMetric[] {
  return generateMockMetrics(userId);
}

export function getMockAlertsForUser(userId: string, role: string): MockAlert[] {
  if (role === 'SuperAdmin' || role === 'PartyHead') {
    return MOCK_ALERTS; // Can see all alerts
  }
  
  return MOCK_ALERTS.filter(alert => 
    alert.member_id === userId || alert.member_id === null
  );
}

export function getMockDocumentsForUser(userId: string, role: string): MockDocument[] {
  if (role === 'SuperAdmin' || role === 'PartyHead') {
    return MOCK_DOCUMENTS; // Can see all documents
  }
  
  return MOCK_DOCUMENTS.filter(doc => 
    doc.uploader_id === userId || doc.metadata.security_level === 'public'
  );
}

export function getMockChatResponse(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('sentiment')) {
    return MOCK_RESPONSES.aiChatResponses[0].response;
  }
  
  if (lowerQuery.includes('performance') || lowerQuery.includes('report')) {
    return MOCK_RESPONSES.aiChatResponses[1].response;
  }
  
  if (lowerQuery.includes('alert') || lowerQuery.includes('issue')) {
    return `I've analyzed the current alerts and identified **${MOCK_ALERTS.length} active items** requiring attention:

**High Priority:**
• Negative media coverage spike in Delhi constituency
• Infrastructure concerns trending on social media

**Medium Priority:**
• Social media engagement decreased by 28%
• Constituency feedback compilation pending

**Recommendations:**
1. Address media concerns with immediate press statement
2. Increase social media activity and engagement
3. Schedule constituency meeting to address infrastructure issues

Would you like me to help draft responses to any of these specific issues?`;
  }
  
  return `I'm here to help with your political intelligence needs. I can assist with:

• **Sentiment Analysis** - Current public opinion and trends
• **Performance Reports** - Detailed analytics and recommendations  
• **Alert Management** - Priority issues and response strategies
• **Strategic Planning** - Data-driven policy recommendations
• **Media Monitoring** - Coverage analysis and response planning

What specific analysis would you like me to provide?`;
}