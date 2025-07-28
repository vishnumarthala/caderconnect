import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

interface RAGSearchResult {
  content: string;
  metadata: {
    source: string;
    relevance_score: number;
    document_id: string;
    chunk_id: string;
  };
}

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
}

interface AICoreResponse {
  response: string;
  sources: Array<{
    type: 'internal' | 'web';
    source: string;
    relevance: number;
  }>;
  confidence: number;
}

export class AICore {
  private openai: OpenAI;
  private supabase: any;
  private embeddingModel = 'text-embedding-3-large';
  private chatModel = 'gpt-4o';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Generate embeddings for text content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text.slice(0, 8000), // Limit to prevent token overflow
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Perform semantic search in the vector database
   */
  async performRAGSearch(query: string, limit: number = 5): Promise<RAGSearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in vector database using pgvector similarity
      const { data, error } = await this.supabase.rpc('search_documents', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.7,
        match_count: limit
      });

      if (error) {
        console.error('RAG search error:', error);
        return [];
      }

      return data.map((item: any) => ({
        content: item.content,
        metadata: {
          source: item.source_document,
          relevance_score: item.similarity,
          document_id: item.document_id,
          chunk_id: item.id
        }
      }));
    } catch (error) {
      console.error('Error in RAG search:', error);
      return [];
    }
  }

  /**
   * Perform web search for recent information
   */
  async performWebSearch(query: string, limit: number = 3): Promise<WebSearchResult[]> {
    try {
      // Use a web search API (implement based on your choice)
      // This is a placeholder - replace with actual web search implementation
      const searchResults = await this.searchWeb(query, limit);
      return searchResults;
    } catch (error) {
      console.error('Error in web search:', error);
      return [];
    }
  }

  /**
   * Placeholder for web search implementation
   */
  private async searchWeb(query: string, limit: number): Promise<WebSearchResult[]> {
    // Implement actual web search here (Google Custom Search, Bing, etc.)
    // For now, return mock results
    return [];
  }

  /**
   * Generate AI response using RAG and web search
   */
  async generateResponse(
    query: string,
    userRole: string,
    context?: any
  ): Promise<AICoreResponse> {
    try {
      // Perform RAG search
      const ragResults = await this.performRAGSearch(query);
      
      // Perform web search if RAG results are insufficient
      let webResults: WebSearchResult[] = [];
      if (ragResults.length < 3 || ragResults[0]?.metadata.relevance_score < 0.8) {
        webResults = await this.performWebSearch(query);
      }

      // Construct the master prompt
      const systemPrompt = this.buildSystemPrompt(userRole);
      const contextPrompt = this.buildContextPrompt(query, ragResults, webResults);

      // Generate response using OpenAI
      const completion = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content || 'No response generated';

      // Calculate confidence score
      const confidence = this.calculateConfidence(ragResults, webResults);

      // Prepare sources
      const sources = [
        ...ragResults.map(r => ({
          type: 'internal' as const,
          source: r.metadata.source,
          relevance: r.metadata.relevance_score
        })),
        ...webResults.map(r => ({
          type: 'web' as const,
          source: r.url,
          relevance: 0.8 // Default web relevance
        }))
      ];

      return {
        response,
        sources,
        confidence
      };

    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Build system prompt based on user role
   */
  private buildSystemPrompt(userRole: string): string {
    const basePrompt = `You are "Sentinel Advisor", an expert political strategist and analyst. Your response must be objective, data-driven, and aligned with the party's official stance. Provide structured, actionable responses.`;

    const roleSpecificPrompts = {
      SuperAdmin: `${basePrompt} You have access to all system data and can provide comprehensive strategic insights.`,
      PartyHead: `${basePrompt} Focus on national-level strategy and high-level decision making.`,
      RegionalLead: `${basePrompt} Provide regional analysis and coordination strategies.`,
      Member: `${basePrompt} Focus on constituency-level insights and public engagement strategies.`,
      Karyakartha: `${basePrompt} Provide grassroots-level guidance and local campaign support.`
    };

    return roleSpecificPrompts[userRole as keyof typeof roleSpecificPrompts] || basePrompt;
  }

  /**
   * Build context prompt with retrieved information
   */
  private buildContextPrompt(
    query: string,
    ragResults: RAGSearchResult[],
    webResults: WebSearchResult[]
  ): string {
    let prompt = `**User Query:** "${query}"\n\n`;

    if (ragResults.length > 0) {
      prompt += `**Context from Internal Database:**\n`;
      ragResults.forEach((result, index) => {
        prompt += `${index + 1}. ${result.content} [Source: ${result.metadata.source}]\n`;
      });
      prompt += '\n';
    }

    if (webResults.length > 0) {
      prompt += `**Context from Live Web Search:**\n`;
      webResults.forEach((result, index) => {
        prompt += `${index + 1}. ${result.snippet} [Source: ${result.title} - ${result.url}]\n`;
      });
      prompt += '\n';
    }

    prompt += `**Your Task:** Based on the provided context, generate a comprehensive response. If the query asks for a rebuttal, structure it with:
1. **The Claim:** Clearly state the opposing claim.
2. **Our Stance:** A concise summary of the party's position.
3. **Key Rebuttal Points:** A bulleted list of counter-arguments, each supported by facts, figures, or quotes from the provided context. Cite your sources.
4. **Actionable Soundbites:** Provide 2-3 short, memorable sentences that can be used in public statements or on social media.

If the query is for information, provide a detailed, neutral summary citing all sources.`;

    return prompt;
  }

  /**
   * Calculate confidence score based on search results
   */
  private calculateConfidence(ragResults: RAGSearchResult[], webResults: WebSearchResult[]): number {
    if (ragResults.length === 0 && webResults.length === 0) return 0.1;

    let totalScore = 0;
    let totalWeight = 0;

    // Weight internal sources higher
    ragResults.forEach(result => {
      totalScore += result.metadata.relevance_score * 0.8;
      totalWeight += 0.8;
    });

    // Web sources get lower weight
    webResults.forEach(() => {
      totalScore += 0.6 * 0.2;
      totalWeight += 0.2;
    });

    return totalWeight > 0 ? Math.min(totalScore / totalWeight, 0.95) : 0.5;
  }

  /**
   * Process and store document in vector database
   */
  async processDocument(
    filename: string,
    content: string,
    uploaderId: string,
    metadata: any = {}
  ): Promise<boolean> {
    try {
      // Split content into chunks
      const chunks = this.splitIntoChunks(content);

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.generateEmbedding(chunk);

        // Store in database
        const { error } = await this.supabase
          .from('document_chunks')
          .insert({
            content: chunk,
            embedding,
            source_document: filename,
            uploader_id: uploaderId,
            chunk_index: i,
            metadata: {
              ...metadata,
              total_chunks: chunks.length
            }
          });

        if (error) {
          console.error(`Error storing chunk ${i}:`, error);
          return false;
        }
      }

      // Update document status
      await this.supabase
        .from('documents')
        .update({ 
          status: 'processed',
          processed_at: new Date().toISOString()
        })
        .eq('filename', filename)
        .eq('uploader_id', uploaderId);

      return true;
    } catch (error) {
      console.error('Error processing document:', error);
      return false;
    }
  }

  /**
   * Split content into chunks for vector storage
   */
  private splitIntoChunks(content: string, chunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const paragraphs = content.split('\n\n');
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

export default AICore;