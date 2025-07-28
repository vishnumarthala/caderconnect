-- SQL functions for RAG system in Supabase
-- Run these in your Supabase SQL editor

-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables for documents and chunks
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_path TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  file_hash VARCHAR(64),
  content TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  chunk_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'uploaded',
  scan_results JSONB,
  processing_metadata JSONB,
  is_encrypted BOOLEAN DEFAULT FALSE,
  access_level VARCHAR(50) DEFAULT 'private',
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id VARCHAR(255) PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB,
  chunk_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_processed ON documents(processed);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Function to search document chunks using vector similarity
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id varchar(255),
  document_id uuid,
  document_name varchar(255),
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    d.filename as document_name,
    dc.content,
    dc.metadata,
    (dc.embedding <=> query_embedding) * -1 + 1 as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE (user_id IS NULL OR dc.user_id = user_id)
    AND d.processed = true
    AND (dc.embedding <=> query_embedding) * -1 + 1 > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get user document statistics
CREATE OR REPLACE FUNCTION get_user_document_stats(user_id uuid)
RETURNS TABLE (
  total_documents int,
  processed_documents int,
  total_chunks int,
  total_size_bytes bigint,
  file_types jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::int as total_documents,
    COUNT(CASE WHEN processed THEN 1 END)::int as processed_documents,
    COALESCE(SUM(chunk_count), 0)::int as total_chunks,
    COALESCE(SUM(file_size), 0)::bigint as total_size_bytes,
    jsonb_agg(DISTINCT mime_type) as file_types
  FROM documents
  WHERE documents.user_id = get_user_document_stats.user_id;
END;
$$;

-- Function to clean up old processed chunks (optional - for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_chunks(days_old int DEFAULT 90)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Delete chunks for documents that were deleted or are very old
  DELETE FROM document_chunks 
  WHERE document_id NOT IN (SELECT id FROM documents)
    OR created_at < NOW() - (days_old || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Enable Row Level Security (RLS) for documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for document chunks
CREATE POLICY "Users can view own document chunks" ON document_chunks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document chunks" ON document_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own document chunks" ON document_chunks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own document chunks" ON document_chunks
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON documents TO authenticated;
GRANT ALL ON document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION search_document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_document_stats TO authenticated;