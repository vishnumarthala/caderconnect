/**
 * SENTINEL SECURE AUTHENTICATION SYSTEM
 * Enterprise-grade JWT authentication with role-based access control
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { auditLogger } from './audit-logger';
import { z } from 'zod';

// Types and interfaces
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'analyst' | 'operator' | 'viewer';
  firstName: string;
  lastName: string;
  isActive: boolean;
  isVerified: boolean;
  mfaEnabled: boolean;
  lastLogin: Date | null;
  loginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export interface TokenPayload {
  sub: string; // user id
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
  ipAddress: string;
  userAgent: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  requiresMfa?: boolean;
}

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password required'),
  mfaCode: z.string().optional(),
  ipAddress: z.string().ip(),
  userAgent: z.string().min(1),
});

const passwordSchema = z.string()
  .min(config.security.passwordMinLength, `Password must be at least ${config.security.passwordMinLength} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Initialize Supabase client with service role for admin operations
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
 * Secure Authentication Class with comprehensive security controls
 */
export class AuthService {
  /**
   * Hash password with configurable rounds
   */
  static async hashPassword(password: string): Promise<string> {
    // Validate password strength
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      throw new Error(`Password validation failed: ${passwordValidation.error.errors[0].message}`);
    }

    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure JWT tokens
   */
  static generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + config.security.sessionTimeout,
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      algorithm: config.jwt.algorithm,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string, sessionId: string): string {
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
      sub: userId,
      sessionId,
      type: 'refresh',
      iat: now,
      exp: now + config.security.refreshTokenTimeout,
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
      algorithm: config.jwt.algorithm,
    });
  }

  /**
   * Verify and decode JWT token
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: [config.jwt.algorithm],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        algorithms: [config.jwt.algorithm],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      });
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  /**
   * Check if user account is locked
   */
  static async isAccountLocked(user: User): Promise<boolean> {
    if (!user.lockedUntil) return false;
    
    const now = new Date();
    if (user.lockedUntil > now) {
      return true;
    }

    // Unlock account if lockout period has expired
    await this.unlockAccount(user.id);
    return false;
  }

  /**
   * Increment login attempts and lock account if necessary
   */
  static async incrementLoginAttempts(userId: string): Promise<void> {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('login_attempts')
      .eq('id', userId)
      .single();

    if (!user) return;

    const newAttempts = (user.login_attempts || 0) + 1;
    const shouldLock = newAttempts >= config.security.maxLoginAttempts;

    const updates: any = {
      login_attempts: newAttempts,
      updated_at: new Date().toISOString(),
    };

    if (shouldLock) {
      const lockUntil = new Date(Date.now() + config.security.lockoutDuration * 1000);
      updates.locked_until = lockUntil.toISOString();
    }

    await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId);

    // Log security event
    await auditLogger.logSecurityEvent({
      userId,
      action: shouldLock ? 'account_locked' : 'login_attempt_incremented',
      details: { attempts: newAttempts, locked: shouldLock },
      severity: shouldLock ? 'high' : 'medium',
    });
  }

  /**
   * Unlock user account
   */
  static async unlockAccount(userId: string): Promise<void> {
    await supabaseAdmin
      .from('users')
      .update({
        login_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    await auditLogger.logSecurityEvent({
      userId,
      action: 'account_unlocked',
      details: { reason: 'lockout_period_expired' },
      severity: 'low',
    });
  }

  /**
   * Reset login attempts on successful login
   */
  static async resetLoginAttempts(userId: string): Promise<void> {
    await supabaseAdmin
      .from('users')
      .update({
        login_attempts: 0,
        locked_until: null,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  /**
   * Create new session
   */
  static async createSession(
    userId: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<Session> {
    const sessionId = uuidv4();
    const sessionToken = uuidv4();
    const refreshToken = this.generateRefreshToken(userId, sessionId);
    
    const expiresAt = new Date(Date.now() + config.security.sessionTimeout * 1000);
    const refreshExpiresAt = new Date(Date.now() + config.security.refreshTokenTimeout * 1000);

    const sessionData = {
      id: sessionId,
      user_id: userId,
      session_token: sessionToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
      refresh_expires_at: refreshExpiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      is_active: true,
    };

    const { data, error } = await supabaseAdmin
      .from('user_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      sessionToken: data.session_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
      refreshExpiresAt: new Date(data.refresh_expires_at),
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      isActive: data.is_active,
    };
  }

  /**
   * Validate session
   */
  static async validateSession(sessionToken: string): Promise<Session | null> {
    const { data, error } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    const session: Session = {
      id: data.id,
      userId: data.user_id,
      sessionToken: data.session_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
      refreshExpiresAt: new Date(data.refresh_expires_at),
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      isActive: data.is_active,
    };

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.invalidateSession(sessionToken);
      return null;
    }

    return session;
  }

  /**
   * Invalidate session
   */
  static async invalidateSession(sessionToken: string): Promise<void> {
    await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken);
  }

  /**
   * Invalidate all user sessions
   */
  static async invalidateAllUserSessions(userId: string): Promise<void> {
    await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId);

    await auditLogger.logSecurityEvent({
      userId,
      action: 'all_sessions_invalidated',
      details: { reason: 'security_action' },
      severity: 'medium',
    });
  }

  /**
   * Authenticate user with credentials
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Validate input
      const validation = loginSchema.safeParse(credentials);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error.errors[0].message,
        };
      }

      const { email, password, mfaCode, ipAddress, userAgent } = validation.data;

      // Get user from database
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        await auditLogger.logSecurityEvent({
          action: 'login_failed',
          details: { email, reason: 'user_not_found', ipAddress },
          severity: 'medium',
        });
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      const user: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        firstName: userData.first_name,
        lastName: userData.last_name,
        isActive: userData.is_active,
        isVerified: userData.is_verified,
        mfaEnabled: userData.mfa_enabled,
        lastLogin: userData.last_login ? new Date(userData.last_login) : null,
        loginAttempts: userData.login_attempts || 0,
        lockedUntil: userData.locked_until ? new Date(userData.locked_until) : null,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      };

      // Check if account is locked
      if (await this.isAccountLocked(user)) {
        await auditLogger.logSecurityEvent({
          userId: user.id,
          action: 'login_failed',
          details: { reason: 'account_locked', ipAddress },
          severity: 'high',
        });
        return {
          success: false,
          error: 'Account is temporarily locked due to multiple failed login attempts',
        };
      }

      // Verify password
      const passwordValid = await this.verifyPassword(password, userData.password_hash);
      if (!passwordValid) {
        await this.incrementLoginAttempts(user.id);
        await auditLogger.logSecurityEvent({
          userId: user.id,
          action: 'login_failed',
          details: { reason: 'invalid_password', ipAddress },
          severity: 'medium',
        });
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaCode) {
          return {
            success: false,
            requiresMfa: true,
            error: 'MFA code required',
          };
        }

        // Verify MFA code (implement MFA verification logic here)
        const mfaValid = await this.verifyMfaCode(user.id, mfaCode);
        if (!mfaValid) {
          await this.incrementLoginAttempts(user.id);
          await auditLogger.logSecurityEvent({
            userId: user.id,
            action: 'login_failed',
            details: { reason: 'invalid_mfa', ipAddress },
            severity: 'high',
          });
          return {
            success: false,
            error: 'Invalid MFA code',
          };
        }
      }

      // Create session
      const session = await this.createSession(user.id, ipAddress, userAgent);

      // Generate tokens
      const accessToken = this.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.id,
      });

      // Reset login attempts
      await this.resetLoginAttempts(user.id);

      // Log successful login
      await auditLogger.logSecurityEvent({
        userId: user.id,
        action: 'login_success',
        details: { ipAddress, userAgent },
        severity: 'low',
      });

      return {
        success: true,
        user,
        session,
        accessToken,
        refreshToken: session.refreshToken,
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Verify MFA code (placeholder - implement with actual MFA provider)
   */
  static async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    // Implement actual MFA verification logic here
    // This could integrate with Google Authenticator, SMS, etc.
    return true; // Placeholder
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      // Get session
      const session = await this.validateSession(decoded.sessionId);
      if (!session || session.refreshExpiresAt < new Date()) {
        return {
          success: false,
          error: 'Session expired',
        };
      }

      // Get user
      const { data: userData, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', decoded.sub)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const user: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        firstName: userData.first_name,
        lastName: userData.last_name,
        isActive: userData.is_active,
        isVerified: userData.is_verified,
        mfaEnabled: userData.mfa_enabled,
        lastLogin: userData.last_login ? new Date(userData.last_login) : null,
        loginAttempts: userData.login_attempts || 0,
        lockedUntil: userData.locked_until ? new Date(userData.locked_until) : null,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      };

      // Generate new access token
      const accessToken = this.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.id,
      });

      return {
        success: true,
        user,
        session,
        accessToken,
        refreshToken: session.refreshToken,
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Token refresh failed',
      };
    }
  }

  /**
   * Logout user and invalidate session
   */
  static async logout(sessionToken: string): Promise<void> {
    const session = await this.validateSession(sessionToken);
    if (session) {
      await this.invalidateSession(sessionToken);
      
      await auditLogger.logSecurityEvent({
        userId: session.userId,
        action: 'logout',
        details: { sessionId: session.id },
        severity: 'low',
      });
    }
  }

  /**
   * Check if user has required role
   */
  static hasRole(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'viewer': 0,
      'operator': 1,
      'analyst': 2,
      'admin': 3,
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 999;

    return userLevel >= requiredLevel;
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('user_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} expired sessions`);
    return deletedCount;
  }
}

export default AuthService;