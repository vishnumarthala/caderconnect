/**
 * SENTINEL USER MANAGEMENT API
 * Secure user CRUD operations with role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '@/lib/auth';
import { apiSchemas, validateRequest } from '@/lib/validation';
import { auditLogger } from '@/lib/audit-logger';
import { config, configUtils } from '@/lib/config';
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

/**
 * GET /api/users - List users with filtering and pagination
 * Requires: admin role
 */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');

  try {
    // Authorization check - only admins can list users
    if (userRole !== 'admin') {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'list_users',
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

    // Parse query parameters
    const url = new URL(req.url);
    const queryParams = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20'),
      search: url.searchParams.get('search') || '',
      role: url.searchParams.get('role') || '',
      isActive: url.searchParams.get('isActive'),
      sortBy: url.searchParams.get('sortBy') || 'created_at',
      sortOrder: url.searchParams.get('sortOrder') || 'desc',
    };

    // Validate pagination
    const paginationSchema = z.object({
      page: z.number().int().min(1).max(1000),
      limit: z.number().int().min(1).max(100),
      sortBy: z.string().refine(val => 
        ['created_at', 'updated_at', 'email', 'first_name', 'last_name', 'role'].includes(val)
      ),
      sortOrder: z.enum(['asc', 'desc']),
    });

    const validation = paginationSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder } = validation.data;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
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
        updated_at
      `, { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (queryParams.search) {
      query = query.or(`email.ilike.%${queryParams.search}%,first_name.ilike.%${queryParams.search}%,last_name.ilike.%${queryParams.search}%`);
    }

    if (queryParams.role) {
      query = query.eq('role', queryParams.role);
    }

    if (queryParams.isActive !== null) {
      query = query.eq('is_active', queryParams.isActive === 'true');
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Log successful access
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'read',
      resourceType: 'users',
      success: true,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
      additionalData: {
        operation: 'list_users',
        filters: queryParams,
        resultCount: users?.length || 0,
      },
    });

    const response = {
      success: true,
      data: users?.map(user => ({
        ...user,
        // Remove sensitive fields
        password_hash: undefined,
        mfa_secret: undefined,
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Users API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'list_users',
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
 * POST /api/users - Create new user
 * Requires: admin role
 */
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');

  try {
    // Authorization check - only admins can create users
    if (userRole !== 'admin') {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'create_user',
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

    // Parse and validate request body
    const body = await req.json();
    const validation = apiSchemas.register.safeParse(body);

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

    const { email, password, firstName, lastName, role = 'viewer' } = validation.data;

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'security_violation',
        severity: 'medium',
        details: {
          type: 'duplicate_user_creation',
          email,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(password);

    // Create user
    const newUserId = uuidv4();
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        email,
        password_hash: passwordHash,
        role,
        first_name: firstName,
        last_name: lastName,
        is_active: true,
        is_verified: false,
        mfa_enabled: false,
        created_by: userId,
      })
      .select(`
        id,
        email,
        role,
        first_name,
        last_name,
        is_active,
        is_verified,
        mfa_enabled,
        created_at
      `)
      .single();

    if (createError) {
      console.error('User creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Log successful user creation
    await auditLogger.logAuditEvent({
      userId,
      sessionId,
      action: 'create',
      resourceType: 'users',
      resourceId: newUserId,
      newValues: {
        email,
        role,
        firstName,
        lastName,
      },
      success: true,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
      additionalData: {
        operation: 'create_user',
        createdUserId: newUserId,
      },
    });

    return NextResponse.json({
      success: true,
      data: newUser,
    }, { status: 201 });

  } catch (error) {
    console.error('User creation API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'create_user',
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