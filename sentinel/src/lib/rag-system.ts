/**
 * RAG (Retrieval Augmented Generation) System
 * Handles document processing, embedding generation, and semantic search
 */

import { LocalVectorStore } from './local-vector-store';
import { OllamaProvider } from './ollama';

const ollamaProvider = new OllamaProvider();
/**
 * RAG (Retrieval Augmented Generation) System
 * Handles document processing, embedding generation, and semantic search
 */

interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: any;
  chunkIndex: number;
}

interface SearchResult {
  content: string;
  metadata: any;
  similarity: number;
  documentId: string;
  documentName: string;
}

export class RAGSystem {
  private vectorStore: LocalVectorStore;

  constructor() {
    this.vectorStore = new LocalVectorStore();
  }

  /**
   * Process document for RAG - split into chunks and generate embeddings
   */
  async processDocument(documentId: string, content: string, userId: string): Promise<boolean> {
    try {
      // Split content into chunks
      const chunks = this.splitTextIntoChunks(content, 1000, 200);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate embedding for chunk
        const embedding = await this.generateEmbedding(chunk);

        const documentChunk = {
          id: `${documentId}-chunk-${i}`,
          documentId,
          content: chunk,
          metadata: {
            chunkIndex: i,
            totalChunks: chunks.length,
            userId,
            processedAt: new Date().toISOString(),
          },
        };

        this.vectorStore.add(embedding, documentChunk);
      }

      console.log(`Document ${documentId} processed successfully with ${chunks.length} chunks`);
      return true;
    } catch (error) {
      console.error('Error processing document for RAG:', error);
      return false;
    }
  }

  /**
   * Search documents using semantic similarity
   */
  async searchDocuments(query: string, userId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search using vector similarity in the local store
      const results = this.vectorStore.search(queryEmbedding, limit);

      // Format results
      return results.map((item) => ({
        content: item.document.content,
        metadata: item.document.metadata,
        similarity: 1 - item.distance, // Convert distance to similarity
        documentId: item.document.documentId,
        documentName: item.document.metadata.documentName,
      }));
    } catch (error) {
      console.error('Error in document search:', error);
      return [];
    }
  }

  /**
   * Get document context for AI chat
   */
  async getDocumentContext(query: string, userId: string): Promise<string> {
    const results = await this.searchDocuments(query, userId, 3);
    
    if (results.length === 0) {
      return '';
    }

    const context = results
      .map((result, index) => 
        `[Document ${index + 1}: ${result.documentName}]\n${result.content}`
      )
      .join('\n\n');

    return `Based on your uploaded documents:\n\n${context}`;
  }

  /**
   * Split text into overlapping chunks
   */
  private splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.slice(start, end);
      
      // Try to break at sentence or word boundaries
      if (end < text.length) {
        const lastSentence = chunk.lastIndexOf('.');
        const lastSpace = chunk.lastIndexOf(' ');
        
        if (lastSentence > chunkSize * 0.7) {
          chunk = chunk.slice(0, lastSentence + 1);
        } else if (lastSpace > chunkSize * 0.7) {
          chunk = chunk.slice(0, lastSpace);
        }
      }

      const trimmedChunk = chunk.trim();
      if (trimmedChunk.length > 0) {
        chunks.push(trimmedChunk);
      }
      
      start += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ollamaProvider.generateResponse(
        [{ role: 'user', content: text }],
        'mxbai-embed-large'
      );
      return response.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return zero vector as fallback
      return new Array(1024).fill(0);
    }
  }

  /**
   * Extract text from different file types
   */
  async extractTextFromFile(file: File): Promise<string> {
    try {
      if (file.type === 'text/plain' || file.type === 'text/csv') {
        return await file.text();
      }
      
      if (file.type === 'application/json') {
        const text = await file.text();
        const json = JSON.parse(text);
        return this.extractTextFromJSON(json);
      }

      // For other types, you would integrate libraries like:
      // - pdf-parse for PDFs
      // - mammoth for DOCX files
      // - node-xlsx for Excel files
      
      // For now, return placeholder
      return `[${file.type}] Content extraction not implemented yet.`;
      
    } catch (error) {
      console.error('Error extracting text from file:', error);
      return '';
    }
  }

  /**
   * Extract searchable text from JSON objects
   */
  private extractTextFromJSON(obj: any, path: string = ''): string {
    if (typeof obj === 'string') {
      return obj;
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        this.extractTextFromJSON(item, `${path}[${index}]`)
      ).join(' ');
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj)
        .map(([key, value]) => 
          `${key}: ${this.extractTextFromJSON(value, `${path}.${key}`)}`
        )
        .join(' ');
    }
    
    return '';
  }

  
}

export const ragSystem = new RAGSystem();