/**
 * SENTINEL RATE LIMITING SYSTEM
 * Enterprise-grade rate limiting with comprehensive protection mechanisms
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { auditLogger } from './audit-logger';
import { NextRequest, NextResponse } from 'next/server';

// Rate limit configuration interfaces
export interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest, identifier: string) => Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: Date;
  totalRequests: number;
  windowStart: Date;
}

export interface AdvancedRateLimitOptions {
  // Sliding window vs fixed window
  slidingWindow?: boolean;
  
  // Progressive penalties
  progressivePenalty?: {
    enabled: boolean;
    multiplier: number; // Multiply window time by this factor after each violation
    maxMultiplier: number;
  };
  
  // Distributed rate limiting
  distributed?: boolean;
  
  // Custom response for rate limit exceeded
  customResponse?: (result: RateLimitResult) => NextResponse;
  
  // Whitelist/blacklist
  whitelist?: string[];
  blacklist?: string[];
  
  // Burst allowance
  burstAllowance?: {
    maxBurst: number;
    burstWindow: number; // ms
  };
}

// Initialize Supabase client for rate limit storage
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
 * Advanced Rate Limiter with multiple protection strategies
 */
export class RateLimiter {
  private static instance: RateLimiter;
  private cache: Map<string, any> = new Map();
  private blacklistCache: Set<string> = new Set();
  private penaltyCache: Map<string, number> = new Map();

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    identifier: string,
    endpoint: string,
    rule: RateLimitRule,
    options: AdvancedRateLimitOptions = {}
  ): Promise<RateLimitResult> {
    try {
      // Check whitelist
      if (options.whitelist?.includes(identifier)) {
        return {
          allowed: true,
          remainingRequests: rule.maxRequests,
          resetTime: new Date(Date.now() + rule.windowMs),
          totalRequests: 0,
          windowStart: new Date(),
        };
      }

      // Check blacklist
      if (options.blacklist?.includes(identifier) || this.blacklistCache.has(identifier)) {
        await this.logRateLimitViolation(identifier, endpoint, 'blacklisted');
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: new Date(Date.now() + rule.windowMs * 10), // Extended penalty
          totalRequests: rule.maxRequests + 1,
          windowStart: new Date(),
        };
      }

      const windowStart = this.getWindowStart(rule.windowMs, options.slidingWindow);
      const cacheKey = `${identifier}:${endpoint}:${windowStart.getTime()}`;

      // Try to get from memory cache first
      let rateLimitData = this.cache.get(cacheKey);

      if (!rateLimitData) {
        // Get from database
        rateLimitData = await this.getRateLimitFromDB(identifier, endpoint, windowStart);
        if (rateLimitData) {
          this.cache.set(cacheKey, rateLimitData);
        }
      }

      if (!rateLimitData) {
        // First request in window
        rateLimitData = {
          identifier,
          endpoint,
          requestsCount: 0,
          windowStart,
        };
      }

      // Apply progressive penalty if enabled
      const effectiveMaxRequests = this.getEffectiveMaxRequests(
        identifier,
        rule.maxRequests,
        options.progressivePenalty
      );

      // Check burst allowance
      if (options.burstAllowance) {
        const burstResult = await this.checkBurstAllowance(
          identifier,
          endpoint,
          options.burstAllowance
        );
        if (!burstResult.allowed) {
          return {
            allowed: false,
            remainingRequests: 0,
            resetTime: new Date(Date.now() + options.burstAllowance.burstWindow),
            totalRequests: rateLimitData.requestsCount + 1,
            windowStart,
          };
        }
      }

      // Increment request count
      rateLimitData.requestsCount += 1;

      // Check if limit exceeded
      const isAllowed = rateLimitData.requestsCount <= effectiveMaxRequests;

      if (!isAllowed) {
        // Handle rate limit violation
        await this.handleRateLimitViolation(identifier, endpoint, rule, options);
        
        if (rule.onLimitReached) {
          // Create a mock NextRequest for the callback
          const mockRequest = { 
            ip: identifier.split(':')[0] || identifier,
            headers: new Headers(),
            url: endpoint,
          } as NextRequest;
          await rule.onLimitReached(mockRequest, identifier);
        }
      }

      // Update storage
      await this.updateRateLimit(rateLimitData);
      this.cache.set(cacheKey, rateLimitData);

      const resetTime = new Date(windowStart.getTime() + rule.windowMs);
      const remainingRequests = Math.max(0, effectiveMaxRequests - rateLimitData.requestsCount);

      return {
        allowed: isAllowed,
        remainingRequests,
        resetTime,
        totalRequests: rateLimitData.requestsCount,
        windowStart,
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open for availability, but log the error
      await auditLogger.logSecurityEvent({
        action: 'security_violation',
        severity: 'high',
        details: {
          type: 'rate_limiter_error',
          identifier,
          endpoint,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return {
        allowed: true,
        remainingRequests: rule.maxRequests,
        resetTime: new Date(Date.now() + rule.windowMs),
        totalRequests: 0,
        windowStart: new Date(),
      };
    }
  }

  /**
   * Create rate limiting middleware for Next.js API routes
   */
  createMiddleware(
    rule: RateLimitRule,
    options: AdvancedRateLimitOptions = {}
  ) {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      try {
        const identifier = this.getIdentifier(req, rule.keyGenerator);
        const endpoint = this.getEndpoint(req);

        const result = await this.checkRateLimit(identifier, endpoint, rule, options);

        if (!result.allowed) {
          // Log rate limit exceeded
          await auditLogger.logSecurityEvent({
            action: 'rate_limit_exceeded',
            severity: 'medium',
            details: {
              identifier,
              endpoint,
              requestCount: result.totalRequests,
              limit: rule.maxRequests,
              windowStart: result.windowStart,
              resetTime: result.resetTime,
            },
            ipAddress: this.getClientIP(req),
            userAgent: req.headers.get('User-Agent') || undefined,
          });

          // Custom response or default
          if (options.customResponse) {
            return options.customResponse(result);
          }

          return new NextResponse(
            JSON.stringify({
              error: 'Rate limit exceeded',
              message: `Too many requests. Try again after ${result.resetTime.toISOString()}`,
              resetTime: result.resetTime.toISOString(),
              remainingRequests: result.remainingRequests,
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': rule.maxRequests.toString(),
                'X-RateLimit-Remaining': result.remainingRequests.toString(),
                'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
                'Retry-After': Math.ceil((result.resetTime.getTime() - Date.now()) / 1000).toString(),
              },
            }
          );
        }

        // Add rate limit headers to successful responses
        return null; // Let the request continue
      } catch (error) {
        console.error('Rate limiting middleware error:', error);
        return null; // Fail open
      }
    };
  }

  /**
   * Get rate limit data from database
   */
  private async getRateLimitFromDB(
    identifier: string,
    endpoint: string,
    windowStart: Date
  ): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .eq('window_start', windowStart.toISOString())
      .single();

    if (error) {
      return null;
    }

    return {
      identifier: data.identifier,
      endpoint: data.endpoint,
      requestsCount: data.requests_count,
      windowStart: new Date(data.window_start),
    };
  }

  /**
   * Update rate limit in database
   */
  private async updateRateLimit(data: any): Promise<void> {
    const { error } = await supabaseAdmin
      .from('rate_limits')
      .upsert({
        identifier: data.identifier,
        endpoint: data.endpoint,
        requests_count: data.requestsCount,
        window_start: data.windowStart.toISOString(),
      });

    if (error) {
      console.error('Failed to update rate limit:', error);
    }
  }

  /**
   * Get window start time
   */
  private getWindowStart(windowMs: number, slidingWindow?: boolean): Date {
    const now = Date.now();
    
    if (slidingWindow) {
      return new Date(now - windowMs);
    } else {
      // Fixed window aligned to window size
      const windowStart = Math.floor(now / windowMs) * windowMs;
      return new Date(windowStart);
    }
  }

  /**
   * Get effective max requests with progressive penalty
   */
  private getEffectiveMaxRequests(
    identifier: string,
    baseMaxRequests: number,
    progressivePenalty?: AdvancedRateLimitOptions['progressivePenalty']
  ): number {
    if (!progressivePenalty?.enabled) {
      return baseMaxRequests;
    }

    const penaltyCount = this.penaltyCache.get(identifier) || 0;
    const penaltyMultiplier = Math.min(
      Math.pow(progressivePenalty.multiplier, penaltyCount),
      progressivePenalty.maxMultiplier
    );

    return Math.max(1, Math.floor(baseMaxRequests / penaltyMultiplier));
  }

  /**
   * Check burst allowance
   */
  private async checkBurstAllowance(
    identifier: string,
    endpoint: string,
    burstConfig: { maxBurst: number; burstWindow: number }
  ): Promise<{ allowed: boolean; requestsInBurst: number }> {
    const burstWindowStart = new Date(Date.now() - burstConfig.burstWindow);
    const burstKey = `burst:${identifier}:${endpoint}`;

    // Count requests in burst window
    const { data, error } = await supabaseAdmin
      .from('rate_limits')
      .select('requests_count')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', burstWindowStart.toISOString());

    if (error) {
      return { allowed: true, requestsInBurst: 0 };
    }

    const totalRequestsInBurst = data.reduce(
      (sum, record) => sum + record.requests_count,
      0
    );

    return {
      allowed: totalRequestsInBurst < burstConfig.maxBurst,
      requestsInBurst: totalRequestsInBurst,
    };
  }

  /**
   * Handle rate limit violation
   */
  private async handleRateLimitViolation(
    identifier: string,
    endpoint: string,
    rule: RateLimitRule,
    options: AdvancedRateLimitOptions
  ): Promise<void> {
    // Increment penalty count for progressive penalty
    if (options.progressivePenalty?.enabled) {
      const currentPenalty = this.penaltyCache.get(identifier) || 0;
      this.penaltyCache.set(identifier, currentPenalty + 1);
    }

    // Check for repeated violations and consider blacklisting
    const violationCount = await this.getViolationCount(identifier, endpoint);
    
    if (violationCount >= 5) {
      // Temporary blacklist for severe violations
      this.blacklistCache.add(identifier);
      setTimeout(() => {
        this.blacklistCache.delete(identifier);
      }, rule.windowMs * 10); // 10x window time

      await auditLogger.logSecurityEvent({
        action: 'security_violation',
        severity: 'high',
        details: {
          type: 'temporary_blacklist',
          identifier,
          endpoint,
          violationCount,
          duration: rule.windowMs * 10,
        },
      });
    }
  }

  /**
   * Get violation count for identifier
   */
  private async getViolationCount(identifier: string, endpoint: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    // This would typically be stored in a separate violations table
    // For now, we'll estimate based on rate limit records
    const { data, error } = await supabaseAdmin
      .from('rate_limits')
      .select('requests_count')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('created_at', oneHourAgo.toISOString());

    if (error) return 0;

    return data.length;
  }

  /**
   * Log rate limit violation
   */
  private async logRateLimitViolation(
    identifier: string,
    endpoint: string,
    reason: string
  ): Promise<void> {
    await auditLogger.logSecurityEvent({
      action: 'rate_limit_exceeded',
      severity: 'medium',
      details: {
        identifier,
        endpoint,
        reason,
      },
    });
  }

  /**
   * Get client identifier
   */
  private getIdentifier(req: NextRequest, keyGenerator?: (req: NextRequest) => string): string {
    if (keyGenerator) {
      return keyGenerator(req);
    }

    // Try to get user ID from auth
    const authorization = req.headers.get('Authorization');
    if (authorization) {
      try {
        // Extract user ID from token if available
        // This would integrate with your auth system
        const token = authorization.replace('Bearer ', '');
        // const decoded = jwt.verify(token, config.jwt.secret);
        // return `user:${decoded.sub}`;
      } catch (error) {
        // Fall through to IP-based identification
      }
    }

    // Fall back to IP address
    const ip = this.getClientIP(req);
    return `ip:${ip}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: NextRequest): string {
    // Check various headers for the real IP
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

    // Fallback to connection IP
    return req.ip || '127.0.0.1';
  }

  /**
   * Get endpoint pattern for rate limiting
   */
  private getEndpoint(req: NextRequest): string {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Normalize dynamic routes
    pathname = pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');

    return `${req.method} ${pathname}`;
  }

  /**
   * Clean up expired rate limit records
   */
  async cleanupExpiredRecords(): Promise<number> {
    const cutoffTime = new Date(Date.now() - config.rateLimit.windowMs * 2);
    
    const { data, error } = await supabaseAdmin
      .from('rate_limits')
      .delete()
      .lt('window_start', cutoffTime.toISOString());

    if (error) {
      console.error('Rate limit cleanup error:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} expired rate limit records`);
    return deletedCount;
  }
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // General API rate limiter
  api: new RateLimiter().createMiddleware({
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.maxRequests,
  }),

  // Strict rate limiter for authentication endpoints
  auth: new RateLimiter().createMiddleware({
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.authMaxRequests,
  }, {
    progressivePenalty: {
      enabled: true,
      multiplier: 2,
      maxMultiplier: 10,
    },
    burstAllowance: {
      maxBurst: 5,
      burstWindow: 60000, // 1 minute
    },
  }),

  // Lenient rate limiter for file uploads
  fileUpload: new RateLimiter().createMiddleware({
    windowMs: 3600000, // 1 hour
    maxRequests: 50,
  }),

  // Strict rate limiter for sensitive operations
  sensitive: new RateLimiter().createMiddleware({
    windowMs: config.rateLimit.windowMs,
    maxRequests: 10,
  }, {
    progressivePenalty: {
      enabled: true,
      multiplier: 3,
      maxMultiplier: 20,
    },
    slidingWindow: true,
  }),
};

export default RateLimiter.getInstance();