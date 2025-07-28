/**
 * SENTINEL TOKEN REFRESH API ENDPOINT
 * Secure token refresh with session validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { rateLimiters } from '@/lib/rate-limiter';
import { auditLogger } from '@/lib/audit-logger';
import { config, configUtils } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Secure token refresh endpoint
 */
export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Set request context for audit logging
    auditLogger.setRequestContext(requestId, {
      method: 'POST',
      url: '/api/auth/refresh',
      userAgent: req.headers.get('User-Agent'),
      ipAddress: getClientIP(req),
    });

    // Apply rate limiting
    const rateLimit = await rateLimiters.auth(req);
    if (rateLimit) {
      return rateLimit;
    }

    // Get refresh token from cookie
    const refreshToken = req.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      await auditLogger.logSecurityEvent({
        action: 'security_violation',
        severity: 'medium',
        details: {
          type: 'missing_refresh_token',
          reason: 'No refresh token provided',
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Refresh token required',
        },
        { status: 401 }
      );
    }

    // Refresh access token
    const authResult = await AuthService.refreshAccessToken(refreshToken);

    if (!authResult.success) {
      // Log failed token refresh
      await auditLogger.logSecurityEvent({
        action: 'security_violation',
        severity: 'medium',
        details: {
          type: 'invalid_refresh_token',
          reason: authResult.error,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      // Clear invalid refresh token cookie
      const response = NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: 401 }
      );

      response.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: configUtils.isProduction(),
        sameSite: 'strict',
        maxAge: 0,
        path: '/api/auth',
      });

      return response;
    }

    // Successful token refresh
    const { user, session, accessToken } = authResult;

    // Log successful token refresh
    await auditLogger.logSecurityEvent({
      userId: user!.id,
      sessionId: session!.id,
      action: 'login_success', // This is essentially a re-authentication
      severity: 'low',
      details: {
        type: 'token_refresh',
        role: user!.role,
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    // Log API request metrics
    await auditLogger.logApiRequest({
      requestId,
      method: 'POST',
      url: '/api/auth/refresh',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      userId: user!.id,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
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

    // Refresh token cookie is already set from the session
    // No need to update it unless it's a new one

    // Add security headers
    const securityHeaders = configUtils.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Token refresh API error:', error);

    // Log error
    await auditLogger.logSecurityEvent({
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'token_refresh_api_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Token refresh failed',
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