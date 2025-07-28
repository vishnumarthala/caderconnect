/**
 * Ollama Provider for Local LLMs
 */

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIResponse {
  content: string;
  model: string;
}

export class OllamaProvider {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:11434') {
    this.baseURL = baseURL;
  }

  async generateResponse(messages: AIMessage[], model: string): Promise<AIResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.message.content,
      model: data.model,
    };
  }

  async* generateStreamResponse(messages: AIMessage[], model: string): AsyncIterable<string> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
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
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            const parsed = JSON.parse(line);
            if (parsed.done === false) {
              yield parsed.message.content;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
