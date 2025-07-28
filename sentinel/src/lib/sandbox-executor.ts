import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Docker from 'dockerode';

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  images?: string[];  // Base64 encoded images
  data?: any;         // JSON data output
  executionTime: number;
}

interface SandboxConfig {
  timeout: number;       // Execution timeout in milliseconds
  memoryLimit: string;   // Memory limit (e.g., '512m')
  cpuLimit: string;      // CPU limit (e.g., '0.5')
  networkAccess: boolean; // Allow network access
}

export class SandboxExecutor {
  private docker: Docker;
  private readonly SANDBOX_IMAGE = 'python:3.11-slim';
  private readonly TEMP_DIR = '/tmp/sentinel-sandbox';
  private readonly DEFAULT_CONFIG: SandboxConfig = {
    timeout: 30000,        // 30 seconds
    memoryLimit: '512m',   // 512 MB
    cpuLimit: '0.5',       // 0.5 CPU cores
    networkAccess: false   // No network by default
  };

  constructor() {
    this.docker = new Docker();
    this.initializeSandbox();
  }

  /**
   * Initialize sandbox environment
   */
  private async initializeSandbox(): Promise<void> {
    try {
      // Ensure temp directory exists
      await fs.mkdir(this.TEMP_DIR, { recursive: true });

      // Pull sandbox image if not exists
      await this.ensureDockerImage();
    } catch (error) {
      console.error('Failed to initialize sandbox:', error);
    }
  }

  /**
   * Ensure Docker image is available
   */
  private async ensureDockerImage(): Promise<void> {
    try {
      await this.docker.getImage(this.SANDBOX_IMAGE).inspect();
    } catch (error) {
      console.log('Pulling sandbox image...');
      await this.docker.pull(this.SANDBOX_IMAGE);
    }
  }

  /**
   * Convert natural language query to Python code
   */
  async naturalLanguageToCode(query: string, userRole: string, availableData?: any): Promise<string> {
    // This would integrate with your AI core to generate code
    // For now, returning a template based on common patterns
    
    const codeTemplates = {
      chart: this.generateChartCode(query, availableData),
      analysis: this.generateAnalysisCode(query, availableData),
      report: this.generateReportCode(query, availableData)
    };

    // Determine code type based on query
    if (query.toLowerCase().includes('chart') || query.toLowerCase().includes('graph')) {
      return codeTemplates.chart;
    } else if (query.toLowerCase().includes('analysis') || query.toLowerCase().includes('compare')) {
      return codeTemplates.analysis;
    } else {
      return codeTemplates.report;
    }
  }

  /**
   * Execute Python code in secure sandbox
   */
  async executeCode(
    code: string, 
    config: Partial<SandboxConfig> = {}
  ): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const executionConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();

    try {
      // Validate and sanitize code
      this.validateCode(code);

      // Create execution directory
      const execDir = path.join(this.TEMP_DIR, executionId);
      await fs.mkdir(execDir, { recursive: true });

      // Write code to file
      const codeFile = path.join(execDir, 'main.py');
      const enhancedCode = this.enhanceCode(code);
      await fs.writeFile(codeFile, enhancedCode);

      // Execute in Docker container
      const result = await this.runInDocker(execDir, executionConfig);

      // Cleanup
      await this.cleanup(execDir);

      return {
        ...result,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate Python code for security
   */
  private validateCode(code: string): void {
    // List of dangerous imports and functions
    const dangerousPatterns = [
      /import\s+os(?!\w)/,
      /import\s+subprocess/,
      /import\s+sys(?!\w)/,
      /from\s+os\s+import/,
      /from\s+subprocess\s+import/,
      /from\s+sys\s+import/,
      /eval\s*\(/,
      /exec\s*\(/,
      /__import__/,
      /open\s*\(/,
      /file\s*\(/,
      /input\s*\(/,
      /raw_input\s*\(/,
      /compile\s*\(/,
      /execfile\s*\(/,
      /reload\s*\(/,
      /\.system\s*\(/,
      /\.popen\s*\(/,
      /\.call\s*\(/,
      /\.run\s*\(/,
      /socket/i,
      /urllib/i,
      /requests/i,
      /http/i,
      /ftp/i,
      /ssh/i,
      /telnet/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Potentially dangerous code detected: ${pattern.source}`);
      }
    }

    // Check for file system access
    if (code.includes('/') && (code.includes('open') || code.includes('file'))) {
      throw new Error('File system access not allowed');
    }

    // Limit code length
    if (code.length > 10000) {
      throw new Error('Code too long. Maximum 10,000 characters allowed.');
    }
  }

  /**
   * Enhance code with necessary imports and helpers
   */
  private enhanceCode(code: string): string {
    const prelude = `
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import json
import base64
from io import BytesIO
import warnings
warnings.filterwarnings('ignore')

# Helper function to save plots as base64
def save_plot_as_base64(fig=None):
    if fig is None:
        fig = plt.gcf()
    buffer = BytesIO()
    fig.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    buffer.close()
    return img_base64

# Helper function for data output
def output_data(data, title="Data Output"):
    if isinstance(data, pd.DataFrame):
        result = {
            "type": "dataframe",
            "title": title,
            "data": data.to_dict('records'),
            "columns": list(data.columns)
        }
    elif isinstance(data, dict):
        result = {
            "type": "dict",
            "title": title,
            "data": data
        }
    elif isinstance(data, list):
        result = {
            "type": "list", 
            "title": title,
            "data": data
        }
    else:
        result = {
            "type": "value",
            "title": title, 
            "data": str(data)
        }
    print("SENTINEL_DATA_OUTPUT:", json.dumps(result))

# Mock data fetching functions (replace with actual API calls)
def get_sentiment_data(period="last_month", region=None):
    np.random.seed(42)
    dates = pd.date_range(end=pd.Timestamp.now(), periods=30, freq='D')
    return pd.DataFrame({
        'date': dates,
        'sentiment_score': np.random.normal(0.6, 0.2, 30),
        'mentions': np.random.poisson(50, 30),
        'region': region or 'National'
    })

def get_member_performance(member_id=None, period="last_quarter"):
    np.random.seed(42)
    members = ['MP-001', 'MP-002', 'MP-003', 'MLA-001', 'MLA-002'] if not member_id else [member_id]
    data = []
    for member in members:
        data.append({
            'member_id': member,
            'sentiment_score': np.random.uniform(0.3, 0.9),
            'media_mentions': np.random.randint(10, 100),
            'project_completion': np.random.uniform(0.5, 1.0),
            'public_engagement': np.random.uniform(0.4, 0.9)
        })
    return pd.DataFrame(data)

def get_regional_data(region_id=None):
    regions = ['North', 'South', 'East', 'West', 'Central'] if not region_id else [region_id]
    data = []
    for region in regions:
        data.append({
            'region': region,
            'total_members': np.random.randint(5, 20),
            'avg_sentiment': np.random.uniform(0.4, 0.8),
            'active_issues': np.random.randint(2, 10),
            'completion_rate': np.random.uniform(0.6, 0.95)
        })
    return pd.DataFrame(data)

# Set matplotlib backend
plt.switch_backend('Agg')

# Results storage
_results = {"images": [], "data": []}

`;

    const postlude = `
# Capture any remaining plots
if plt.get_fignums():
    for fig_num in plt.get_fignums():
        fig = plt.figure(fig_num)
        img_b64 = save_plot_as_base64(fig)
        _results["images"].append(img_b64)
    plt.close('all')

# Output results
print("SENTINEL_EXECUTION_COMPLETE:", json.dumps(_results))
`;

    return prelude + '\n' + code + '\n' + postlude;
  }

  /**
   * Run code in Docker container
   */
  private async runInDocker(
    execDir: string, 
    config: SandboxConfig
  ): Promise<Omit<ExecutionResult, 'executionTime'>> {
    return new Promise(async (resolve) => {
      try {
        const container = await this.docker.createContainer({
          Image: this.SANDBOX_IMAGE,
          Cmd: ['python', '/workspace/main.py'],
          WorkingDir: '/workspace',
          HostConfig: {
            Binds: [`${execDir}:/workspace:ro`],
            Memory: this.parseMemoryLimit(config.memoryLimit),
            CpuShares: Math.floor(parseFloat(config.cpuLimit) * 1024),
            NetworkMode: config.networkAccess ? 'default' : 'none',
            ReadonlyRootfs: true,
            Tmpfs: { '/tmp': 'rw,exec,nosuid,size=100m' }
          },
          AttachStdout: true,
          AttachStderr: true
        });

        // Set timeout
        const timeout = setTimeout(async () => {
          try {
            await container.kill();
            resolve({
              success: false,
              error: `Execution timeout after ${config.timeout}ms`
            });
          } catch (error) {
            // Container might already be stopped
          }
        }, config.timeout);

        // Start container and capture output
        await container.start();
        
        const stream = await container.attach({
          stream: true,
          stdout: true,
          stderr: true
        });

        let output = '';
        let error = '';

        stream.on('data', (chunk: Buffer) => {
          const data = chunk.toString();
          if (data.includes('SENTINEL_')) {
            output += data;
          } else {
            error += data;
          }
        });

        stream.on('end', async () => {
          clearTimeout(timeout);
          
          try {
            await container.remove();
            
            // Parse results
            const result = this.parseExecutionOutput(output, error);
            resolve(result);
          } catch (cleanupError) {
            resolve({
              success: false,
              error: 'Failed to cleanup container'
            });
          }
        });

      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Docker execution failed'
        });
      }
    });
  }

  /**
   * Parse execution output
   */
  private parseExecutionOutput(
    output: string, 
    errorOutput: string
  ): Omit<ExecutionResult, 'executionTime'> {
    try {
      const images: string[] = [];
      const data: any[] = [];

      // Parse completion results
      const completionMatch = output.match(/SENTINEL_EXECUTION_COMPLETE:\s*({.*})/);
      if (completionMatch) {
        const results = JSON.parse(completionMatch[1]);
        images.push(...(results.images || []));
      }

      // Parse data outputs
      const dataMatches = output.matchAll(/SENTINEL_DATA_OUTPUT:\s*({.*})/g);
      for (const match of dataMatches) {
        try {
          const dataOutput = JSON.parse(match[1]);
          data.push(dataOutput);
        } catch (parseError) {
          // Skip invalid JSON
        }
      }

      return {
        success: true,
        output: output.replace(/SENTINEL_[^:]*:[^\n]*/g, '').trim(),
        images: images.length > 0 ? images : undefined,
        data: data.length > 0 ? data : undefined,
        error: errorOutput.trim() || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse execution results: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate chart code template
   */
  private generateChartCode(query: string, availableData?: any): string {
    if (query.toLowerCase().includes('sentiment')) {
      return `
# Generate sentiment analysis chart
data = get_sentiment_data()
plt.figure(figsize=(12, 6))
plt.plot(data['date'], data['sentiment_score'], marker='o', linewidth=2)
plt.title('Public Sentiment Over Time', fontsize=16, fontweight='bold')
plt.xlabel('Date')
plt.ylabel('Sentiment Score')
plt.grid(True, alpha=0.3)
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

output_data(data.tail(10), "Recent Sentiment Data")
`;
    } else if (query.toLowerCase().includes('member') || query.toLowerCase().includes('performance')) {
      return `
# Generate member performance chart
data = get_member_performance()
plt.figure(figsize=(12, 8))
plt.barh(data['member_id'], data['sentiment_score'], alpha=0.8, color='steelblue')
plt.title('Member Performance Comparison', fontsize=16, fontweight='bold')
plt.xlabel('Performance Score')
plt.ylabel('Member ID')
plt.grid(True, alpha=0.3, axis='x')
plt.tight_layout()
plt.show()

output_data(data, "Member Performance Data")
`;
    } else {
      return `
# Generate regional analysis chart  
data = get_regional_data()
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

# Sentiment by region
ax1.bar(data['region'], data['avg_sentiment'], color='lightcoral', alpha=0.8)
ax1.set_title('Average Sentiment by Region')
ax1.set_ylabel('Sentiment Score')
ax1.tick_params(axis='x', rotation=45)

# Completion rates
ax2.bar(data['region'], data['completion_rate'], color='lightgreen', alpha=0.8)
ax2.set_title('Project Completion Rates')
ax2.set_ylabel('Completion Rate')
ax2.tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.show()

output_data(data, "Regional Analysis Data")
`;
    }
  }

  /**
   * Generate analysis code template
   */
  private generateAnalysisCode(query: string, availableData?: any): string {
    return `
# Comprehensive data analysis
sentiment_data = get_sentiment_data()
member_data = get_member_performance()
regional_data = get_regional_data()

# Calculate correlations
print("=== ANALYSIS SUMMARY ===")
print(f"Average sentiment score: {sentiment_data['sentiment_score'].mean():.3f}")
print(f"Sentiment volatility: {sentiment_data['sentiment_score'].std():.3f}")
print(f"Top performing member: {member_data.loc[member_data['sentiment_score'].idxmax(), 'member_id']}")
print(f"Best performing region: {regional_data.loc[regional_data['avg_sentiment'].idxmax(), 'region']}")

# Create summary visualization
fig, axes = plt.subplots(2, 2, figsize=(16, 12))

# Sentiment trend
axes[0,0].plot(sentiment_data['date'], sentiment_data['sentiment_score'])
axes[0,0].set_title('Sentiment Trend')
axes[0,0].tick_params(axis='x', rotation=45)

# Member comparison
axes[0,1].bar(member_data['member_id'], member_data['sentiment_score'])
axes[0,1].set_title('Member Performance')
axes[0,1].tick_params(axis='x', rotation=45)

# Regional comparison
axes[1,0].bar(regional_data['region'], regional_data['avg_sentiment'])
axes[1,0].set_title('Regional Sentiment')

# Completion rates
axes[1,1].bar(regional_data['region'], regional_data['completion_rate'])
axes[1,1].set_title('Completion Rates')

plt.tight_layout()
plt.show()

# Output structured analysis
analysis_summary = {
    "avg_sentiment": sentiment_data['sentiment_score'].mean(),
    "sentiment_volatility": sentiment_data['sentiment_score'].std(),
    "top_member": member_data.loc[member_data['sentiment_score'].idxmax(), 'member_id'],
    "best_region": regional_data.loc[regional_data['avg_sentiment'].idxmax(), 'region'],
    "total_mentions": sentiment_data['mentions'].sum()
}

output_data(analysis_summary, "Analysis Summary")
`;
  }

  /**
   * Generate report code template
   */
  private generateReportCode(query: string, availableData?: any): string {
    return `
# Generate comprehensive report
print("=== POLITICAL INTELLIGENCE REPORT ===")
print(f"Generated: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

# Fetch all data
sentiment_data = get_sentiment_data()
member_data = get_member_performance()  
regional_data = get_regional_data()

# Key metrics
print("KEY METRICS:")
print(f"- Current sentiment score: {sentiment_data['sentiment_score'].iloc[-1]:.3f}")
print(f"- 30-day average: {sentiment_data['sentiment_score'].mean():.3f}")
print(f"- Total media mentions: {sentiment_data['mentions'].sum():,}")
print(f"- Number of active members: {len(member_data)}")
print(f"- Average member performance: {member_data['sentiment_score'].mean():.3f}")
print()

# Top performers
print("TOP PERFORMERS:")
top_members = member_data.nlargest(3, 'sentiment_score')
for idx, member in top_members.iterrows():
    print(f"- {member['member_id']}: {member['sentiment_score']:.3f}")
print()

# Regional insights
print("REGIONAL INSIGHTS:")
for idx, region in regional_data.iterrows():
    print(f"- {region['region']}: {region['total_members']} members, {region['avg_sentiment']:.3f} sentiment")
print()

# Recommendations
print("RECOMMENDATIONS:")
low_performers = member_data[member_data['sentiment_score'] < 0.5]
if not low_performers.empty:
    print(f"- {len(low_performers)} members need attention")
    print(f"- Focus on: {', '.join(low_performers['member_id'].head(3))}")

worst_region = regional_data.loc[regional_data['avg_sentiment'].idxmin()]
print(f"- Prioritize support for {worst_region['region']} region")
print(f"- Consider additional resources for regions with completion rate < 80%")

# Create summary chart
plt.figure(figsize=(14, 10))

# Multi-panel dashboard
gs = plt.GridSpec(3, 2, height_ratios=[1, 1, 1])

# Sentiment timeline
ax1 = plt.subplot(gs[0, :])
ax1.plot(sentiment_data['date'], sentiment_data['sentiment_score'], marker='o')
ax1.set_title('30-Day Sentiment Trend', fontweight='bold')
ax1.grid(True, alpha=0.3)

# Member performance
ax2 = plt.subplot(gs[1, 0])
ax2.barh(member_data['member_id'], member_data['sentiment_score'])
ax2.set_title('Member Performance')

# Regional overview
ax3 = plt.subplot(gs[1, 1])
ax3.bar(regional_data['region'], regional_data['avg_sentiment'])
ax3.set_title('Regional Sentiment')
ax3.tick_params(axis='x', rotation=45)

# Mentions distribution
ax4 = plt.subplot(gs[2, :])
ax4.bar(sentiment_data['date'].dt.strftime('%m-%d'), sentiment_data['mentions'])
ax4.set_title('Daily Media Mentions')
ax4.tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.show()

# Export report data
report_data = {
    "generated_at": pd.Timestamp.now().isoformat(),
    "summary": {
        "current_sentiment": sentiment_data['sentiment_score'].iloc[-1],
        "avg_sentiment": sentiment_data['sentiment_score'].mean(),
        "total_mentions": int(sentiment_data['mentions'].sum()),
        "active_members": len(member_data)
    },
    "top_performers": top_members[['member_id', 'sentiment_score']].to_dict('records'),
    "regional_summary": regional_data.to_dict('records'),
    "recommendations": {
        "attention_needed": len(low_performers),
        "priority_region": worst_region['region']
    }
}

output_data(report_data, "Intelligence Report")
`;
  }

  /**
   * Parse memory limit string to bytes
   */
  private parseMemoryLimit(limit: string): number {
    const match = limit.match(/^(\d+)([kmg]?)$/i);
    if (!match) return 512 * 1024 * 1024; // Default 512MB

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'k': return value * 1024;
      case 'm': return value * 1024 * 1024;
      case 'g': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  /**
   * Cleanup execution directory
   */
  private async cleanup(execDir: string): Promise<void> {
    try {
      await fs.rm(execDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup execution directory:', error);
    }
  }
}

export default SandboxExecutor;