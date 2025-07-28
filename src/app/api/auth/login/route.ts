/**
 * SENTINEL LOGIN API ENDPOINT
 * Secure authentication with comprehensive security controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { apiSchemas, validateRequest } from '@/lib/validation';
import { rateLimiters } from '@/lib/rate-limiter';
import { auditLogger } from '@/lib/audit-logger';
import { config, configUtils } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Secure login endpoint with comprehensive security measures
 */
export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Set request context for audit logging
    auditLogger.setRequestContext(requestId, {
      method: 'POST',
      url: '/api/auth/login',
      userAgent: req.headers.get('User-Agent'),
      ipAddress: getClientIP(req),
    });

    // Apply rate limiting
    const rateLimit = await rateLimiters.auth(req);
    if (rateLimit) {
      return rateLimit;
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = apiSchemas.login.safeParse(body);
    
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      await auditLogger.logSecurityEvent({
        action: 'failed_login',
        severity: 'medium',
        details: {
          reason: 'validation_failed',
          errors,
          email: body.email,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    const { email, password, mfaCode } = validation.data;
    const ipAddress = getClientIP(req);
    const userAgent = req.headers.get('User-Agent') || 'Unknown';

    // Authenticate user
    const authResult = await AuthService.authenticate({
      email,
      password,
      mfaCode,
      ipAddress,
      userAgent,
    });

    if (!authResult.success) {
      // Log failed authentication attempt
      await auditLogger.logSecurityEvent({
        action: 'failed_login',
        severity: authResult.error?.includes('locked') ? 'high' : 'medium',
        details: {
          reason: authResult.error,
          email,
          requiresMfa: authResult.requiresMfa,
        },
        ipAddress,
        userAgent,
        requestId,
      });

      const statusCode = authResult.requiresMfa ? 200 : 401;
      
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
          requiresMfa: authResult.requiresMfa,
        },
        { status: statusCode }
      );
    }

    // Successful authentication
    const { user, session, accessToken, refreshToken } = authResult;

    // Log successful login
    await auditLogger.logSecurityEvent({
      userId: user!.id,
      sessionId: session!.id,
      action: 'login_success',
      severity: 'low',
      details: {
        role: user!.role,
        mfaUsed: user!.mfaEnabled,
      },
      ipAddress,
      userAgent,
      requestId,
    });

    // Log API request metrics
    await auditLogger.logApiRequest({
      requestId,
      method: 'POST',
      url: '/api/auth/login',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      userId: user!.id,
      ipAddress,
      userAgent,
    });

    // Create secure response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user!.id,
        email: user!.email,
        role: user!.role,
        firstName: user!.firstName,
        lastName: user!.lastName,
        isVerified: user!.isVerified,
        mfaEnabled: user!.mfaEnabled,
        lastLogin: user!.lastLogin,
      },
      accessToken,
    });

    // Set secure HTTP-only cookie for refresh token
    response.cookies.set('refreshToken', refreshToken!, {
      httpOnly: true,
      secure: configUtils.isProduction(),
      sameSite: 'strict',
      maxAge: config.security.refreshTokenTimeout,
      path: '/api/auth',
    });

    // Add security headers
    const securityHeaders = configUtils.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Login API error:', error);

    // Log error
    await auditLogger.logSecurityEvent({
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'login_api_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
      },
      { status: 500 }
    );
  } finally {
    // Clean up request context
    auditLogger.clearRequestContext(requestId);
  }
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