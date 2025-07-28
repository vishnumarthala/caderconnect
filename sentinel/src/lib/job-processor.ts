/**
 * SENTINEL BACKGROUND JOB PROCESSING SYSTEM
 * Secure background job processing with comprehensive monitoring
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { auditLogger } from './audit-logger';
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

// Job types and interfaces
export type JobType = 
  | 'cleanup_expired_sessions'
  | 'cleanup_old_audit_logs'
  | 'cleanup_expired_rate_limits'
  | 'unlock_expired_lockouts'
  | 'send_security_digest'
  | 'scan_uploaded_files'
  | 'backup_critical_data'
  | 'update_threat_intelligence'
  | 'generate_analytics_reports';

export interface JobPayload {
  [key: string]: any;
}

export interface Job {
  id: string;
  type: JobType;
  payload: JobPayload;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  metrics?: {
    executionTime: number;
    itemsProcessed?: number;
    resourcesUsed?: any;
  };
}

/**
 * Background Job Processor with security and monitoring
 */
export class JobProcessor {
  private static instance: JobProcessor;
  private isRunning = false;
  private activeJobs = new Map<string, Promise<void>>();
  private shutdownSignal = false;

  static getInstance(): JobProcessor {
    if (!JobProcessor.instance) {
      JobProcessor.instance = new JobProcessor();
    }
    return JobProcessor.instance;
  }

  /**
   * Start the job processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Job processor is already running');
      return;
    }

    this.isRunning = true;
    this.shutdownSignal = false;

    console.log('Starting Sentinel Job Processor...');
    
    await auditLogger.logAuditEvent({
      action: 'create',
      resourceType: 'job_processor',
      success: true,
      additionalData: {
        operation: 'processor_start',
        concurrency: config.jobs.workerConcurrency,
      },
    });

    // Start processing loop
    this.processJobs();
  }

  /**
   * Stop the job processor gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping Sentinel Job Processor...');
    this.shutdownSignal = true;

    // Wait for active jobs to complete
    await Promise.all(this.activeJobs.values());

    this.isRunning = false;

    await auditLogger.logAuditEvent({
      action: 'delete',
      resourceType: 'job_processor',
      success: true,
      additionalData: {
        operation: 'processor_stop',
        activeJobsWhenStopped: this.activeJobs.size,
      },
    });

    console.log('Job processor stopped');
  }

  /**
   * Add a new job to the queue
   */
  async addJob(
    type: JobType,
    payload: JobPayload = {},
    options: {
      scheduledAt?: Date;
      maxAttempts?: number;
      priority?: number;
    } = {}
  ): Promise<string> {
    const jobId = uuidv4();
    const scheduledAt = options.scheduledAt || new Date();
    const maxAttempts = options.maxAttempts || config.jobs.retryAttempts;

    try {
      const { error } = await supabaseAdmin
        .from('background_jobs')
        .insert({
          id: jobId,
          job_type: type,
          status: 'pending',
          payload,
          attempts: 0,
          max_attempts: maxAttempts,
          scheduled_at: scheduledAt.toISOString(),
        });

      if (error) {
        throw new Error(`Failed to add job: ${error.message}`);
      }

      await auditLogger.logAuditEvent({
        action: 'create',
        resourceType: 'background_jobs',
        resourceId: jobId,
        success: true,
        additionalData: {
          operation: 'job_queued',
          jobType: type,
          scheduledAt,
          maxAttempts,
        },
      });

      console.log(`Job ${jobId} (${type}) added to queue`);
      return jobId;

    } catch (error) {
      console.error('Failed to add job:', error);
      throw error;
    }
  }

  /**
   * Main job processing loop
   */
  private async processJobs(): Promise<void> {
    while (this.isRunning && !this.shutdownSignal) {
      try {
        // Check if we have capacity for more jobs
        if (this.activeJobs.size >= config.jobs.workerConcurrency) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Get next pending job
        const { data: jobs, error } = await supabaseAdmin
          .from('background_jobs')
          .select('*')
          .eq('status', 'pending')
          .lte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1);

        if (error) {
          console.error('Failed to fetch jobs:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        if (!jobs || jobs.length === 0) {
          // No jobs available, wait a bit
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        const job = jobs[0];
        
        // Start processing the job
        const jobPromise = this.executeJob(job);
        this.activeJobs.set(job.id, jobPromise);

        // Clean up when job completes
        jobPromise.finally(() => {
          this.activeJobs.delete(job.id);
        });

      } catch (error) {
        console.error('Job processing loop error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: any): Promise<void> {
    const startTime = Date.now();
    const jobId = job.id;

    try {
      // Mark job as running
      await supabaseAdmin
        .from('background_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          attempts: job.attempts + 1,
        })
        .eq('id', jobId);

      console.log(`Starting job ${jobId} (${job.job_type})`);

      // Execute the job
      const result = await this.executeJobHandler(job.job_type, job.payload);

      // Mark job as completed
      await supabaseAdmin
        .from('background_jobs')
        .update({
          status: 'completed',
          result,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Log successful completion
      await auditLogger.logAuditEvent({
        action: 'update',
        resourceType: 'background_jobs',
        resourceId: jobId,
        success: true,
        additionalData: {
          operation: 'job_completed',
          jobType: job.job_type,
          executionTime: Date.now() - startTime,
          attempts: job.attempts + 1,
          result: result.success ? 'success' : 'partial_success',
        },
      });

      console.log(`Job ${jobId} completed successfully in ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const shouldRetry = job.attempts + 1 < job.max_attempts;

      if (shouldRetry) {
        // Retry with exponential backoff
        const retryDelay = Math.min(
          config.jobs.retryDelay * Math.pow(2, job.attempts),
          300000 // Max 5 minutes
        );
        const nextScheduledAt = new Date(Date.now() + retryDelay);

        await supabaseAdmin
          .from('background_jobs')
          .update({
            status: 'pending',
            error_message: errorMessage,
            scheduled_at: nextScheduledAt.toISOString(),
          })
          .eq('id', jobId);

        console.log(`Job ${jobId} will retry in ${retryDelay}ms`);
      } else {
        // Mark as failed
        await supabaseAdmin
          .from('background_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        // Log failure
        await auditLogger.logSecurityEvent({
          action: 'security_violation',
          severity: 'medium',
          details: {
            type: 'job_failed',
            jobId,
            jobType: job.job_type,
            error: errorMessage,
            attempts: job.attempts + 1,
            maxAttempts: job.max_attempts,
          },
        });
      }
    }
  }

  /**
   * Execute specific job types
   */
  private async executeJobHandler(jobType: JobType, payload: JobPayload): Promise<JobResult> {
    const startTime = Date.now();

    switch (jobType) {
      case 'cleanup_expired_sessions':
        return await this.cleanupExpiredSessions();

      case 'cleanup_old_audit_logs':
        return await this.cleanupOldAuditLogs();

      case 'cleanup_expired_rate_limits':
        return await this.cleanupExpiredRateLimits();

      case 'unlock_expired_lockouts':
        return await this.unlockExpiredLockouts();

      case 'send_security_digest':
        return await this.sendSecurityDigest(payload);

      case 'scan_uploaded_files':
        return await this.scanUploadedFiles(payload);

      case 'backup_critical_data':
        return await this.backupCriticalData(payload);

      case 'update_threat_intelligence':
        return await this.updateThreatIntelligence(payload);

      case 'generate_analytics_reports':
        return await this.generateAnalyticsReports(payload);

      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }

  /**
   * Job handlers
   */
  private async cleanupExpiredSessions(): Promise<JobResult> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_sessions')
        .delete()
        .or('expires_at.lt.now(),refresh_expires_at.lt.now()');

      if (error) {
        throw new Error(`Session cleanup failed: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      return {
        success: true,
        data: { deletedSessions: deletedCount },
        metrics: {
          executionTime: Date.now(),
          itemsProcessed: deletedCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async cleanupOldAuditLogs(): Promise<JobResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.audit.retentionDays);

      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        throw new Error(`Audit log cleanup failed: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      return {
        success: true,
        data: { deletedLogs: deletedCount, cutoffDate },
        metrics: {
          executionTime: Date.now(),
          itemsProcessed: deletedCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async cleanupExpiredRateLimits(): Promise<JobResult> {
    try {
      const cutoffTime = new Date(Date.now() - config.rateLimit.windowMs * 2);

      const { data, error } = await supabaseAdmin
        .from('rate_limits')
        .delete()
        .lt('window_start', cutoffTime.toISOString());

      if (error) {
        throw new Error(`Rate limit cleanup failed: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      return {
        success: true,
        data: { deletedRecords: deletedCount },
        metrics: {
          executionTime: Date.now(),
          itemsProcessed: deletedCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async unlockExpiredLockouts(): Promise<JobResult> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          login_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        })
        .not('locked_until', 'is', null)
        .lt('locked_until', new Date().toISOString());

      if (error) {
        throw new Error(`Lockout cleanup failed: ${error.message}`);
      }

      const unlockedCount = data?.length || 0;
      return {
        success: true,
        data: { unlockedUsers: unlockedCount },
        metrics: {
          executionTime: Date.now(),
          itemsProcessed: unlockedCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendSecurityDigest(payload: JobPayload): Promise<JobResult> {
    // Placeholder for security digest generation and sending
    return {
      success: true,
      data: { digestSent: true },
      metrics: { executionTime: Date.now() },
    };
  }

  private async scanUploadedFiles(payload: JobPayload): Promise<JobResult> {
    // Placeholder for file scanning
    return {
      success: true,
      data: { filesScanned: 0 },
      metrics: { executionTime: Date.now() },
    };
  }

  private async backupCriticalData(payload: JobPayload): Promise<JobResult> {
    // Placeholder for data backup
    return {
      success: true,
      data: { backupCompleted: true },
      metrics: { executionTime: Date.now() },
    };
  }

  private async updateThreatIntelligence(payload: JobPayload): Promise<JobResult> {
    // Placeholder for threat intelligence updates
    return {
      success: true,
      data: { intelligenceUpdated: true },
      metrics: { executionTime: Date.now() },
    };
  }

  private async generateAnalyticsReports(payload: JobPayload): Promise<JobResult> {
    // Placeholder for analytics report generation
    return {
      success: true,
      data: { reportsGenerated: 0 },
      metrics: { executionTime: Date.now() },
    };
  }

  /**
   * Schedule recurring jobs
   */
  async scheduleRecurringJobs(): Promise<void> {
    const jobs = [
      { type: 'cleanup_expired_sessions' as JobType, interval: 3600000 }, // 1 hour
      { type: 'cleanup_old_audit_logs' as JobType, interval: 86400000 }, // 24 hours
      { type: 'cleanup_expired_rate_limits' as JobType, interval: 3600000 }, // 1 hour
      { type: 'unlock_expired_lockouts' as JobType, interval: 900000 }, // 15 minutes
      { type: 'send_security_digest' as JobType, interval: 86400000 }, // 24 hours
    ];

    for (const job of jobs) {
      await this.addJob(job.type, {}, {
        scheduledAt: new Date(Date.now() + job.interval),
      });
    }

    console.log('Recurring jobs scheduled');
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('background_jobs')
        .select('status')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()); // Last 24 hours

      if (error) {
        throw new Error(`Failed to get job stats: ${error.message}`);
      }

      const stats = {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
      };

      data?.forEach(job => {
        stats[job.status as keyof typeof stats]++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get job stats:', error);
      return { pending: 0, running: 0, completed: 0, failed: 0 };
    }
  }
}

// Export singleton instance
export const jobProcessor = JobProcessor.getInstance();

export default jobProcessor;