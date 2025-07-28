/**
 * SENTINEL USER MANAGEMENT API - Individual User Operations
 * Secure user operations with role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '@/lib/auth';
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
 * GET /api/users/[id] - Get user by ID
 * Requires: admin role OR own user ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');
  const targetUserId = params.id;

  try {
    // Authorization check - admin can see any user, others can only see themselves
    if (userRole !== 'admin' && userId !== targetUserId) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'get_user',
          targetUserId,
          requiredRole: 'admin or self',
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Fetch user data
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        role,
        first_name,
        last_name,
        is_active,
        is_verified,
        mfa_enabled,
        last_login,
        login_attempts,
        locked_until,
        created_at,
        updated_at,
        created_by
      `)
      .eq('id', targetUserId)
      .single();

    if (error || !user) {
      await auditLogger.logAuditEvent({
        userId,
        sessionId,
        action: 'read',
        resourceType: 'users',
        resourceId: targetUserId,
        success: false,
        errorMessage: 'User not found',
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Log successful access
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'read',
      resourceType: 'users',
      resourceId: targetUserId,
      success: true,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
      additionalData: {
        operation: 'get_user',
        accessType: userId === targetUserId ? 'self' : 'admin',
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });

  } catch (error) {
    console.error('Get user API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'get_user',
        targetUserId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id] - Update user
 * Requires: admin role OR own user ID (with restrictions)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');
  const targetUserId = params.id;

  try {
    // Authorization check
    const isAdmin = userRole === 'admin';
    const isSelf = userId === targetUserId;

    if (!isAdmin && !isSelf) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'update_user',
          targetUserId,
          requiredRole: 'admin or self',
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = apiSchemas.updateUser.safeParse(body);

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

    // Get current user data for comparison
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Restrict what non-admin users can update about themselves
    if (!isAdmin) {
      // Non-admin users cannot change role or is_active status
      if ('role' in updateData || 'isActive' in updateData) {
        await auditLogger.logSecurityEvent({
          userId,
          sessionId,
          action: 'permission_denied',
          severity: 'high',
          details: {
            type: 'privilege_escalation_attempt',
            operation: 'update_user',
            targetUserId,
            attemptedChanges: Object.keys(updateData),
          },
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('User-Agent') || undefined,
          requestId,
        });

        return NextResponse.json(
          { error: 'Cannot modify role or active status' },
          { status: 403 }
        );
      }
    }

    // Prepare update object
    const updateObject: any = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    if (updateData.firstName) updateObject.first_name = updateData.firstName;
    if (updateData.lastName) updateObject.last_name = updateData.lastName;
    if (updateData.email) updateObject.email = updateData.email;
    
    // Admin-only fields
    if (isAdmin) {
      if (updateData.role) updateObject.role = updateData.role;
      if (updateData.isActive !== undefined) updateObject.is_active = updateData.isActive;
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateObject)
      .eq('id', targetUserId)
      .select(`
        id,
        email,
        role,
        first_name,
        last_name,
        is_active,
        is_verified,
        mfa_enabled,
        last_login,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('User update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Log successful update
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'update',
      resourceType: 'users',
      resourceId: targetUserId,
      oldValues: {
        email: currentUser.email,
        role: currentUser.role,
        firstName: currentUser.first_name,
        lastName: currentUser.last_name,
        isActive: currentUser.is_active,
      },
      newValues: updateData,
      success: true,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
      additionalData: {
        operation: 'update_user',
        updateType: isSelf ? 'self' : 'admin',
        changedFields: Object.keys(updateData),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });

  } catch (error) {
    console.error('Update user API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'update_user',
        targetUserId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id] - Delete user (soft delete)
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
  const targetUserId = params.id;

  try {
    // Authorization check - only admins can delete users
    if (userRole !== 'admin') {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'high',
        details: {
          type: 'insufficient_permissions',
          operation: 'delete_user',
          targetUserId,
          requiredRole: 'admin',
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (userId === targetUserId) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'self_deletion_attempt',
          operation: 'delete_user',
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      );
    }

    // Get user data before deletion
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete - deactivate user instead of actual deletion
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', targetUserId);

    if (deleteError) {
      console.error('User deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    // Invalidate all user sessions
    await AuthService.invalidateAllUserSessions(targetUserId);

    // Log successful deletion
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'delete',
      resourceType: 'users',
      resourceId: targetUserId,
      oldValues: {
        email: currentUser.email,
        role: currentUser.role,
        firstName: currentUser.first_name,
        lastName: currentUser.last_name,
        isActive: currentUser.is_active,
      },
      success: true,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
      additionalData: {
        operation: 'delete_user',
        deletedUserEmail: currentUser.email,
        deletedUserRole: currentUser.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error) {
    console.error('Delete user API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'delete_user',
        targetUserId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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