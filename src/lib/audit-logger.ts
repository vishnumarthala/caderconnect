/**
 * SENTINEL AUDIT LOGGING SYSTEM
 * Enterprise-grade security audit logging with comprehensive tracking
 */

import winston from 'winston';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { v4 as uuidv4 } from 'uuid';

// Types and interfaces
export interface AuditEvent {
  userId?: string;
  sessionId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  success?: boolean;
  errorMessage?: string;
  additionalData?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
}

export type AuditAction = 
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout' | 'failed_login' | 'permission_denied'
  | 'file_upload' | 'file_download' | 'data_export'
  | 'admin_action' | 'role_change' | 'password_change'
  | 'mfa_enabled' | 'mfa_disabled' | 'account_locked' | 'account_unlocked'
  | 'session_created' | 'session_invalidated' | 'all_sessions_invalidated'
  | 'security_violation' | 'rate_limit_exceeded' | 'suspicious_activity'
  | 'login_attempt_incremented' | 'login_success';

export interface SecurityEvent extends AuditEvent {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  details?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit?: string;
  dimensions?: Record<string, any>;
  timestamp?: Date;
}

// Initialize Supabase client for audit logging
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

// Configure Winston logger for structured logging
const logger = winston.createLogger({
  level: config.audit.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  defaultMeta: {
    service: 'sentinel-api',
    version: config.api.version,
    environment: config.environment.nodeEnv,
  },
  transports: [
    // File transport for audit logs
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true,
    }),
    
    // Separate file for error logs
    new winston.transports.File({
      filename: 'logs/errors.log',
      level: 'error',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true,
    }),
    
    // Console transport for development
    ...(config.environment.nodeEnv === 'development' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : []),
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

/**
 * Comprehensive Audit Logger Class
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private requestContexts: Map<string, any> = new Map();

  constructor() {
    // Ensure logs directory exists
    this.ensureLogDirectory();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    const fs = require('fs');
    const path = require('path');
    
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Set request context for correlation
   */
  setRequestContext(requestId: string, context: any): void {
    this.requestContexts.set(requestId, {
      ...context,
      timestamp: new Date(),
    });
  }

  /**
   * Get request context
   */
  getRequestContext(requestId: string): any {
    return this.requestContexts.get(requestId);
  }

  /**
   * Clear request context
   */
  clearRequestContext(requestId: string): void {
    this.requestContexts.delete(requestId);
  }

  /**
   * Log audit event to database and file system
   */
  async logAuditEvent(event: AuditEvent): Promise<string> {
    const auditId = uuidv4();
    const timestamp = new Date();

    // Sanitize sensitive data if not allowed to log
    const sanitizedEvent = this.sanitizeAuditEvent(event);

    // Log to Winston (file system)
    logger.info('Audit Event', {
      auditId,
      timestamp,
      ...sanitizedEvent,
    });

    try {
      // Log to database
      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          id: auditId,
          user_id: event.userId || null,
          session_id: event.sessionId || null,
          action: event.action,
          resource_type: event.resourceType || null,
          resource_id: event.resourceId || null,
          old_values: event.oldValues || null,
          new_values: event.newValues || null,
          ip_address: event.ipAddress || null,
          user_agent: event.userAgent || null,
          request_id: event.requestId || null,
          success: event.success ?? true,
          error_message: event.errorMessage || null,
          additional_data: event.additionalData || null,
          created_at: timestamp.toISOString(),
        });

      if (error) {
        logger.error('Failed to log audit event to database', {
          error: error.message,
          auditId,
          event: sanitizedEvent,
        });
      }
    } catch (error) {
      logger.error('Audit logging database error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        auditId,
      });
    }

    return auditId;
  }

  /**
   * Log security-specific events with enhanced tracking
   */
  async logSecurityEvent(event: SecurityEvent): Promise<string> {
    const securityEvent: AuditEvent = {
      ...event,
      category: event.category || 'security',
      additionalData: {
        ...event.additionalData,
        severity: event.severity,
        details: event.details,
        securityEventType: true,
      },
    };

    const auditId = await this.logAuditEvent(securityEvent);

    // Log with appropriate severity level
    const logLevel = this.getLogLevelFromSeverity(event.severity);
    logger.log(logLevel, 'Security Event', {
      auditId,
      severity: event.severity,
      action: event.action,
      userId: event.userId,
      details: event.details,
    });

    // Send alerts for high/critical severity events
    if (event.severity === 'high' || event.severity === 'critical') {
      await this.sendSecurityAlert(event, auditId);
    }

    return auditId;
  }

  /**
   * Log performance metrics
   */
  async logPerformanceMetric(metric: PerformanceMetric): Promise<void> {
    const timestamp = metric.timestamp || new Date();

    try {
      const { error } = await supabaseAdmin
        .from('performance_metrics')
        .insert({
          metric_name: metric.name,
          metric_value: metric.value,
          metric_unit: metric.unit || null,
          dimensions: metric.dimensions || null,
          collected_at: timestamp.toISOString(),
        });

      if (error) {
        logger.error('Failed to log performance metric', {
          error: error.message,
          metric,
        });
      }
    } catch (error) {
      logger.error('Performance metric logging error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metric,
      });
    }

    logger.debug('Performance Metric', {
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      dimensions: metric.dimensions,
    });
  }

  /**
   * Log API request/response
   */
  async logApiRequest(data: {
    requestId: string;
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestSize?: number;
    responseSize?: number;
    error?: string;
  }): Promise<void> {
    const logData = {
      requestId: data.requestId,
      method: data.method,
      url: this.sanitizeUrl(data.url),
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      requestSize: data.requestSize,
      responseSize: data.responseSize,
      timestamp: new Date(),
    };

    // Log with appropriate level based on status code
    const logLevel = data.statusCode >= 500 ? 'error' : 
                    data.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, 'API Request', {
      ...logData,
      error: data.error,
    });

    // Track performance metrics
    await this.logPerformanceMetric({
      name: 'api_response_time',
      value: data.responseTime,
      unit: 'ms',
      dimensions: {
        method: data.method,
        endpoint: this.extractEndpointPattern(data.url),
        statusCode: data.statusCode,
      },
    });

    // Log suspicious activity
    if (data.statusCode === 429) {
      await this.logSecurityEvent({
        userId: data.userId,
        action: 'rate_limit_exceeded',
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        severity: 'medium',
        details: {
          method: data.method,
          url: this.sanitizeUrl(data.url),
          requestId: data.requestId,
        },
      });
    }
  }

  /**
   * Log data access events for compliance
   */
  async logDataAccess(data: {
    userId: string;
    action: 'read' | 'write' | 'delete';
    resourceType: string;
    resourceId: string;
    fields?: string[];
    success: boolean;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    return this.logAuditEvent({
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      success: data.success,
      errorMessage: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      additionalData: {
        fields: data.fields,
        dataAccess: true,
      },
    });
  }

  /**
   * Sanitize audit event to remove sensitive data if configured
   */
  private sanitizeAuditEvent(event: AuditEvent): AuditEvent {
    if (config.audit.logSensitiveData) {
      return event;
    }

    const sanitized = { ...event };

    // Remove sensitive fields
    if (sanitized.oldValues) {
      sanitized.oldValues = this.sanitizeSensitiveFields(sanitized.oldValues);
    }
    if (sanitized.newValues) {
      sanitized.newValues = this.sanitizeSensitiveFields(sanitized.newValues);
    }

    return sanitized;
  }

  /**
   * Sanitize sensitive fields from data
   */
  private sanitizeSensitiveFields(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      'password', 'password_hash', 'token', 'secret', 'key',
      'ssn', 'social_security_number', 'credit_card', 'bank_account'
    ];

    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize URL to remove sensitive parameters
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');
      const sensitiveParams = ['token', 'key', 'secret', 'password'];
      
      for (const param of sensitiveParams) {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      }
      
      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  }

  /**
   * Extract endpoint pattern from URL for metrics
   */
  private extractEndpointPattern(url: string): string {
    try {
      const path = new URL(url, 'http://localhost').pathname;
      
      // Replace UUIDs and numeric IDs with placeholders
      return path
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
        .replace(/\/\d+/g, '/:id');
    } catch {
      return url;
    }
  }

  /**
   * Get log level from security severity
   */
  private getLogLevelFromSeverity(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  /**
   * Send security alerts for high-severity events
   */
  private async sendSecurityAlert(event: SecurityEvent, auditId: string): Promise<void> {
    if (!config.monitoring.enableSecurityAlerts) {
      return;
    }

    const alertData = {
      id: uuidv4(),
      title: `Security Alert: ${event.action}`,
      description: `Security event detected with ${event.severity} severity`,
      severity: event.severity,
      status: 'active' as const,
      category: 'security',
      source_system: 'sentinel-api',
      metadata: {
        auditId,
        action: event.action,
        userId: event.userId,
        details: event.details,
        ipAddress: event.ipAddress,
      },
    };

    try {
      await supabaseAdmin
        .from('alerts')
        .insert(alertData);

      // Send webhook notification if configured
      if (config.monitoring.securityWebhookUrl) {
        await this.sendWebhookAlert(alertData);
      }

    } catch (error) {
      logger.error('Failed to create security alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertData,
      });
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alertData: any): Promise<void> {
    try {
      const response = await fetch(config.monitoring.securityWebhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...alertData,
          timestamp: new Date().toISOString(),
          service: 'sentinel-api',
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }
    } catch (error) {
      logger.error('Webhook alert failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertData,
      });
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    if (filters.success !== undefined) {
      query = query.eq('success', filters.success);
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
    }

    const { data, error } = await query;
    
    if (error) {
      logger.error('Failed to fetch audit logs', { error: error.message, filters });
      throw new Error('Failed to fetch audit logs');
    }

    return data || [];
  }

  /**
   * Cleanup old audit logs based on retention policy
   */
  async cleanupOldAuditLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.audit.retentionDays);

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      logger.error('Audit log cleanup failed', { error: error.message });
      return 0;
    }

    const deletedCount = data?.length || 0;
    logger.info(`Cleaned up ${deletedCount} old audit logs`);
    return deletedCount;
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

export default auditLogger;