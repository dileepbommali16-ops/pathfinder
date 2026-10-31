-- ============================================================================
-- Pathfinder 2.0: Unified RAG Vector Store (23 Flagship Blueprints + 972 Placements)
-- Database: Supabase PostgreSQL with pgvector
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Unified Knowledge Embeddings Table (23 Project Blueprints + 972 Placement Records)
CREATE TABLE IF NOT EXISTS public.pathfinder_knowledge_embeddings (
    id TEXT PRIMARY KEY,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('blueprint', 'placement_record', 'placement_cohort')),
    source_id TEXT NOT NULL,
    title TEXT NOT NULL,
    branch TEXT DEFAULT 'ALL',
    skill_category TEXT DEFAULT 'General',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(384) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for Hybrid Filtering + HNSW Cosine Similarity Search
CREATE INDEX IF NOT EXISTS idx_pathfinder_rag_doc_type
    ON public.pathfinder_knowledge_embeddings (doc_type);

CREATE INDEX IF NOT EXISTS idx_pathfinder_rag_branch
    ON public.pathfinder_knowledge_embeddings (branch);

CREATE INDEX IF NOT EXISTS idx_pathfinder_rag_skill
    ON public.pathfinder_knowledge_embeddings (skill_category);

CREATE INDEX IF NOT EXISTS idx_pathfinder_rag_embedding_hnsw
    ON public.pathfinder_knowledge_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 3. Semantic Search RPC: Returns Top-K (default 3) matches for Groq Prompt Injection
CREATE OR REPLACE FUNCTION public.match_pathfinder_knowledge(
    query_embedding vector(384),
    match_threshold FLOAT DEFAULT 0.15,
    match_count INT DEFAULT 3,
    filter_branch TEXT DEFAULT NULL,
    filter_doc_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    doc_type TEXT,
    source_id TEXT,
    title TEXT,
    branch TEXT,
    skill_category TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.doc_type,
        k.source_id,
        k.title,
        k.branch,
        k.skill_category,
        k.content,
        k.metadata,
        1 - (k.embedding <=> query_embedding) AS similarity
    FROM public.pathfinder_knowledge_embeddings k
    WHERE
        (filter_doc_type IS NULL OR k.doc_type = filter_doc_type)
        AND (filter_branch IS NULL OR k.branch = 'ALL' OR k.branch ILIKE '%' || filter_branch || '%')
        AND (1 - (k.embedding <=> query_embedding)) >= match_threshold
    ORDER BY k.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Enable Row Level Security with public read access for fast edge semantic search
ALTER TABLE public.pathfinder_knowledge_embeddings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'pathfinder_knowledge_embeddings'
          AND policyname = 'Allow public read access to pathfinder RAG embeddings'
    ) THEN
        CREATE POLICY "Allow public read access to pathfinder RAG embeddings"
            ON public.pathfinder_knowledge_embeddings
            FOR SELECT
            USING (true);
    END IF;
END
$$;

