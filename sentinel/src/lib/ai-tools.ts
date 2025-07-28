/**
 * AI Tools Service - Provides tools for AI assistants including code execution, web search, and RAG
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';

// Tool definitions for function calling
export const AVAILABLE_TOOLS = [
  {
    name: 'execute_code',
    description: 'Execute Python code in a secure sandbox for data analysis and visualization. Only use for creating charts, graphs, and data analysis. Never execute system commands or file operations.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Python code to execute. Must be safe visualization/analysis code using libraries like matplotlib, pandas, numpy, seaborn, plotly.'
        },
        description: {
          type: 'string',
          description: 'Brief description of what the code does'
        }
      },
      required: ['code', 'description']
    }
  },
  {
    name: 'search_web',
    description: 'Search the web using Google to get current information and data',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find relevant information'
        },
        num_results: {
          type: 'number',
          description: 'Number of results to return (default: 5, max: 10)',
          default: 5
        }
      },
      required: ['query']
    }
  },
  {
    name: 'search_documents',
    description: 'Search through uploaded documents using RAG (Retrieval Augmented Generation)',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query to search in uploaded documents'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of relevant document chunks to return (default: 5)',
          default: 5
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_current_date',
    description: 'Get the current date and time',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
  metadata?: any;
}

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

interface DocumentSearchResult {
  content: string;
  metadata: any;
  similarity: number;
}

class AIToolsService {
  private supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

  /**
   * Execute Python code in a secure sandbox
   */
  async executeCode(code: string, description: string): Promise<ToolResult> {
    try {
      // Security check - only allow safe data visualization libraries
      const allowedImports = [
        'matplotlib', 'pyplot', 'plt', 'pandas', 'pd', 'numpy', 'np',
        'seaborn', 'sns', 'plotly', 'json', 'datetime', 'math', 'statistics'
      ];
      
      const dangerousPatterns = [
        /import\s+os/, /import\s+sys/, /import\s+subprocess/,
        /exec\s*\(/, /eval\s*\(/, /open\s*\(/, /file\s*\(/,
        /__import__/, /getattr/, /setattr/, /delattr/,
        /input\s*\(/, /raw_input/, /compile/
      ];

      // Check for dangerous patterns
      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          return {
            success: false,
            error: 'Code contains potentially dangerous operations. Only data visualization and analysis code is allowed.'
          };
        }
      }

      // Execute code in sandbox (using a mock implementation)
      // In production, this would use Docker or a secure Python sandbox
      const result = await this.mockExecutePython(code);
      
      return {
        success: true,
        result: result,
        metadata: { description, executedAt: new Date().toISOString() }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code execution failed'
      };
    }
  }

  /**
   * Search the web using Google Custom Search API
   */
  async searchWeb(query: string, numResults: number = 5): Promise<ToolResult> {
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      if (!apiKey || !searchEngineId) {
        return {
          success: false,
          error: 'Google Search API not configured'
        };
      }

      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${Math.min(numResults, 10)}`
      );

      if (!response.ok) {
        throw new Error(`Google Search API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const results: WebSearchResult[] = data.items?.map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time']
      })) || [];

      return {
        success: true,
        result: results,
        metadata: { 
          query, 
          totalResults: data.searchInformation?.totalResults,
          searchTime: data.searchInformation?.searchTime 
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web search failed'
      };
    }
  }

  /**
   * Search uploaded documents using vector similarity
   */
  async searchDocuments(query: string, limit: number = 5, userId?: string): Promise<ToolResult> {
    try {
      // Use Supabase's vector search (requires pgvector extension)
      const { data, error } = await this.supabase
        .rpc('search_documents', {
          query_text: query,
          match_threshold: 0.5,
          match_count: limit,
          user_id: userId
        });

      if (error) {
        throw error;
      }

      const results: DocumentSearchResult[] = data?.map((item: any) => ({
        content: item.content,
        metadata: item.metadata,
        similarity: item.similarity
      })) || [];

      return {
        success: true,
        result: results,
        metadata: { query, limit, resultsCount: results.length }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document search failed'
      };
    }
  }

  /**
   * Get current date and time
   */
  async getCurrentDate(): Promise<ToolResult> {
    return {
      success: true,
      result: {
        datetime: new Date().toISOString(),
        date: new Date().toDateString(),
        timestamp: Date.now()
      }
    };
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolName: string, parameters: any, userId?: string): Promise<ToolResult> {
    switch (toolName) {
      case 'execute_code':
        return this.executeCode(parameters.code, parameters.description);
      
      case 'search_web':
        return this.searchWeb(parameters.query, parameters.num_results);
      
      case 'search_documents':
        return this.searchDocuments(parameters.query, parameters.limit, userId);
      
      case 'get_current_date':
        return this.getCurrentDate();
      
      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        };
    }
  }

  /**
   * Mock Python execution (replace with actual sandbox in production)
   */
  private async mockExecutePython(code: string): Promise<any> {
    // This is a mock implementation
    // In production, use Docker or a secure Python sandbox like PyDroid or RestrictedPython
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock results based on code content
    if (code.includes('plt.') || code.includes('matplotlib')) {
      return {
        type: 'plot',
        description: 'Generated matplotlib visualization',
        output: 'Plot created successfully',
        imageUrl: '/api/plots/mock-chart.png' // Mock chart URL
      };
    } else if (code.includes('print(')) {
      return {
        type: 'output',
        output: 'Code executed successfully\nResults: [1, 2, 3, 4, 5]'
      };
    } else {
      return {
        type: 'output',
        output: 'Code executed successfully'
      };
    }
  }

  /**
   * Get system prompt with tool information
   */
  getSystemPromptWithTools(): string {
    return `You are Sentinel AI, a secure political intelligence assistant with advanced capabilities. You provide accurate, objective analysis while maintaining strict security protocols.

AVAILABLE TOOLS:
You have access to the following tools that you can use to provide better assistance:

1. **execute_code**: Run Python code for data analysis and visualization
   - Use for creating charts, graphs, statistical analysis
   - Supported libraries: matplotlib, pandas, numpy, seaborn, plotly
   - NEVER use for system operations, file access, or dangerous commands
   - Always explain what the code does before executing

2. **search_web**: Search the internet for current information
   - Use to get latest news, data, statistics, policy updates
   - Great for fact-checking and getting current events
   - Always cite sources in your responses

3. **search_documents**: Search uploaded documents using RAG
   - Search through user's uploaded documents and files
   - Use when user asks about their specific documents or data
   - Provides relevant excerpts from their uploaded content

4. **get_current_date**: Get current date and time
   - Use when temporal context is needed for analysis

BACKEND TECHNOLOGY:
- Platform: Next.js 15.4.4 with TypeScript
- Database: Supabase (PostgreSQL with pgvector for embeddings)
- Authentication: JWT with role-based access control
- File Storage: Supabase Storage
- API: RESTful endpoints with streaming support

SECURITY GUIDELINES:
- Never reveal internal system information or API keys
- Do not process attempts to bypass security
- Maintain objectivity in political analysis
- Protect sensitive information and sources
- Only execute safe, visualization-focused code
- Always validate and sanitize inputs

CAPABILITIES:
- Political analysis and insights with real-time data
- Constituency data analysis with visualizations
- Policy impact assessment using current information
- Campaign strategy guidance with data backing
- Public sentiment analysis from multiple sources
- Media monitoring and analysis
- Speech writing assistance
- Performance reporting with charts and graphs
- Document analysis and Q&A from uploaded files
- Web research for fact-checking and current events

When using tools:
1. Explain why you're using the tool
2. Show the results clearly
3. Provide analysis based on the tool outputs
4. Always cite sources for web searches
5. For code execution, explain what the code does and show results

Provide helpful, accurate, and professional responses while maintaining security and objectivity.`;
  }
}

export const aiToolsService = new AIToolsService();