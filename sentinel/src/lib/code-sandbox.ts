/**
 * Secure Code Execution Sandbox
 * Executes Python code safely for data visualization and analysis
 */

import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  plots?: string[];
  executionTime?: number;
  metadata?: any;
}

interface SecurityCheck {
  passed: boolean;
  violations: string[];
}

export class CodeSandbox {
  private readonly sandboxDir: string;
  private readonly maxExecutionTime: number = 30000; // 30 seconds
  private readonly allowedModules = [
    'matplotlib', 'pyplot', 'plt', 'pandas', 'pd', 'numpy', 'np',
    'seaborn', 'sns', 'plotly', 'json', 'datetime', 'math', 
    'statistics', 'csv', 're', 'collections', 'itertools'
  ];

  constructor() {
    this.sandboxDir = join(process.cwd(), 'temp', 'sandbox');
    this.ensureSandboxDir();
  }

  /**
   * Execute Python code in a secure sandbox
   */
  async executeCode(code: string, userId: string): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const sessionId = uuidv4();
    const sessionDir = join(this.sandboxDir, sessionId);
    
    try {
      // Security checks
      const securityCheck = this.performSecurityChecks(code);
      if (!securityCheck.passed) {
        return {
          success: false,
          error: `Security violation: ${securityCheck.violations.join(', ')}`
        };
      }

      // Create session directory
      await mkdir(sessionDir, { recursive: true });

      // Prepare secure Python environment
      const secureCode = this.wrapCodeInSandbox(code, sessionDir);
      const scriptPath = join(sessionDir, 'script.py');
      
      await writeFile(scriptPath, secureCode);

      // Execute code with restrictions
      const result = await this.executeInSandbox(scriptPath, sessionDir);
      
      // Clean up
      await this.cleanupSession(sessionDir);
      
      return {
        ...result,
        executionTime: Date.now() - startTime,
        metadata: { sessionId, userId }
      };

    } catch (error) {
      // Ensure cleanup on error
      await this.cleanupSession(sessionDir);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform security checks on code
   */
  private performSecurityChecks(code: string): SecurityCheck {
    const violations: string[] = [];

    // Dangerous imports
    const dangerousImports = [
      /import\s+os/, /import\s+sys/, /import\s+subprocess/,
      /import\s+socket/, /import\s+urllib/, /import\s+requests/,
      /import\s+shutil/, /import\s+glob/, /import\s+pickle/,
      /from\s+os/, /from\s+sys/, /from\s+subprocess/
    ];

    for (const pattern of dangerousImports) {
      if (pattern.test(code)) {
        violations.push('dangerous_import');
        break;
      }
    }

    // Dangerous functions
    const dangerousFunctions = [
      /exec\s*\(/, /eval\s*\(/, /compile\s*\(/, /__import__/,
      /open\s*\(/, /file\s*\(/, /input\s*\(/, /raw_input/,
      /getattr/, /setattr/, /delattr/, /hasattr/,
      /globals\s*\(/, /locals\s*\(/, /vars\s*\(/
    ];

    for (const pattern of dangerousFunctions) {
      if (pattern.test(code)) {
        violations.push('dangerous_function');
        break;
      }
    }

    // File operations
    const fileOperations = [
      /\.write\s*\(/, /\.read\s*\(/, /\.remove\s*\(/,
      /\.unlink\s*\(/, /\.rmdir\s*\(/, /\.mkdir\s*\(/
    ];

    for (const pattern of fileOperations) {
      if (pattern.test(code)) {
        violations.push('file_operation');
        break;
      }
    }

    // Network operations
    const networkOperations = [
      /urllib/, /requests/, /socket/, /http/,
      /ftp/, /smtp/, /telnet/
    ];

    for (const pattern of networkOperations) {
      if (pattern.test(code)) {
        violations.push('network_operation');
        break;
      }
    }

    // Shell commands
    if (/os\.system|subprocess\.call|subprocess\.run/.test(code)) {
      violations.push('shell_command');
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Wrap user code in a secure sandbox environment
   */
  private wrapCodeInSandbox(userCode: string, sessionDir: string): string {
    return `
import sys
import os
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import json
import datetime
import math
import statistics
from io import StringIO
import traceback

# Redirect stdout to capture print statements
output_buffer = StringIO()
sys.stdout = output_buffer

# Set up plot directory
plot_dir = "${sessionDir.replace(/\\/g, '/')}/plots"
os.makedirs(plot_dir, exist_ok=True)

plot_counter = 0

# Override plt.show to save plots instead
original_show = plt.show
def custom_show():
    global plot_counter
    plot_counter += 1
    filename = f"plot_{plot_counter}.png"
    filepath = os.path.join(plot_dir, filename)
    plt.savefig(filepath, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Plot saved: {filename}")

plt.show = custom_show

try:
    # User code execution
${userCode.split('\n').map(line => '    ' + line).join('\n')}
    
    # Capture any remaining plots
    if plt.get_fignums():
        custom_show()
    
    execution_result = {
        "success": True,
        "output": output_buffer.getvalue(),
        "plots": [f"plot_{i}.png" for i in range(1, plot_counter + 1)]
    }
    
except Exception as e:
    execution_result = {
        "success": False,
        "error": str(e),
        "traceback": traceback.format_exc(),
        "output": output_buffer.getvalue()
    }

# Write result to file
with open("${sessionDir.replace(/\\/g, '/')}/result.json", "w") as f:
    json.dump(execution_result, f)

# Restore stdout
sys.stdout = sys.__stdout__
print("Execution completed")
`;
  }

  /**
   * Execute script in sandbox with time and resource limits
   */
  private async executeInSandbox(scriptPath: string, sessionDir: string): Promise<CodeExecutionResult> {
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [scriptPath], {
        cwd: sessionDir,
        env: {
          ...process.env,
          PYTHONPATH: '',
          HOME: sessionDir,
          TMPDIR: sessionDir
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let completed = false;

      // Set execution timeout
      const timeout = setTimeout(() => {
        if (!completed) {
          pythonProcess.kill('SIGKILL');
          resolve({
            success: false,
            error: 'Code execution timed out (30 seconds limit)'
          });
        }
      }, this.maxExecutionTime);

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', async (code) => {
        completed = true;
        clearTimeout(timeout);

        try {
          // Read execution result
          const resultPath = join(sessionDir, 'result.json');
          let result: CodeExecutionResult;

          if (existsSync(resultPath)) {
            const resultData = await readFile(resultPath, 'utf8');
            const parsedResult = JSON.parse(resultData);
            
            // Get plot files
            const plotsDir = join(sessionDir, 'plots');
            let plots: string[] = [];
            
            if (existsSync(plotsDir) && parsedResult.plots) {
              plots = parsedResult.plots;
            }

            result = {
              success: parsedResult.success,
              output: parsedResult.output || stdout,
              error: parsedResult.error,
              plots
            };
          } else {
            result = {
              success: code === 0,
              output: stdout,
              error: stderr || (code !== 0 ? `Process exited with code ${code}` : undefined)
            };
          }

          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            error: 'Failed to read execution result',
            output: stdout
          });
        }
      });

      pythonProcess.on('error', (error) => {
        completed = true;
        clearTimeout(timeout);
        resolve({
          success: false,
          error: `Failed to start Python process: ${error.message}`
        });
      });
    });
  }

  /**
   * Ensure sandbox directory exists
   */
  private async ensureSandboxDir(): Promise<void> {
    try {
      await mkdir(this.sandboxDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create sandbox directory:', error);
    }
  }

  /**
   * Clean up session directory
   */
  private async cleanupSession(sessionDir: string): Promise<void> {
    try {
      if (existsSync(sessionDir)) {
        // Remove all files in session directory
        const { spawn } = require('child_process');
        await new Promise<void>((resolve) => {
          const rmProcess = spawn('rm', ['-rf', sessionDir]);
          rmProcess.on('close', () => resolve());
        });
      }
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
  }

  /**
   * Get plot file as base64
   */
  async getPlotAsBase64(sessionId: string, plotName: string): Promise<string | null> {
    try {
      const plotPath = join(this.sandboxDir, sessionId, 'plots', plotName);
      if (!existsSync(plotPath)) {
        return null;
      }
      
      const buffer = await readFile(plotPath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
      console.error('Failed to read plot file:', error);
      return null;
    }
  }
}

export const codeSandbox = new CodeSandbox();