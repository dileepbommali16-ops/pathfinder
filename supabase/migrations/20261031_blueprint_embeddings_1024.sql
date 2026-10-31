-- ============================================================================
-- FILE 1: Supabase SQL (Paste in Supabase > SQL Editor & Click Run)
-- Vector Embedding Table & Search for Pathfinder 23 Blueprints (Voyage-3-lite 1024-D)
-- ============================================================================

-- 1. Vector enable
create extension if not exists vector;

-- 2. Table
create table if not exists blueprint_embeddings (
  id bigserial primary key,
  content text,
  blueprint_id text,
  embedding vector(1024),
  metadata jsonb
);

-- 3. Fast search index
create index on blueprint_embeddings using ivfflat (embedding vector_cosine_ops);

-- 4. Search function
create or replace function match_blueprints(query_embedding vector(1024), match_count int default 3)
returns table(id bigint, content text, blueprint_id text, similarity float)
language plpgsql as $$
begin
  return query
  select b.id, b.content, b.blueprint_id, 1 - (b.embedding <=> query_embedding) as similarity
  from blueprint_embeddings b
  order by b.embedding <=> query_embedding
  limit match_count;
end;
$$;

