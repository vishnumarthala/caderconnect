/**
 * SENTINEL INPUT VALIDATION & SANITIZATION SYSTEM
 * Enterprise-grade input validation with comprehensive security controls
 */

import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import validator from 'validator';
import { config } from './config';
import { auditLogger } from './audit-logger';

// Security validation schemas
export const securitySchemas = {
  // Email validation with domain restrictions
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .refine((email) => {
      const domain = email.split('@')[1];
      const blockedDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];
      return !blockedDomains.includes(domain);
    }, 'Email domain not allowed'),

  // Password validation with security requirements
  password: z.string()
    .min(config.security.passwordMinLength, `Password must be at least ${config.security.passwordMinLength} characters`)
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .refine((password) => {
      // Check for common weak passwords
      const weakPasswords = [
        'password', '123456', 'qwerty', 'admin', 'root',
        'password123', 'admin123', 'qwerty123'
      ];
      return !weakPasswords.includes(password.toLowerCase());
    }, 'Password is too common'),

  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // User role validation
  userRole: z.enum(['admin', 'analyst', 'operator', 'viewer']),

  // IP address validation
  ipAddress: z.string().refine((ip) => validator.isIP(ip), 'Invalid IP address'),

  // File validation
  filename: z.string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long')
    .refine((filename) => {
      // Block dangerous file patterns
      const dangerousPatterns = [
        /\.\./,  // Path traversal
        /[<>:"|?*]/,  // Invalid characters
        /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
      ];
      return !dangerousPatterns.some(pattern => pattern.test(filename));
    }, 'Invalid filename'),

  // URL validation with protocol restrictions
  url: z.string().url().refine((url) => {
    const allowedProtocols = ['http:', 'https:'];
    try {
      const parsed = new URL(url);
      return allowedProtocols.includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'Invalid or insecure URL'),

  // JSON validation with size limits
  json: z.string()
    .max(1024 * 1024, 'JSON payload too large') // 1MB limit
    .refine((jsonStr) => {
      try {
        JSON.parse(jsonStr);
        return true;
      } catch {
        return false;
      }
    }, 'Invalid JSON format'),

  // Search query validation
  searchQuery: z.string()
    .min(1, 'Search query required')
    .max(1000, 'Search query too long')
    .refine((query) => {
      // Block SQL injection patterns
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
        /(UNION|OR|AND)\s+\d+\s*=\s*\d+/i,
        /['";]/,
      ];
      return !sqlPatterns.some(pattern => pattern.test(query));
    }, 'Invalid search query'),

  // Pagination parameters
  pagination: z.object({
    page: z.number().int().min(1).max(10000),
    limit: z.number().int().min(1).max(1000),
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};

// Input sanitization utilities
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHtml(input: string, options?: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
  }): string {
    const defaultOptions = {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: {},
      allowedSchemes: ['http', 'https', 'mailto'],
      disallowedTagsMode: 'discard',
      enforceHtmlBoundary: true,
    };

    return sanitizeHtml(input, {
      ...defaultOptions,
      ...options,
    });
  }

  /**
   * Sanitize text input to remove dangerous characters
   */
  static sanitizeText(input: string): string {
    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Remove potential script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    return sanitized;
  }

  /**
   * Sanitize filename to prevent path traversal and other attacks
   */
  static sanitizeFilename(filename: string): string {
    // Remove path components
    let sanitized = filename.replace(/^.*[\\\/]/, '');
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
    
    // Prevent double extensions
    sanitized = sanitized.replace(/\.+/g, '.');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      sanitized = sanitized.substring(0, 255 - ext.length) + ext;
    }
    
    return sanitized;
  }

  /**
   * Sanitize SQL-like input to prevent injection
   */
  static sanitizeSqlInput(input: string): string {
    // Remove SQL keywords and dangerous characters
    return input
      .replace(/[\x00\x08\x09\x1a\n\r"'\\\%]/g, '')
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/gi, '')
      .trim();
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJson(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeText(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeJson(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeText(key);
        sanitized[sanitizedKey] = this.sanitizeJson(value);
      }
      return sanitized;
    }
    
    return input;
  }
}

// Request validation middleware
export class RequestValidator {
  /**
   * Validate request body against schema
   */
  static validateBody<T>(schema: z.ZodSchema<T>) {
    return (req: any, res: any, next: any) => {
      try {
        // Parse and validate body
        const result = schema.safeParse(req.body);
        
        if (!result.success) {
          const errors = result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          }));

          // Log validation failure
          auditLogger.logSecurityEvent({
            action: 'security_violation',
            severity: 'medium',
            details: {
              type: 'validation_failure',
              errors,
              body: req.body,
              url: req.url,
              method: req.method,
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          });

          return res.status(400).json({
            error: 'Validation failed',
            details: errors,
          });
        }

        // Sanitize validated data
        req.body = InputSanitizer.sanitizeJson(result.data);
        next();
      } catch (error) {
        console.error('Validation middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  /**
   * Validate query parameters
   */
  static validateQuery<T>(schema: z.ZodSchema<T>) {
    return (req: any, res: any, next: any) => {
      try {
        const result = schema.safeParse(req.query);
        
        if (!result.success) {
          const errors = result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }));

          return res.status(400).json({
            error: 'Query validation failed',
            details: errors,
          });
        }

        req.query = result.data;
        next();
      } catch (error) {
        console.error('Query validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  /**
   * Validate URL parameters
   */
  static validateParams<T>(schema: z.ZodSchema<T>) {
    return (req: any, res: any, next: any) => {
      try {
        const result = schema.safeParse(req.params);
        
        if (!result.success) {
          const errors = result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }));

          return res.status(400).json({
            error: 'Parameter validation failed',
            details: errors,
          });
        }

        req.params = result.data;
        next();
      } catch (error) {
        console.error('Parameter validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(options: {
    maxSize?: number;
    allowedTypes?: string[];
    maxFiles?: number;
  } = {}) {
    return (req: any, res: any, next: any) => {
      try {
        const files = req.files || [];
        const maxSize = options.maxSize || config.fileUpload.maxSize;
        const allowedTypes = options.allowedTypes || config.fileUpload.allowedTypes;
        const maxFiles = options.maxFiles || 10;

        // Check file count
        if (files.length > maxFiles) {
          return res.status(400).json({
            error: `Too many files. Maximum ${maxFiles} allowed.`,
          });
        }

        // Validate each file
        for (const file of files) {
          // Check file size
          if (file.size > maxSize) {
            return res.status(400).json({
              error: `File ${file.originalname} is too large. Maximum size: ${maxSize} bytes.`,
            });
          }

          // Check file type
          const fileExt = file.originalname.split('.').pop()?.toLowerCase();
          if (!fileExt || !allowedTypes.includes(fileExt)) {
            return res.status(400).json({
              error: `File type .${fileExt} not allowed. Allowed types: ${allowedTypes.join(', ')}.`,
            });
          }

          // Sanitize filename
          file.originalname = InputSanitizer.sanitizeFilename(file.originalname);

          // Check for executable file signatures
          if (this.isExecutableFile(file.buffer)) {
            auditLogger.logSecurityEvent({
              action: 'security_violation',
              severity: 'high',
              details: {
                type: 'malicious_file_upload',
                filename: file.originalname,
                mimetype: file.mimetype,
              },
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
            });

            return res.status(400).json({
              error: 'File appears to be executable or malicious.',
            });
          }
        }

        next();
      } catch (error) {
        console.error('File validation error:', error);
        res.status(500).json({ error: 'File validation failed' });
      }
    };
  }

  /**
   * Check if file is executable based on magic bytes
   */
  private static isExecutableFile(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) return false;

    const signatures = [
      // Windows PE
      [0x4D, 0x5A], // MZ
      // ELF
      [0x7F, 0x45, 0x4C, 0x46], // ELF
      // Mach-O
      [0xFE, 0xED, 0xFA, 0xCE],
      [0xFE, 0xED, 0xFA, 0xCF],
      // Shell scripts
      [0x23, 0x21], // #!
    ];

    for (const signature of signatures) {
      if (buffer.subarray(0, signature.length).equals(Buffer.from(signature))) {
        return true;
      }
    }

    return false;
  }
}

// Common validation schemas for API endpoints
export const apiSchemas = {
  // Authentication
  login: z.object({
    email: securitySchemas.email,
    password: z.string().min(1, 'Password required'),
    mfaCode: z.string().optional(),
  }),

  register: z.object({
    email: securitySchemas.email,
    password: securitySchemas.password,
    firstName: z.string().min(1, 'First name required').max(50),
    lastName: z.string().min(1, 'Last name required').max(50),
    role: securitySchemas.userRole.optional(),
  }),

  // User management
  updateUser: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: securitySchemas.email.optional(),
    role: securitySchemas.userRole.optional(),
    isActive: z.boolean().optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: securitySchemas.password,
  }),

  // File operations
  fileUpload: z.object({
    description: z.string().max(500).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    isPublic: z.boolean().optional(),
  }),

  // Search and filtering
  search: z.object({
    query: securitySchemas.searchQuery,
    filters: z.record(z.any()).optional(),
    ...securitySchemas.pagination.shape,
  }),

  // Alert management
  createAlert: z.object({
    title: z.string().min(1, 'Title required').max(200),
    description: z.string().min(1, 'Description required').max(1000),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    category: z.string().min(1).max(50),
  }),

  updateAlert: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(1000).optional(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
    status: z.enum(['active', 'acknowledged', 'resolved', 'escalated']).optional(),
    assignedTo: securitySchemas.uuid.optional(),
  }),

  // AI Chat
  chatMessage: z.object({
    message: z.string()
      .min(1, 'Message required')
      .max(4000, 'Message too long')
      .refine((msg) => {
        // Check for prompt injection attempts
        const injectionPatterns = [
          /ignore\s+(previous|all)\s+instructions/i,
          /system\s*:\s*you\s+are/i,
          /\[INST\]/i, // Llama instruction format
          /###\s*Human:/i,
          /assistant\s*:/i,
        ];
        return !injectionPatterns.some(pattern => pattern.test(msg));
      }, 'Message contains prohibited content'),
    conversationId: securitySchemas.uuid.optional(),
    model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3']).optional(),
  }),

  // URL parameters
  idParam: z.object({
    id: securitySchemas.uuid,
  }),

  // Query parameters
  listQuery: securitySchemas.pagination,
};

// Export validation utilities
export const validateRequest = RequestValidator;
export const sanitize = InputSanitizer;

export default {
  schemas: securitySchemas,
  apiSchemas,
  validateRequest,
  sanitize,
};