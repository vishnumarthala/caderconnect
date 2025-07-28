/**
 * SENTINEL LOGOUT API ENDPOINT
 * Secure session termination with comprehensive cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { configUtils } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Secure logout endpoint with session cleanup
 */
export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Set request context for audit logging
    auditLogger.setRequestContext(requestId, {
      method: 'POST',
      url: '/api/auth/logout',
      userAgent: req.headers.get('User-Agent'),
      ipAddress: getClientIP(req),
    });

    // Get session token from Authorization header
    const authorization = req.headers.get('Authorization');
    let sessionToken: string | null = null;

    if (authorization && authorization.startsWith('Bearer ')) {
      sessionToken = authorization.substring(7);
    }

    // Get refresh token from cookie
    const refreshToken = req.cookies.get('refreshToken')?.value;

    if (!sessionToken && !refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active session found',
        },
        { status: 400 }
      );
    }

    // Validate session to get user info for logging
    let userId: string | undefined;
    if (sessionToken) {
      const tokenPayload = AuthService.verifyAccessToken(sessionToken);
      if (tokenPayload) {
        userId = tokenPayload.sub;
      }
    }

    // Logout and invalidate session
    if (sessionToken) {
      await AuthService.logout(sessionToken);
    }

    // Log successful logout
    await auditLogger.logSecurityEvent({
      userId,
      action: 'logout',
      severity: 'low',
      details: {
        hasSessionToken: !!sessionToken,
        hasRefreshToken: !!refreshToken,
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    // Log API request metrics
    await auditLogger.logApiRequest({
      requestId,
      method: 'POST',
      url: '/api/auth/logout',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      userId,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
    });

    // Create response with cleared cookies
    const response = NextResponse.json({
      success: true,
      message: 'Successfully logged out',
    });

    // Clear refresh token cookie
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: configUtils.isProduction(),
      sameSite: 'strict',
      maxAge: 0,
      path: '/api/auth',
    });

    // Add security headers
    const securityHeaders = configUtils.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Logout API error:', error);

    // Log error
    await auditLogger.logSecurityEvent({
      action: 'security_violation',
      severity: 'medium',
      details: {
        type: 'logout_api_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Logout failed',
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