/**
 * SENTINEL SECURE FILE UPLOAD API
 * Enterprise-grade file upload with security scanning and comprehensive controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sharp from 'sharp';
import { auditLogger } from '@/lib/audit-logger';
import { config } from '@/lib/config';

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

// File type configurations
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/json',
]);

const EXECUTABLE_SIGNATURES = [
  // Windows PE
  Buffer.from([0x4D, 0x5A]), // MZ
  // ELF
  Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF
  // Mach-O
  Buffer.from([0xFE, 0xED, 0xFA, 0xCE]),
  Buffer.from([0xFE, 0xED, 0xFA, 0xCF]),
  // Shell scripts
  Buffer.from([0x23, 0x21]), // #!
  // Java class
  Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]),
];

interface FileMetadata {
  originalName: string;
  sanitizedName: string;
  size: number;
  mimeType: string;
  hash: string;
  virusScanResult?: 'clean' | 'infected' | 'suspicious' | 'error';
  contentAnalysis?: any;
}

/**
 * POST /api/documents/upload - Secure file upload with comprehensive scanning
 * Requires: operator role or higher
 */
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const sessionId = req.headers.get('x-session-id');

  try {
    // Authorization check - requires operator role or higher
    const allowedRoles = ['admin', 'analyst', 'operator'];
    if (!allowedRoles.includes(userRole || '')) {
      await auditLogger.logSecurityEvent({
        userId,
        sessionId,
        action: 'permission_denied',
        severity: 'medium',
        details: {
          type: 'insufficient_permissions',
          operation: 'file_upload',
          requiredRoles: allowedRoles,
          currentRole: userRole,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for file upload' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const description = formData.get('description') as string || '';
    const tags = formData.get('tags') as string || '';
    const isPublic = formData.get('isPublic') === 'true';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file count
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Too many files. Maximum 10 files allowed.' },
        { status: 400 }
      );
    }

    const uploadResults = [];
    const quarantinedFiles = [];

    // Process each file
    for (const file of files) {
      try {
        const fileResult = await processFileUpload(file, userId!, description, tags, isPublic, requestId);
        
        if (fileResult.quarantined) {
          quarantinedFiles.push(fileResult);
        } else {
          uploadResults.push(fileResult);
        }

      } catch (error) {
        console.error(`File processing error for ${file.name}:`, error);
        
        await auditLogger.logSecurityEvent({
          userId,
          sessionId,
          action: 'file_upload',
          severity: 'high',
          details: {
            type: 'file_processing_error',
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('User-Agent') || undefined,
          requestId,
        });

        uploadResults.push({
          fileName: file.name,
          success: false,
          error: 'File processing failed',
        });
      }
    }

    // Log successful uploads
    if (uploadResults.length > 0) {
      await auditLogger.logAuditEvent({
        userId,
        sessionId,
        action: 'file_upload',
        resourceType: 'documents',
        success: true,
        additionalData: {
          operation: 'bulk_file_upload',
          filesUploaded: uploadResults.length,
          filesQuarantined: quarantinedFiles.length,
          totalSize: uploadResults.reduce((sum, file) => sum + (file.size || 0), 0),
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('User-Agent') || undefined,
        requestId,
      });
    }

    const response = {
      success: true,
      data: {
        uploaded: uploadResults,
        quarantined: quarantinedFiles,
        summary: {
          totalFiles: files.length,
          successful: uploadResults.filter(f => f.success).length,
          failed: uploadResults.filter(f => !f.success).length,
          quarantined: quarantinedFiles.length,
        },
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('File upload API error:', error);

    await auditLogger.logSecurityEvent({
      userId,
      sessionId,
      action: 'security_violation',
      severity: 'high',
      details: {
        type: 'api_error',
        operation: 'file_upload',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      requestId,
    });

    return NextResponse.json(
      { error: 'File upload service unavailable' },
      { status: 500 }
    );
  }
}

/**
 * Process individual file upload with comprehensive security checks
 */
async function processFileUpload(
  file: File,
  userId: string,
  description: string,
  tags: string,
  isPublic: boolean,
  requestId: string
): Promise<any> {
  const startTime = Date.now();

  // Basic file validation
  if (file.size > config.fileUpload.maxSize) {
    return {
      fileName: file.name,
      success: false,
      error: `File size exceeds maximum allowed (${config.fileUpload.maxSize} bytes)`,
    };
  }

  if (file.size === 0) {
    return {
      fileName: file.name,
      success: false,
      error: 'Empty file not allowed',
    };
  }

  // MIME type validation
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    await auditLogger.logSecurityEvent({
      userId,
      action: 'security_violation',
      severity: 'medium',
      details: {
        type: 'disallowed_file_type',
        fileName: file.name,
        mimeType: file.type,
      },
      requestId,
    });

    return {
      fileName: file.name,
      success: false,
      error: `File type ${file.type} not allowed`,
    };
  }

  // Read file buffer for analysis
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Generate file hash
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Check for duplicate files
  const { data: existingFile } = await supabaseAdmin
    .from('documents')
    .select('id, filename')
    .eq('file_hash', hash)
    .single();

  if (existingFile) {
    return {
      fileName: file.name,
      success: false,
      error: 'File already exists',
      existingFileId: existingFile.id,
    };
  }

  // Perform security scans
  const securityResult = await performSecurityScan(buffer, file.name, file.type);

  if (securityResult.quarantine) {
    // Move to quarantine
    const quarantineResult = await quarantineFile(file, buffer, hash, userId, securityResult.reason, requestId);
    return {
      fileName: file.name,
      quarantined: true,
      reason: securityResult.reason,
      quarantineId: quarantineResult.id,
    };
  }

  // Sanitize filename
  const sanitizedName = sanitizeFilename(file.name);
  const uniqueName = `${Date.now()}-${uuidv4()}-${sanitizedName}`;

  // Create upload directory
  const uploadDir = join(process.cwd(), 'uploads', userId);
  await mkdir(uploadDir, { recursive: true });

  // Save file to disk
  const filePath = join(uploadDir, uniqueName);
  await writeFile(filePath, buffer);

  // Process file based on type (extract metadata, generate thumbnails, etc.)
  const processingResult = await processFileContent(buffer, file.type, filePath);

  // Save to database
  const documentId = uuidv4();
  const { data: document, error: dbError } = await supabaseAdmin
    .from('documents')
    .insert({
      id: documentId,
      user_id: userId,
      filename: uniqueName,
      original_filename: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      file_hash: hash,
      status: 'processed',
      scan_results: securityResult,
      processing_metadata: processingResult,
      is_encrypted: false, // Implement encryption if needed
      access_level: isPublic ? 'viewer' : 'operator',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
    })
    .select()
    .single();

  if (dbError) {
    console.error('Database save error:', dbError);
    throw new Error('Failed to save file metadata');
  }

  // Log performance metrics
  await auditLogger.logPerformanceMetric({
    name: 'file_upload_processing_time',
    value: Date.now() - startTime,
    unit: 'ms',
    dimensions: {
      fileSize: file.size,
      fileType: file.type,
      userId,
    },
  });

  return {
    fileName: file.name,
    success: true,
    documentId: document.id,
    size: file.size,
    hash,
    processingTime: Date.now() - startTime,
  };
}

/**
 * Perform comprehensive security scanning on file content
 */
async function performSecurityScan(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{
  quarantine: boolean;
  reason?: string;
  virusScan?: string;
  contentAnalysis?: any;
}> {
  const issues = [];

  // Check for executable file signatures
  for (const signature of EXECUTABLE_SIGNATURES) {
    if (buffer.subarray(0, signature.length).equals(signature)) {
      issues.push('executable_signature_detected');
      break;
    }
  }

  // Check for embedded scripts in various file types
  const contentStr = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
  
  const scriptPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onclick\s*=/i,
    /eval\s*\(/i,
    /document\.write/i,
  ];

  for (const pattern of scriptPatterns) {
    if (pattern.test(contentStr)) {
      issues.push('embedded_script_detected');
      break;
    }
  }

  // Check for suspicious file extensions in filename
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar'];
  const lowerFileName = fileName.toLowerCase();
  
  for (const ext of suspiciousExtensions) {
    if (lowerFileName.includes(ext)) {
      issues.push('suspicious_extension_detected');
      break;
    }
  }

  // Check for polyglot files (files that are valid in multiple formats)
  if (mimeType.startsWith('image/') && contentStr.includes('<?php')) {
    issues.push('polyglot_file_detected');
  }

  // Simulate virus scan (integrate with actual antivirus service)
  const virusScanResult = await simulateVirusScan(buffer);
  
  if (virusScanResult.infected) {
    issues.push('virus_detected');
  }

  // Determine if file should be quarantined
  const shouldQuarantine = issues.length > 0;

  return {
    quarantine: shouldQuarantine,
    reason: issues.join(', '),
    virusScan: virusScanResult.status,
    contentAnalysis: {
      issues,
      fileSize: buffer.length,
      contentPreview: contentStr.substring(0, 200),
    },
  };
}

/**
 * Simulate virus scanning (replace with actual antivirus integration)
 */
async function simulateVirusScan(buffer: Buffer): Promise<{
  status: 'clean' | 'infected' | 'suspicious';
  infected: boolean;
  details?: string;
}> {
  // Simulate scanning delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Check for known malicious patterns
  const maliciousPatterns = [
    Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'), // EICAR test
  ];

  for (const pattern of maliciousPatterns) {
    if (buffer.includes(pattern)) {
      return {
        status: 'infected',
        infected: true,
        details: 'EICAR test file detected',
      };
    }
  }

  return {
    status: 'clean',
    infected: false,
  };
}

/**
 * Quarantine suspicious file
 */
async function quarantineFile(
  file: File,
  buffer: Buffer,
  hash: string,
  userId: string,
  reason: string,
  requestId: string
): Promise<{ id: string }> {
  const quarantineId = uuidv4();
  
  // Create quarantine directory
  const quarantineDir = join(process.cwd(), 'quarantine');
  await mkdir(quarantineDir, { recursive: true });

  // Save quarantined file
  const quarantinePath = join(quarantineDir, `${quarantineId}-${file.name}`);
  await writeFile(quarantinePath, buffer);

  // Log quarantine event
  await auditLogger.logSecurityEvent({
    userId,
    action: 'security_violation',
    severity: 'high',
    details: {
      type: 'file_quarantined',
      fileName: file.name,
      reason,
      quarantineId,
      fileHash: hash,
    },
    requestId,
  });

  return { id: quarantineId };
}

/**
 * Process file content based on type
 */
async function processFileContent(
  buffer: Buffer,
  mimeType: string,
  filePath: string
): Promise<any> {
  const result: any = {
    processedAt: new Date().toISOString(),
  };

  try {
    if (mimeType.startsWith('image/')) {
      // Generate thumbnail and extract metadata
      const metadata = await sharp(buffer).metadata();
      
      result.imageMetadata = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
      };

      // Generate thumbnail
      const thumbnailBuffer = await sharp(buffer)
        .resize(200, 200, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg');
      await writeFile(thumbnailPath, thumbnailBuffer);
      
      result.thumbnailPath = thumbnailPath;
    }

    if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      // Extract text content preview
      const textContent = buffer.toString('utf8');
      result.textPreview = textContent.substring(0, 500);
      result.lineCount = textContent.split('\n').length;
      result.characterCount = textContent.length;
    }

    if (mimeType === 'application/json') {
      // Validate and analyze JSON structure
      try {
        const jsonContent = JSON.parse(buffer.toString('utf8'));
        result.jsonValid = true;
        result.jsonStructure = analyzeJsonStructure(jsonContent);
      } catch (error) {
        result.jsonValid = false;
        result.jsonError = error instanceof Error ? error.message : 'Invalid JSON';
      }
    }

  } catch (error) {
    result.processingError = error instanceof Error ? error.message : 'Processing failed';
  }

  return result;
}

/**
 * Analyze JSON structure
 */
function analyzeJsonStructure(obj: any): any {
  if (Array.isArray(obj)) {
    return {
      type: 'array',
      length: obj.length,
      elementTypes: obj.length > 0 ? [typeof obj[0]] : [],
    };
  } else if (typeof obj === 'object' && obj !== null) {
    return {
      type: 'object',
      keys: Object.keys(obj),
      keyCount: Object.keys(obj).length,
    };
  } else {
    return {
      type: typeof obj,
      value: obj,
    };
  }
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = filename.replace(/^.*[\\\/]/, '');
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // Prevent double extensions
  sanitized = sanitized.replace(/\.+/g, '.');
  
  // Ensure it's not empty
  if (!sanitized || sanitized === '.') {
    sanitized = 'untitled';
  }
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }
  
  return sanitized;
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