/**
 * SENTINEL ALERT MANAGEMENT API - Individual Alert Operations
 * Secure alert operations with comprehensive tracking and role-based access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiSchemas } from '@/lib/validation';
import { auditLogger } from '@/lib/audit-logger';
import { config } from '@/lib/config';
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

/**
 * GET /api/alerts/[id] - Get alert by ID
 * Requires: operator role or higher
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');
  const alertId = params.id;

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
          operation: 'get_alert',
          alertId,
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(alertId)) {
      return NextResponse.json(
        { error: 'Invalid alert ID format' },
        { status: 400 }
      );
    }

    // Fetch alert with related user data
    let query = supabaseAdmin
      .from('alerts')
      .select(`
        *,
        assigned_user:assigned_to(id, first_name, last_name, email, role),
        created_user:created_by(id, first_name, last_name, email, role),
        acknowledged_user:acknowledged_by(id, first_name, last_name, email, role),
        resolved_user:resolved_by(id, first_name, last_name, email, role)
      `)
      .eq('id', alertId)
      .single();

    // Role-based filtering for operators
    if (userRole === 'operator') {
      // Operators can only see alerts assigned to them or unassigned
      query = query.or(`assigned_to.eq.${userId},assigned_to.is.null`);
    }

    const { data: alert, error } = await query;

    if (error || !alert) {
      await auditLogger.logAuditEvent({
        userId,
        sessionId,
        action: 'read',
        resourceType: 'alerts',
        resourceId: alertId,
        success: false,
        errorMessage: 'Alert not found or access denied',
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Alert not found or access denied' },
        { status: 404 }
      );
    }

    // Log successful access
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'read',
      resourceType: 'alerts',
      resourceId: alertId,
      success: true,
      additionalData: {
        operation: 'get_alert',
        alertSeverity: alert.severity,
        alertStatus: alert.status,
        userRole,
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    const response = {
      success: true,
      data: {
        ...alert,
        assignedUser: alert.assigned_user,
        createdUser: alert.created_user,
        acknowledgedUser: alert.acknowledged_user,
        resolvedUser: alert.resolved_user,
        assigned_user: undefined,
        created_user: undefined,
        acknowledged_user: undefined,
        resolved_user: undefined,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get alert API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'get_alert',
        alertId,
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
 * PUT /api/alerts/[id] - Update alert
 * Requires: operator role or higher (with restrictions)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');
  const alertId = params.id;

  try {
    // Authorization check
    const allowedRoles = ['admin', 'analyst', 'operator'];
    if (!allowedRoles.includes(userRole || '')) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'update_alert',
          alertId,
          requiredRoles: allowedRoles,
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions to update alerts' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = apiSchemas.updateAlert.safeParse(body);

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

    const updateData = validation.data;

    // Get current alert data for comparison and authorization
    const { data: currentAlert, error: fetchError } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (fetchError || !currentAlert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Role-based update restrictions
    if (userRole === 'operator') {
      // Operators can only update alerts assigned to them
      if (currentAlert.assigned_to !== userId) {
        await auditLogger.logSecurityEvent({
          userId,
          sessionId,
          action: 'permission_denied',
          severity: 'medium',
          details: {
            type: 'unauthorized_alert_update',
            operation: 'update_alert',
            alertId,
            currentAssignee: currentAlert.assigned_to,
          },
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('User-Agent') || undefined,
          requestId,
        });

        return NextResponse.json(
          { error: 'Can only update alerts assigned to you' },
          { status: 403 }
        );
      }

      // Operators cannot change severity or assignment
      if ('severity' in updateData || 'assignedTo' in updateData) {
        return NextResponse.json(
          { error: 'Cannot modify severity or assignment' },
          { status: 403 }
        );
      }
    }

    // Prepare update object
    const updateObject: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.title) updateObject.title = updateData.title;
    if (updateData.description) updateObject.description = updateData.description;
    if (updateData.status) updateObject.status = updateData.status;

    // Admin/Analyst only fields
    if (['admin', 'analyst'].includes(userRole!)) {
      if (updateData.severity) updateObject.severity = updateData.severity;
      if (updateData.assignedTo) updateObject.assigned_to = updateData.assignedTo;
    }

    // Handle status-specific updates
    if (updateData.status === 'acknowledged' && currentAlert.status !== 'acknowledged') {
      updateObject.acknowledged_by = userId;
      updateObject.acknowledged_at = new Date().toISOString();
    }

    if (updateData.status === 'resolved' && currentAlert.status !== 'resolved') {
      updateObject.resolved_by = userId;
      updateObject.resolved_at = new Date().toISOString();
    }

    if (updateData.status === 'escalated' && currentAlert.status !== 'escalated') {
      updateObject.escalated_at = new Date().toISOString();
    }

    // Update alert
    const { data: updatedAlert, error: updateError } = await supabaseAdmin
      .from('alerts')
      .update(updateObject)
      .eq('id', alertId)
      .select(`
        *,
        assigned_user:assigned_to(id, first_name, last_name, email, role),
        created_user:created_by(id, first_name, last_name, email, role),
        acknowledged_user:acknowledged_by(id, first_name, last_name, email, role),
        resolved_user:resolved_by(id, first_name, last_name, email, role)
      `)
      .single();

    if (updateError) {
      console.error('Alert update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update alert' },
        { status: 500 }
      );
    }

    // Log successful update
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'update',
      resourceType: 'alerts',
      resourceId: alertId,
      oldValues: {
        title: currentAlert.title,
        description: currentAlert.description,
        severity: currentAlert.severity,
        status: currentAlert.status,
        assignedTo: currentAlert.assigned_to,
      },
      newValues: updateData,
      success: true,
      additionalData: {
        operation: 'update_alert',
        statusChanged: currentAlert.status !== updateData.status,
        severityChanged: currentAlert.severity !== updateData.severity,
        assignmentChanged: currentAlert.assigned_to !== updateData.assignedTo,
        userRole,
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    // Send notifications for important updates
    const shouldNotify = 
      updateData.status === 'escalated' ||
      (updateData.severity && ['high', 'critical'].includes(updateData.severity)) ||
      (currentAlert.severity !== updateData.severity);

    if (shouldNotify) {
      await sendAlertNotifications(updatedAlert, 'updated');
    }

    const response = {
      success: true,
      data: {
        ...updatedAlert,
        assignedUser: updatedAlert.assigned_user,
        createdUser: updatedAlert.created_user,
        acknowledgedUser: updatedAlert.acknowledged_user,
        resolvedUser: updatedAlert.resolved_user,
        assigned_user: undefined,
        created_user: undefined,
        acknowledged_user: undefined,
        resolved_user: undefined,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Update alert API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'update_alert',
        alertId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'Alert update failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts/[id] - Delete alert (soft delete)
 * Requires: admin role
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');
  const alertId = params.id;

  try {
    // Authorization check - only admins can delete alerts
    if (userRole !== 'admin') {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'high',
        details: {
          type: 'insufficient_permissions',
          operation: 'delete_alert',
          alertId,
          requiredRole: 'admin',
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions to delete alerts' },
        { status: 403 }
      );
    }

    // Get alert data before deletion
    const { data: currentAlert, error: fetchError } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (fetchError || !currentAlert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of critical active alerts
    if (currentAlert.severity === 'critical' && currentAlert.status === 'active') {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'high',
        details: {
          type: 'critical_alert_deletion_attempt',
          operation: 'delete_alert',
          alertId,
          alertSeverity: currentAlert.severity,
          alertStatus: currentAlert.status,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Cannot delete active critical alerts' },
        { status: 403 }
      );
    }

    // Perform soft delete by updating status
    const { error: deleteError } = await supabaseAdmin
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...currentAlert.metadata,
          deleted: true,
          deletedBy: userId,
          deletedAt: new Date().toISOString(),
        },
      })
      .eq('id', alertId);

    if (deleteError) {
      console.error('Alert deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete alert' },
        { status: 500 }
      );
    }

    // Log successful deletion
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'delete',
      resourceType: 'alerts',
      resourceId: alertId,
      oldValues: {
        title: currentAlert.title,
        severity: currentAlert.severity,
        status: currentAlert.status,
        category: currentAlert.category,
      },
      success: true,
      additionalData: {
        operation: 'delete_alert',
        originalSeverity: currentAlert.severity,
        originalStatus: currentAlert.status,
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully',
    });

  } catch (error) {
    console.error('Delete alert API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'delete_alert',
        alertId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'Alert deletion failed' },
      { status: 500 }
    );
  }
}

/**
 * Send alert notifications
 */
async function sendAlertNotifications(alert: any, action: 'updated' | 'escalated') {
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
        status: alert.status,
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
export async function POST() {
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