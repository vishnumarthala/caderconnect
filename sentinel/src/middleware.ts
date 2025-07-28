/**
 * DEVELOPMENT MIDDLEWARE
 * Simplified middleware for development that allows dev user authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-auth';

// Skip middleware for these routes
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/logout', 
  '/_next/',
  '/favicon.ico',
  '/api/auth/',
];

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip middleware for public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // In development mode, check for dev session
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
    // For API routes, try to get user info from dev session
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.next();
      
      // Add mock auth headers for dev mode
      response.headers.set('x-user-id', 'dev-user-id');
      response.headers.set('x-user-role', 'admin');
      response.headers.set('x-session-id', 'dev-session-id');
      
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};