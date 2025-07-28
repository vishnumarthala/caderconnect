/**
 * SENTINEL ALERT MANAGEMENT API
 * Secure alert system with role-based access and comprehensive tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiSchemas } from '@/lib/validation';
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

// Alert query validation schema
const alertQuerySchema = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved', 'escalated']).optional(),
  category: z.string().max(50).optional(),
  assignedTo: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'severity', 'status']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/alerts - List alerts with filtering and pagination
 * Requires: operator role or higher
 */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');

  try {
    // In development mode, return mock data
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      const mockAlerts = [
        {
          id: 'alert-1',
          title: 'High Media Activity Detected',
          description: 'Unusual spike in media mentions detected for Delhi constituency. Requires immediate attention.',
          severity: 'high',
          status: 'active',
          category: 'media_monitoring',
          created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          updated_at: new Date(Date.now() - 7200000).toISOString(),
          assignedUser: { id: 'user-1', first_name: 'John', last_name: 'Doe', email: 'john@party.com' },
          createdUser: { id: 'system', first_name: 'System', last_name: 'Monitor', email: 'system@party.com' }
        },
        {
          id: 'alert-2',
          title: 'Policy Review Meeting',
          description: 'Monthly policy review meeting scheduled for next week. All regional leads required to attend.',
          severity: 'medium',
          status: 'active',
          category: 'scheduling',
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          assignedUser: null,
          createdUser: { id: 'admin-1', first_name: 'Admin', last_name: 'User', email: 'admin@party.com' }
        },
        {
          id: 'alert-3',
          title: 'System Maintenance',
          description: 'Scheduled system maintenance will occur this weekend. Platform will be unavailable for 2 hours.',
          severity: 'low',
          status: 'acknowledged',
          category: 'system',
          created_at: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
          updated_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
          assignedUser: { id: 'admin-1', first_name: 'Admin', last_name: 'User', email: 'admin@party.com' },
          createdUser: { id: 'system', first_name: 'System', last_name: 'Monitor', email: 'system@party.com' }
        }
      ];

      return NextResponse.json({
        success: true,
        data: mockAlerts,
        pagination: {
          page: 1,
          limit: 20,
          total: mockAlerts.length,
          totalPages: 1,
        },
        filters: {},
      });
    }

    // Authorization check - requires operator role or higher
    const allowedRoles = ['admin', 'analyst', 'operator'];
    if (!allowedRoles.includes(userRole || '')) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'list_alerts',
          requiredRoles: allowedRoles,
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for alert access' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20'),
      severity: url.searchParams.get('severity') as any,
      status: url.searchParams.get('status') as any,
      category: url.searchParams.get('category') || undefined,
      assignedTo: url.searchParams.get('assignedTo') || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
      sortBy: url.searchParams.get('sortBy') as any || 'created_at',
      sortOrder: url.searchParams.get('sortOrder') as any || 'desc',
    };

    const validation = alertQuerySchema.safeParse(queryParams);
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

    const { 
      page, 
      limit, 
      severity, 
      status, 
      category, 
      assignedTo, 
      dateFrom, 
      dateTo, 
      sortBy, 
      sortOrder 
    } = validation.data;

    const offset = (page - 1) * limit;

    // Build query with joins for user information
    let query = supabaseAdmin
      .from('alerts')
      .select(`
        *,
        assigned_user:assigned_to(id, first_name, last_name, email),
        created_user:created_by(id, first_name, last_name, email),
        acknowledged_user:acknowledged_by(id, first_name, last_name, email),
        resolved_user:resolved_by(id, first_name, last_name, email)
      `, { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (severity) {
      query = query.eq('severity', severity);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Role-based filtering
    if (userRole === 'operator') {
      // Operators can only see alerts assigned to them or unassigned
      query = query.or(`assigned_to.eq.${userId},assigned_to.is.null`);
    }

    const { data: alerts, error, count } = await query;

    if (error) {
      console.error('Alerts query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      );
    }

    // Log successful access
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'read',
      resourceType: 'alerts',
      success: true,
      additionalData: {
        operation: 'list_alerts',
        filters: { severity, status, category, assignedTo },
        resultCount: alerts?.length || 0,
        userRole,
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    const response = {
      success: true,
      data: alerts?.map(alert => ({
        ...alert,
        // Clean up the user data structure
        assignedUser: alert.assigned_user,
        createdUser: alert.created_user,
        acknowledgedUser: alert.acknowledged_user,
        resolvedUser: alert.resolved_user,
        assigned_user: undefined,
        created_user: undefined,
        acknowledged_user: undefined,
        resolved_user: undefined,
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      filters: validation.data,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Alerts API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'list_alerts',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'Alert service unavailable' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts - Create new alert
 * Requires: operator role or higher
 */
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');

  try {
    // Authorization check - requires operator role or higher
    const allowedRoles = ['admin', 'analyst', 'operator'];
    if (!allowedRoles.includes(userRole || '')) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'create_alert',
          requiredRoles: allowedRoles,
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions to create alerts' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = apiSchemas.createAlert.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { title, description, severity, category } = validation.data;

    // Additional metadata
    const metadata = {
      source: 'manual',
      createdBy: userId,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent'),
      requestId,
    };

    // Create alert
    const alertId = uuidv4();
    const { data: newAlert, error: createError } = await supabaseAdmin
      .from('alerts')
      .insert({
        id: alertId,
        title,
        description,
        severity,
        status: 'active',
        category,
        source_system: 'sentinel-ui',
        metadata,
        created_by: userId,
      })
      .select(`
        *,
        created_user:created_by(id, first_name, last_name, email)
      `)
      .single();

    if (createError) {
      console.error('Alert creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      );
    }

    // Auto-assign based on severity and category
    const assignedTo = await determineAutoAssignment(severity, category, userRole!);
    if (assignedTo) {
      await supabaseAdmin
        .from('alerts')
        .update({ assigned_to: assignedTo })
        .eq('id', alertId);
    }

    // Log successful alert creation
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'create',
      resourceType: 'alerts',
      resourceId: alertId,
      newValues: {
        title,
        description,
        severity,
        category,
      },
      success: true,
      additionalData: {
        operation: 'create_alert',
        alertId,
        assignedTo,
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    // Send notifications for high/critical alerts
    if (['high', 'critical'].includes(severity)) {
      await sendAlertNotifications(newAlert, 'created');
    }

    const response = {
      success: true,
      data: {
        ...newAlert,
        createdUser: newAlert.created_user,
        created_user: undefined,
        assignedTo,
      },
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Create alert API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'create_alert',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'Alert creation failed' },
      { status: 500 }
    );
  }
}

/**
 * Determine auto-assignment based on alert properties
 */
async function determineAutoAssignment(
  severity: string,
  category: string,
  creatorRole: string
): Promise<string | null> {
  try {
    // For critical alerts, assign to admins
    if (severity === 'critical') {
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1);

      return admins?.[0]?.id || null;
    }

    // For high severity security alerts, assign to analysts
    if (severity === 'high' && category === 'security') {
      const { data: analysts } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'analyst')
        .eq('is_active', true)
        .limit(1);

      return analysts?.[0]?.id || null;
    }

    return null;
  } catch (error) {
    console.error('Auto-assignment error:', error);
    return null;
  }
}

/**
 * Send alert notifications
 */
async function sendAlertNotifications(alert: any, action: 'created' | 'updated' | 'escalated') {
  try {
    // Log notification (in production, integrate with email/Slack/Teams)
    await auditLogger.logAuditEvent({
      action: 'create',
      resourceType: 'notifications',
      resourceId: alert.id,
      success: true,
      additionalData: {
        operation: 'alert_notification',
        alertId: alert.id,
        severity: alert.severity,
        action,
        notificationChannels: ['audit_log'], // Would include email, slack, etc.
      },
    });

    console.log(`Alert notification sent for ${alert.id}: ${action}`);
  } catch (error) {
    console.error('Notification error:', error);
  }
}

/**
 * Handle unsupported methods
 */
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