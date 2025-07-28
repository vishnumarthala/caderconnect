/**
 * SENTINEL DASHBOARD ANALYTICS API
 * Secure analytics data with comprehensive access controls and data protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from '@/lib/audit-logger';
import { config } from '@/lib/config';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Analytics query validation schema
const analyticsQuerySchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d', '90d']).default('24h'),
  metrics: z.array(z.enum([
    'user_activity',
    'security_events',
    'api_usage',
    'file_uploads',
    'alert_counts',
    'system_performance',
    'threat_indicators'
  ])).min(1),
  groupBy: z.enum(['hour', 'day', 'week']).optional(),
  filters: z.object({
    userId: z.string().uuid().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    category: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
});

interface AnalyticsData {
  timestamp: string;
  metric: string;
  value: number;
  dimensions?: Record<string, any>;
}

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  securityEvents: number;
  criticalAlerts: number;
  apiRequests: number;
  filesUploaded: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * GET /api/dashboard/analytics - Get dashboard analytics data
 * Requires: analyst role or higher
 */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');

  try {
    // Authorization check - requires analyst role or higher
    const allowedRoles = ['admin', 'analyst'];
    if (!allowedRoles.includes(userRole || '')) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'dashboard_analytics',
          requiredRoles: allowedRoles,
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for analytics data' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = {
      timeRange: url.searchParams.get('timeRange') || '24h',
      metrics: url.searchParams.get('metrics')?.split(',') || ['user_activity', 'security_events'],
      groupBy: url.searchParams.get('groupBy') || undefined,
      filters: {
        userId: url.searchParams.get('userId') || undefined,
        severity: url.searchParams.get('severity') || undefined,
        category: url.searchParams.get('category') || undefined,
        source: url.searchParams.get('source') || undefined,
      },
    };

    const validation = analyticsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        { error: 'Invalid query parameters', details: errors },
        { status: 400 }
      );
    }

    const { timeRange, metrics, groupBy, filters } = validation.data;

    // Calculate time bounds
    const timeBounds = getTimeBounds(timeRange);

    // Get analytics data
    const analyticsData = await Promise.all(
      metrics.map(metric => getMetricData(metric, timeBounds, groupBy, filters, userRole!))
    );

    // Get dashboard summary
    const dashboardSummary = await getDashboardSummary(timeBounds, userRole!);

    // Log analytics access
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'read',
      resourceType: 'analytics',
      success: true,
      additionalData: {
        operation: 'dashboard_analytics',
        timeRange,
        metrics,
        hasFilters: Object.values(filters || {}).some(v => v !== undefined),
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    const response = {
      success: true,
      data: {
        summary: dashboardSummary,
        metrics: analyticsData.reduce((acc, data, index) => {
          acc[metrics[index]] = data;
          return acc;
        }, {} as Record<string, any>),
        timeRange,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Dashboard analytics API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'dashboard_analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'Analytics service unavailable' },
      { status: 500 }
    );
  }
}

/**
 * Calculate time bounds based on time range
 */
function getTimeBounds(timeRange: string): { start: Date; end: Date; intervalMs: number } {
  const end = new Date();
  let start: Date;
  let intervalMs: number;

  switch (timeRange) {
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000);
      intervalMs = 5 * 60 * 1000; // 5 minutes
      break;
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      intervalMs = 60 * 60 * 1000; // 1 hour
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      intervalMs = 6 * 60 * 60 * 1000; // 6 hours
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      intervalMs = 24 * 60 * 60 * 1000; // 1 day
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      intervalMs = 24 * 60 * 60 * 1000; // 1 day
      break;
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      intervalMs = 60 * 60 * 1000;
  }

  return { start, end, intervalMs };
}

/**
 * Get metric data with role-based filtering
 */
async function getMetricData(
  metric: string,
  timeBounds: { start: Date; end: Date; intervalMs: number },
  groupBy?: string,
  filters?: any,
  userRole: string = 'viewer'
): Promise<AnalyticsData[]> {
  const { start, end } = timeBounds;

  switch (metric) {
    case 'user_activity':
      return getUserActivityData(start, end, filters, userRole);
    
    case 'security_events':
      return getSecurityEventsData(start, end, filters, userRole);
    
    case 'api_usage':
      return getApiUsageData(start, end, filters, userRole);
    
    case 'file_uploads':
      return getFileUploadsData(start, end, filters, userRole);
    
    case 'alert_counts':
      return getAlertCountsData(start, end, filters, userRole);
    
    case 'system_performance':
      return getSystemPerformanceData(start, end, filters, userRole);
    
    case 'threat_indicators':
      return getThreatIndicatorsData(start, end, filters, userRole);
    
    default:
      return [];
  }
}

/**
 * Get user activity data
 */
async function getUserActivityData(
  start: Date,
  end: Date,
  filters?: any,
  userRole: string = 'viewer'
): Promise<AnalyticsData[]> {
  try {
    // Build query based on role permissions
    let query = supabaseAdmin
      .from('audit_logs')
      .select('created_at, action, user_id')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .in('action', ['login_success', 'logout', 'create', 'update', 'read']);

    // Apply filters
    if (filters?.userId && userRole === 'admin') {
      query = query.eq('user_id', filters.userId);
    }

    const { data, error } = await query.limit(10000);

    if (error) {
      console.error('User activity query error:', error);
      return [];
    }

    // Aggregate data by hour
    const hourlyData = new Map<string, number>();
    
    data?.forEach(record => {
      const hour = new Date(record.created_at).getHours();
      const dateKey = new Date(record.created_at).toISOString().split('T')[0] + `T${hour.toString().padStart(2, '0')}:00:00.000Z`;
      hourlyData.set(dateKey, (hourlyData.get(dateKey) || 0) + 1);
    });

    return Array.from(hourlyData.entries()).map(([timestamp, value]) => ({
      timestamp,
      metric: 'user_activity',
      value,
      dimensions: { type: 'hourly_activity' },
    }));

  } catch (error) {
    console.error('User activity data error:', error);
    return [];
  }
}

/**
 * Get security events data
 */
async function getSecurityEventsData(
  start: Date,
  end: Date,
  filters?: any,
  userRole: string = 'viewer'
): Promise<AnalyticsData[]> {
  try {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('created_at, action, additional_data')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .in('action', ['security_violation', 'permission_denied', 'failed_login', 'rate_limit_exceeded']);

    // Apply severity filter if provided
    if (filters?.severity) {
      // This would typically filter by a severity field in the audit logs
      // For now, we'll simulate it
    }

    const { data, error } = await query.limit(5000);

    if (error) {
      console.error('Security events query error:', error);
      return [];
    }

    // Aggregate by severity and time
    const eventCounts = new Map<string, { [key: string]: number }>();
    
    data?.forEach(record => {
      const hour = new Date(record.created_at).getHours();
      const dateKey = new Date(record.created_at).toISOString().split('T')[0] + `T${hour.toString().padStart(2, '0')}:00:00.000Z`;
      
      if (!eventCounts.has(dateKey)) {
        eventCounts.set(dateKey, { low: 0, medium: 0, high: 0, critical: 0 });
      }
      
      // Simulate severity classification based on action
      let severity = 'medium';
      if (record.action === 'security_violation') severity = 'high';
      if (record.action === 'failed_login') severity = 'medium';
      if (record.action === 'permission_denied') severity = 'low';
      
      const counts = eventCounts.get(dateKey)!;
      counts[severity as keyof typeof counts]++;
    });

    const result: AnalyticsData[] = [];
    eventCounts.forEach((counts, timestamp) => {
      Object.entries(counts).forEach(([severity, count]) => {
        result.push({
          timestamp,
          metric: 'security_events',
          value: count,
          dimensions: { severity },
        });
      });
    });

    return result;

  } catch (error) {
    console.error('Security events data error:', error);
    return [];
  }
}

/**
 * Get API usage data
 */
async function getApiUsageData(
  start: Date,
  end: Date,
  filters?: any,
  userRole: string = 'viewer'
): Promise<AnalyticsData[]> {
  try {
    // For demonstration, we'll generate sample API usage data
    // In production, this would query actual API usage logs
    const data: AnalyticsData[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const baseValue = Math.floor(Math.random() * 100) + 50;
      data.push({
        timestamp: current.toISOString(),
        metric: 'api_usage',
        value: baseValue,
        dimensions: { endpoint_type: 'general' },
      });
      
      current.setHours(current.getHours() + 1);
    }

    return data;

  } catch (error) {
    console.error('API usage data error:', error);
    return [];
  }
}

/**
 * Get file uploads data
 */
async function getFileUploadsData(
  start: Date,
  end: Date,
  filters?: any,
  userRole: string = 'viewer'
): Promise<AnalyticsData[]> {
  try {
    let query = supabaseAdmin
      .from('documents')
      .select('created_at, file_size, status')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const { data, error } = await query;

    if (error) {
      console.error('File uploads query error:', error);
      return [];
    }

    // Aggregate by day
    const dailyData = new Map<string, { count: number; totalSize: number }>();
    
    data?.forEach(record => {
      const dateKey = new Date(record.created_at).toISOString().split('T')[0];
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { count: 0, totalSize: 0 });
      }
      
      const dayData = dailyData.get(dateKey)!;
      dayData.count++;
      dayData.totalSize += record.file_size || 0;
    });

    const result: AnalyticsData[] = [];
    dailyData.forEach(({ count, totalSize }, date) => {
      result.push({
        timestamp: date + 'T00:00:00.000Z',
        metric: 'file_uploads',
        value: count,
        dimensions: { type: 'count' },
      });
      result.push({
        timestamp: date + 'T00:00:00.000Z',
        metric: 'file_uploads',
        value: totalSize,
        dimensions: { type: 'total_size' },
      });
    });

    return result;

  } catch (error) {
    console.error('File uploads data error:', error);
    return [];
  }
}

/**
 * Get alert counts data
 */
async function getAlertCountsData(
  start: Date,
  end: Date,
  filters?: any,
  userRole: string = 'viewer'
): Promise<AnalyticsData[]> {
  try {
    let query = supabaseAdmin
      .from('alerts')
      .select('created_at, severity, status')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Alert counts query error:', error);
      return [];
    }

    // Aggregate by severity and status
    const alertData = new Map<string, Map<string, number>>();
    
    data?.forEach(record => {
      const dateKey = new Date(record.created_at).toISOString().split('T')[0];
      if (!alertData.has(dateKey)) {
        alertData.set(dateKey, new Map());
      }
      
      const dayData = alertData.get(dateKey)!;
      const key = `${record.severity}_${record.status}`;
      dayData.set(key, (dayData.get(key) || 0) + 1);
    });

    const result: AnalyticsData[] = [];
    alertData.forEach((dayData, date) => {
      dayData.forEach((count, key) => {
        const [severity, status] = key.split('_');
        result.push({
          timestamp: date + 'T00:00:00.000Z',
          metric: 'alert_counts',
          value: count,
          dimensions: { severity, status },
        });
      });
    });

    return result;

  } catch (error) {
    console.error('Alert counts data error:', error);
    return [];
  }
}

/**
 * Get system performance data
 */
async function getSystemPerformanceData(
  start: Date,
  end: Date,
  filters?: any,
  userRole: string = 'viewer'
): Promise<AnalyticsData[]> {
  try {
    const query = supabaseAdmin
      .from('performance_metrics')
      .select('*')
      .gte('collected_at', start.toISOString())
      .lte('collected_at', end.toISOString());

    const { data, error } = await query;

    if (error) {
      console.error('Performance metrics query error:', error);
      return [];
    }

    return data?.map(record => ({
      timestamp: record.collected_at,
      metric: 'system_performance',
      value: record.metric_value,
      dimensions: {
        name: record.metric_name,
        unit: record.metric_unit,
        ...record.dimensions,
      },
    })) || [];

  } catch (error) {
    console.error('System performance data error:', error);
    return [];
  }
}

/**
 * Get threat indicators data
 */
async function getThreatIndicatorsData(
  start: Date,
  end: Date,
  filters?: any,
  userRole: string = 'viewer'
): Promise<AnalyticsData[]> {
  try {
    // For demonstration, generate sample threat indicator data
    // In production, this would integrate with threat intelligence feeds
    const data: AnalyticsData[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const threatLevel = Math.floor(Math.random() * 4) + 1; // 1-4 threat level
      data.push({
        timestamp: current.toISOString(),
        metric: 'threat_indicators',
        value: threatLevel,
        dimensions: { 
          type: 'composite_threat_score',
          sources: ['intel_feed_1', 'intel_feed_2'] 
        },
      });
      
      current.setDate(current.getDate() + 1);
    }

    return data;

  } catch (error) {
    console.error('Threat indicators data error:', error);
    return [];
  }
}

/**
 * Get dashboard summary metrics
 */
async function getDashboardSummary(
  timeBounds: { start: Date; end: Date },
  userRole: string
): Promise<DashboardMetrics> {
  try {
    const { start, end } = timeBounds;

    // Get user counts
    const { data: userStats } = await supabaseAdmin
      .from('users')
      .select('id, is_active, last_login')
      .eq('is_active', true);

    const totalUsers = userStats?.length || 0;
    const activeUsers = userStats?.filter(user => 
      user.last_login && new Date(user.last_login) >= start
    ).length || 0;

    // Get security events count
    const { data: securityEvents } = await supabaseAdmin
      .from('audit_logs')
      .select('id')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .in('action', ['security_violation', 'permission_denied']);

    // Get critical alerts count
    const { data: criticalAlerts } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('severity', 'critical')
      .eq('status', 'active');

    // Get API requests count (simulated)
    const apiRequests = Math.floor(Math.random() * 10000) + 5000;

    // Get files uploaded count
    const { data: filesUploaded } = await supabaseAdmin
      .from('documents')
      .select('id')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Determine system health
    const criticalAlertCount = criticalAlerts?.length || 0;
    const securityEventCount = securityEvents?.length || 0;
    
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlertCount > 0 || securityEventCount > 100) {
      systemHealth = 'critical';
    } else if (securityEventCount > 50) {
      systemHealth = 'warning';
    }

    // Determine threat level
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalAlertCount > 5) {
      threatLevel = 'critical';
    } else if (criticalAlertCount > 0 || securityEventCount > 50) {
      threatLevel = 'high';
    } else if (securityEventCount > 20) {
      threatLevel = 'medium';
    }

    return {
      totalUsers,
      activeUsers,
      securityEvents: securityEventCount,
      criticalAlerts: criticalAlertCount,
      apiRequests,
      filesUploaded: filesUploaded?.length || 0,
      systemHealth,
      threatLevel,
    };

  } catch (error) {
    console.error('Dashboard summary error:', error);
    
    // Return safe defaults on error
    return {
      totalUsers: 0,
      activeUsers: 0,
      securityEvents: 0,
      criticalAlerts: 0,
      apiRequests: 0,
      filesUploaded: 0,
      systemHealth: 'warning',
      threatLevel: 'medium',
    };
  }
}

/**
 * Handle unsupported methods
 */
export async function POST() {
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