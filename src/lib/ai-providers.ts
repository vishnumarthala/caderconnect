import { OllamaProvider } from './ollama';
/**
 * AI Provider Service - Unified interface for multiple AI models
 */

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AITool {
  name: string;
  description: string;
  parameters: any;
}

interface AIResponse {
  content: string;
  model: string;
  toolCalls?: any[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface AIProvider {
  generateResponse(messages: AIMessage[], model: string, tools?: AITool[]): Promise<AIResponse>;
  generateStreamResponse(messages: AIMessage[], model: string, tools?: AITool[]): AsyncIterable<string>;
}

class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(messages: AIMessage[], model: string, tools?: AITool[]): Promise<AIResponse> {
    const requestBody: any = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      requestBody.tool_choice = 'auto';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;
    
    return {
      content: message.content || '',
      model: data.model,
      toolCalls: message.tool_calls,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  async* generateStreamResponse(messages: AIMessage[], model: string, tools?: AITool[]): AsyncIterable<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

class AnthropicProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(messages: AIMessage[], model: string, tools?: AITool[]): Promise<AIResponse> {
    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: systemMessage,
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }

  async* generateStreamResponse(messages: AIMessage[], model: string, tools?: AITool[]): AsyncIterable<string> {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: systemMessage,
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                const content = parsed.delta?.text;
                if (content) {
                  yield content;
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

class GoogleProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(messages: AIMessage[], model: string, tools?: AITool[]): Promise<AIResponse> {
    // Convert messages to Google format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  async* generateStreamResponse(messages: AIMessage[], model: string, tools?: AITool[]): AsyncIterable<string> {
    // Google Gemini streaming implementation
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Model mapping to providers
const MODEL_PROVIDER_MAP: Record<string, string> = {
  'gpt-4': 'openai',
  'gpt-4-turbo': 'openai',
  'gpt-3.5-turbo': 'openai',
  'claude-3-opus': 'anthropic',
  'claude-3-sonnet': 'anthropic',
  'claude-3-haiku': 'anthropic',
  'gemini-pro': 'google',
  'command-r-plus': 'cohere',
  'mistral-large': 'mistral',
  'llama3': 'ollama',
  'phi3': 'ollama',
};

// API key mapping
const API_KEYS = {
  openai: process.env.OPENAI_API_KEY || '',
  anthropic: process.env.ANTHROPIC_API_KEY || '',
  google: process.env.GOOGLE_API_KEY || '',
  cohere: process.env.COHERE_API_KEY || '',
  mistral: process.env.MISTRAL_API_KEY || '',
};

export class AIProviderService {
  private providers: Record<string, AIProvider> = {};

  constructor() {
    // Initialize providers
    this.providers.ollama = new OllamaProvider();
    if (API_KEYS.openai) {
      this.providers.openai = new OpenAIProvider(API_KEYS.openai);
    }
    if (API_KEYS.anthropic) {
      this.providers.anthropic = new AnthropicProvider(API_KEYS.anthropic);
    }
    if (API_KEYS.google) {
      this.providers.google = new GoogleProvider(API_KEYS.google);
    }
  }

  async generateResponse(messages: AIMessage[], model: string, tools?: AITool[]): Promise<AIResponse> {
    const providerName = MODEL_PROVIDER_MAP[model];
    if (!providerName) {
      throw new Error(`Unsupported model: ${model}`);
    }

    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Provider not configured: ${providerName}`);
    }

    return provider.generateResponse(messages, model, tools);
  }

  async* generateStreamResponse(messages: AIMessage[], model: string, tools?: AITool[]): AsyncIterable<string> {
    const providerName = MODEL_PROVIDER_MAP[model];
    if (!providerName) {
      throw new Error(`Unsupported model: ${model}`);
    }

    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Provider not configured: ${providerName}`);
    }

    yield* provider.generateStreamResponse(messages, model, tools);
  }

  getAvailableModels(): string[] {
    const availableModels: string[] = [];
    
    for (const [model, provider] of Object.entries(MODEL_PROVIDER_MAP)) {
      if (this.providers[provider]) {
        availableModels.push(model);
      }
    }
    
    return availableModels;
  }
}

export const aiProviderService = new AIProviderService();