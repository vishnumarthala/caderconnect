-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table for vector storage
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(3072), -- OpenAI text-embedding-3-large dimensions
    source_document TEXT NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS document_chunks_source_idx ON document_chunks(source_document);
CREATE INDEX IF NOT EXISTS document_chunks_uploader_idx ON document_chunks(uploader_id);
CREATE INDEX IF NOT EXISTS document_chunks_document_idx ON document_chunks(document_id);

-- Enable Row Level Security
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_chunks
CREATE POLICY "Users can view chunks from their organization" ON document_chunks
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE organization_id = (
                SELECT organization_id FROM auth.users WHERE id = uploader_id
            )
        )
    );

CREATE POLICY "Users can insert chunks for their uploads" ON document_chunks
    FOR INSERT WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Admins can manage all chunks" ON document_chunks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('SuperAdmin', 'PartyHead')
        )
    );

-- Function to search documents using vector similarity
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding vector(3072),
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    content text,
    similarity float,
    source_document text,
    document_id uuid,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.content,
        (dc.embedding <=> query_embedding) * -1 + 1 AS similarity,
        dc.source_document,
        dc.document_id,
        dc.metadata
    FROM document_chunks dc
    WHERE (dc.embedding <=> query_embedding) * -1 + 1 > similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get similar documents
CREATE OR REPLACE FUNCTION get_similar_documents(
    document_id_param uuid,
    similarity_threshold float DEFAULT 0.8,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    content text,
    similarity float,
    source_document text,
    document_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    doc_embedding vector(3072);
BEGIN
    -- Get the average embedding of the source document
    SELECT AVG(embedding) INTO doc_embedding
    FROM document_chunks
    WHERE document_id = document_id_param;

    IF doc_embedding IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        dc.id,
        dc.content,
        (dc.embedding <=> doc_embedding) * -1 + 1 AS similarity,
        dc.source_document,
        dc.document_id
    FROM document_chunks dc
    WHERE 
        dc.document_id != document_id_param
        AND (dc.embedding <=> doc_embedding) * -1 + 1 > similarity_threshold
    ORDER BY dc.embedding <=> doc_embedding
    LIMIT match_count;
END;
$$;

-- Function to update embeddings trigger
CREATE OR REPLACE FUNCTION update_document_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_document_chunks_updated_at_trigger
    BEFORE UPDATE ON document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_document_chunks_updated_at();

-- Performance metrics for embeddings
CREATE TABLE IF NOT EXISTS embedding_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_text TEXT NOT NULL,
    query_embedding vector(3072),
    results_count INTEGER,
    average_similarity FLOAT,
    search_duration_ms INTEGER,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance metrics
CREATE INDEX IF NOT EXISTS embedding_performance_user_idx ON embedding_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS embedding_performance_created_idx ON embedding_performance_metrics(created_at);

-- Function to log search performance
CREATE OR REPLACE FUNCTION log_search_performance(
    query_text text,
    query_embedding vector(3072),
    results_count int,
    average_similarity float,
    search_duration_ms int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO embedding_performance_metrics (
        query_text,
        query_embedding,
        results_count,
        average_similarity,
        search_duration_ms,
        user_id
    ) VALUES (
        query_text,
        query_embedding,
        results_count,
        average_similarity,
        search_duration_ms,
        auth.uid()
    );
END;
$$;

-- Create materialized view for frequently searched topics
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_search_topics AS
SELECT 
    query_text,
    COUNT(*) as search_count,
    AVG(average_similarity) as avg_similarity,
    AVG(search_duration_ms) as avg_duration_ms,
    MAX(created_at) as last_searched
FROM embedding_performance_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY query_text
HAVING COUNT(*) >= 5
ORDER BY search_count DESC, avg_similarity DESC;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS popular_search_topics_query_idx 
ON popular_search_topics(query_text);

-- Function to refresh popular topics (call this periodically)
CREATE OR REPLACE FUNCTION refresh_popular_search_topics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_search_topics;
END;
$$;