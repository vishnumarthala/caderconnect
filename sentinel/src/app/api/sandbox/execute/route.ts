import { NextRequest, NextResponse } from 'next/server';
import { SandboxExecutor } from '@/lib/sandbox-executor';
import { verifyToken } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { rateLimit } from '@/lib/rate-limiter';

const sandboxExecutor = new SandboxExecutor();

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - more restrictive for sandbox execution
    const rateLimitResult = await rateLimit(request, {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 requests per minute for sandbox
    });
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Authentication
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Role-based access - only certain roles can use sandbox
    const allowedRoles = ['SuperAdmin', 'PartyHead', 'RegionalLead'];
    if (!allowedRoles.includes(authResult.user.role)) {
      await auditLogger.log('sandbox_access_denied', authResult.user.id, {
        user_role: authResult.user.role,
        allowed_roles: allowedRoles,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for sandbox access' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { query, code, executionType = 'auto' } = body;

    if (!query && !code) {
      return NextResponse.json(
        { error: 'Either query or code is required' },
        { status: 400 }
      );
    }

    // Log sandbox request
    await auditLogger.log('sandbox_execution_request', authResult.user.id, {
      execution_type: executionType,
      query: query?.substring(0, 100),
      code_provided: !!code,
      user_role: authResult.user.role,
      timestamp: new Date().toISOString()
    });

    let finalCode: string;

    if (code) {
      // Direct code execution
      finalCode = code;
    } else {
      // Convert natural language to code
      finalCode = await sandboxExecutor.naturalLanguageToCode(
        query,
        authResult.user.role,
        {} // Available data context
      );
    }

    // Execute code in sandbox
    const result = await sandboxExecutor.executeCode(finalCode, {
      timeout: 30000, // 30 seconds
      memoryLimit: '512m',
      cpuLimit: '0.5',
      networkAccess: false // No network access for security
    });

    // Log execution result
    await auditLogger.log('sandbox_execution_result', authResult.user.id, {
      success: result.success,
      execution_time: result.executionTime,
      error: result.error?.substring(0, 200),
      output_length: result.output?.length || 0,
      images_generated: result.images?.length || 0,
      data_outputs: result.data?.length || 0,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        execution_id: generateExecutionId(),
        result,
        generated_code: !code ? finalCode : undefined,
        execution_time: result.executionTime,
        metadata: {
          user_role: authResult.user.role,
          execution_type: executionType,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Sandbox API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Sandbox execution failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return sandbox capabilities and examples
    const capabilities = {
      SuperAdmin: {
        description: 'Full sandbox access with all data sources',
        available_functions: [
          'get_sentiment_data()',
          'get_member_performance()',
          'get_regional_data()',
          'get_national_analytics()',
          'get_security_metrics()'
        ],
        examples: [
          'Generate a comprehensive performance report for all regions',
          'Create sentiment analysis charts for the last quarter',
          'Compare member performance across different metrics',
          'Analyze security threat patterns over time'
        ]
      },
      PartyHead: {
        description: 'National-level analytics and reporting',
        available_functions: [
          'get_sentiment_data()',
          'get_member_performance()',
          'get_regional_data()',
          'get_national_analytics()'
        ],
        examples: [
          'Show me a dashboard comparing all regional performance', 
          'Generate charts showing sentiment trends by state',
          'Create a report on top and bottom performing members',
          'Analyze media mention patterns across regions'
        ]
      },
      RegionalLead: {
        description: 'Regional analytics and member oversight',
        available_functions: [
          'get_sentiment_data(region=region_id)',
          'get_member_performance(region=region_id)',
          'get_regional_data(region_id)'
        ],
        examples: [
          'Show performance metrics for my regional members',
          'Create charts comparing my MPs and MLAs',
          'Generate a regional sentiment analysis report',
          'Display completion rates for ongoing projects'
        ]
      }
    };

    const userCapabilities = capabilities[authResult.user.role as keyof typeof capabilities];

    return NextResponse.json({
      success: true,
      data: {
        user_role: authResult.user.role,
        access_granted: !!userCapabilities,
        capabilities: userCapabilities || null,
        sandbox_limits: {
          execution_timeout: '30 seconds',
          memory_limit: '512MB',
          cpu_limit: '0.5 cores',
          network_access: false,
          max_executions_per_minute: 5
        },
        available_libraries: [
          'pandas',
          'numpy', 
          'matplotlib',
          'seaborn',
          'json',
          'base64'
        ]
      }
    });

  } catch (error) {
    console.error('Sandbox Info API Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}