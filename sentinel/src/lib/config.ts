/**
 * SENTINEL SECURITY CONFIGURATION
 * Enterprise-grade configuration management with validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Security configuration schema with development-friendly validation
const configSchema = z.object({
  // Supabase Configuration
  supabase: z.object({
    url: z.string().min(1, 'Supabase URL required').refine(
      (url) => process.env.NODE_ENV === 'development' || z.string().url().safeParse(url).success,
      'Invalid Supabase URL (except in development)'
    ),
    anonKey: z.string().min(1, 'Supabase anon key required'),
    serviceRoleKey: z.string().min(1, 'Supabase service role key required'),
  }),

  // JWT Configuration
  jwt: z.object({
    secret: z.string().min(32, 'JWT secret must be at least 32 characters'),
    refreshSecret: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
    algorithm: z.literal('HS256'),
    issuer: z.string().default('sentinel-api'),
    audience: z.string().default('sentinel-users'),
  }),

  // Encryption Configuration
  encryption: z.object({
    key: z.string().min(32, 'Encryption key must be at least 32 characters').refine(
      (key) => process.env.NODE_ENV === 'development' || key.length === 32,
      'Encryption key must be exactly 32 characters in production'
    ),
    databaseKey: z.string().min(32, 'Database encryption key must be at least 32 characters').refine(
      (key) => process.env.NODE_ENV === 'development' || key.length === 32,
      'Database encryption key must be exactly 32 characters in production'
    ),
    algorithm: z.string().default('aes-256-gcm'),
  }),

  // Security Configuration
  security: z.object({
    bcryptRounds: z.number().min(10).max(15).default(12),
    sessionTimeout: z.number().positive().default(3600), // 1 hour
    refreshTokenTimeout: z.number().positive().default(604800), // 7 days
    maxLoginAttempts: z.number().positive().default(5),
    lockoutDuration: z.number().positive().default(900), // 15 minutes
    passwordMinLength: z.number().min(8).default(12),
    passwordRequireSpecialChars: z.boolean().default(true),
    mfaRequired: z.boolean().default(false),
  }),

  // Rate Limiting Configuration
  rateLimit: z.object({
    windowMs: z.number().positive().default(900000), // 15 minutes
    maxRequests: z.number().positive().default(100),
    authMaxRequests: z.number().positive().default(10),
    skipSuccessfulRequests: z.boolean().default(false),
    skipFailedRequests: z.boolean().default(false),
  }),

  // File Upload Configuration
  fileUpload: z.object({
    maxSize: z.number().positive().default(10485760), // 10MB
    allowedTypes: z.array(z.string()).default([
      'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'
    ]),
    scanEnabled: z.boolean().default(true),
    quarantinePath: z.string().default('/tmp/quarantine'),
    uploadPath: z.string().default('/tmp/uploads'),
  }),

  // API Configuration
  api: z.object({
    version: z.string().default('v1'),
    corsOrigins: z.array(z.string().url()).min(1, 'At least one CORS origin required'),
    timeout: z.number().positive().default(30000), // 30 seconds
    maxRequestSize: z.string().default('10mb'),
  }),

  // Audit Logging Configuration
  audit: z.object({
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    retentionDays: z.number().positive().default(365),
    enableRequestLogging: z.boolean().default(true),
    enableQueryLogging: z.boolean().default(false), // Sensitive data
    logSensitiveData: z.boolean().default(false),
  }),

  // Background Jobs Configuration
  jobs: z.object({
    redisUrl: z.string().url().optional(),
    workerConcurrency: z.number().positive().default(5),
    retryAttempts: z.number().min(0).default(3),
    retryDelay: z.number().positive().default(5000), // 5 seconds
  }),

  // Monitoring & Alerts Configuration
  monitoring: z.object({
    securityWebhookUrl: z.string().optional().refine(
      (url) => !url || z.string().url().safeParse(url).success,
      'Invalid webhook URL'
    ),
    alertEmail: z.string().email().optional(),
    enableSecurityAlerts: z.boolean().default(true),
    enablePerformanceMonitoring: z.boolean().default(true),
    metricsRetentionDays: z.number().positive().default(30),
  }),

  // Environment Configuration
  environment: z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: z.number().positive().default(3000),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    enableDebug: z.boolean().default(false),
  }),
});

// Type inference from schema
export type Config = z.infer<typeof configSchema>;

/**
 * Parse and validate environment variables
 */
function parseEnvironment(): Config {
  const rawConfig = {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      algorithm: 'HS256' as const,
      issuer: process.env.JWT_ISSUER || 'sentinel-api',
      audience: process.env.JWT_AUDIENCE || 'sentinel-users',
    },
    encryption: {
      key: process.env.ENCRYPTION_KEY,
      databaseKey: process.env.DATABASE_ENCRYPTION_KEY,
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    },
    security: {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600'),
      refreshTokenTimeout: parseInt(process.env.REFRESH_TOKEN_TIMEOUT || '604800'),
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900'),
      passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
      passwordRequireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
      mfaRequired: process.env.MFA_REQUIRED === 'true',
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10'),
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
      skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
    },
    fileUpload: {
      maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
      allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
        'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'
      ],
      scanEnabled: process.env.UPLOAD_SCAN_ENABLED !== 'false',
      quarantinePath: process.env.QUARANTINE_PATH || '/tmp/quarantine',
      uploadPath: process.env.UPLOAD_PATH || '/tmp/uploads',
    },
    api: {
      version: process.env.API_VERSION || 'v1',
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      timeout: parseInt(process.env.API_TIMEOUT || '30000'),
      maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    },
    audit: {
      logLevel: (process.env.AUDIT_LOG_LEVEL as any) || 'info',
      retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365'),
      enableRequestLogging: process.env.AUDIT_REQUEST_LOGGING !== 'false',
      enableQueryLogging: process.env.AUDIT_QUERY_LOGGING === 'true',
      logSensitiveData: process.env.AUDIT_LOG_SENSITIVE_DATA === 'true',
    },
    jobs: {
      redisUrl: process.env.JOB_QUEUE_REDIS_URL,
      workerConcurrency: parseInt(process.env.JOB_WORKER_CONCURRENCY || '5'),
      retryAttempts: parseInt(process.env.JOB_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.JOB_RETRY_DELAY || '5000'),
    },
    monitoring: {
      securityWebhookUrl: process.env.SECURITY_WEBHOOK_URL,
      alertEmail: process.env.ALERT_EMAIL,
      enableSecurityAlerts: process.env.ENABLE_SECURITY_ALERTS !== 'false',
      enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING !== 'false',
      metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '30'),
    },
    environment: {
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      port: parseInt(process.env.PORT || '3000'),
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      enableDebug: process.env.ENABLE_DEBUG === 'true',
    },
  };

  // Validate configuration
  const result = configSchema.safeParse(rawConfig);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ).join('\n');
    
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  return result.data;
}

/**
 * Validate critical security settings
 */
function validateSecurityConfig(config: Config): void {
  const errors: string[] = [];

  // Check for development-specific security issues in production
  if (config.environment.nodeEnv === 'production') {
    if (config.jwt.secret.includes('your_') || config.jwt.secret.length < 32) {
      errors.push('Production JWT secret must be properly configured');
    }

    if (config.encryption.key.includes('your_') || config.encryption.key.length !== 32) {
      errors.push('Production encryption key must be properly configured');
    }

    if (config.api.corsOrigins.includes('http://localhost:3000')) {
      errors.push('Production CORS origins must not include localhost');
    }

    if (config.environment.enableDebug) {
      errors.push('Debug mode should not be enabled in production');
    }

    if (config.audit.logSensitiveData) {
      errors.push('Sensitive data logging should not be enabled in production');
    }
  }

  // Check for weak security settings
  if (config.security.bcryptRounds < 10) {
    errors.push('BCrypt rounds should be at least 10 for security');
  }

  if (config.security.sessionTimeout > 86400) { // 24 hours
    errors.push('Session timeout should not exceed 24 hours');
  }

  if (config.rateLimit.maxRequests > 1000) {
    errors.push('Rate limit max requests seems too high for security');
  }

  if (errors.length > 0) {
    throw new Error(`Security validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Create fallback development configuration
 */
function createFallbackDevConfig(): Config {
  return {
    supabase: {
      url: 'https://dev.supabase.co',
      anonKey: 'dev_anon_key_placeholder_for_development_testing_only',
      serviceRoleKey: 'dev_service_role_key_placeholder_for_development_testing_only',
    },
    jwt: {
      secret: 'dev_jwt_secret_key_for_testing_only_must_be_32_chars_min',
      refreshSecret: 'dev_refresh_secret_key_for_testing_only_must_be_32_chars_min',
      algorithm: 'HS256',
      issuer: 'sentinel-dev',
      audience: 'sentinel-dev-users',
    },
    encryption: {
      key: 'dev_encryption_key_32_chars_long',
      databaseKey: 'dev_database_encryption_key_here',
      algorithm: 'aes-256-gcm',
    },
    security: {
      bcryptRounds: 10,
      sessionTimeout: 3600,
      refreshTokenTimeout: 604800,
      maxLoginAttempts: 5,
      lockoutDuration: 900,
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      mfaRequired: false,
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 1000,
      authMaxRequests: 50,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    fileUpload: {
      maxSize: 10485760,
      allowedTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'],
      scanEnabled: false,
      quarantinePath: './quarantine',
      uploadPath: './uploads',
    },
    api: {
      version: 'v1',
      corsOrigins: ['http://localhost:3000'],
      timeout: 30000,
      maxRequestSize: '10mb',
    },
    audit: {
      logLevel: 'info',
      retentionDays: 30,
      enableRequestLogging: true,
      enableQueryLogging: false,
      logSensitiveData: false,
    },
    jobs: {
      redisUrl: undefined,
      workerConcurrency: 5,
      retryAttempts: 3,
      retryDelay: 5000,
    },
    monitoring: {
      securityWebhookUrl: undefined,
      alertEmail: undefined,
      enableSecurityAlerts: false,
      enablePerformanceMonitoring: true,
      metricsRetentionDays: 7,
    },
    environment: {
      nodeEnv: 'development',
      port: 3000,
      logLevel: 'debug',
      enableDebug: true,
    },
  };
}

/**
 * Load and validate configuration
 */
let config: Config;

try {
  config = parseEnvironment();
  
  // Only run security validation in production
  if (process.env.NODE_ENV === 'production') {
    validateSecurityConfig(config);
  }
  
  // Log configuration status (without sensitive data)
  console.log('✅ Sentinel configuration loaded successfully');
  console.log(`🌍 Environment: ${config.environment.nodeEnv}`);
  console.log(`🔒 Security: BCrypt rounds ${config.security.bcryptRounds}, MFA ${config.security.mfaRequired ? 'enabled' : 'disabled'}`);
  console.log(`⚡ Rate limiting: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs}ms`);
  
} catch (error) {
  console.error('❌ Configuration error:', error);
  
  // In development, use fallback configuration instead of exiting
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Using fallback development configuration');
    config = createFallbackDevConfig();
  } else {
    process.exit(1);
  }
}

export { config };

/**
 * Security utilities for configuration
 */
export const configUtils = {
  isProduction: () => config.environment.nodeEnv === 'production',
  isDevelopment: () => config.environment.nodeEnv === 'development',
  isTest: () => config.environment.nodeEnv === 'test',
  
  getSecurityHeaders: () => ({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ${config.supabase.url}`,
  }),
  
  getCorsOptions: () => ({
    origin: config.api.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours
  }),
};

export default config;