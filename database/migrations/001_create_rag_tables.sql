-- Migration: Create RAG tables with pgvector and RLS policies
-- Phase 2 Wave 1: Database Schema and RLS Policies Setup
-- Generated: February 7, 2026

-- Enable pgvector extension
-- pgvector provides vector similarity search capabilities for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create app_private schema for RAG tables
-- Isolates RAG data from public schema and provides RLS bypass capability for system operations
CREATE SCHEMA IF NOT EXISTS app_private;

-- Create tenants table for multi-tenant reference
-- Tracks tenant organizations that own documents
CREATE TABLE IF NOT EXISTS app_private.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table
-- Stores document metadata and content references for RAG pipeline
-- tenant_id enforces data isolation at the tenant level
CREATE TABLE IF NOT EXISTS app_private.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES app_private.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'html', 'text')),
    source_url TEXT,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    chunk_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on documents table
-- RLS ensures tenants can only access their own documents
ALTER TABLE app_private.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents table
-- SELECT policy: Tenants can only view their own documents
CREATE POLICY "Tenant can view own documents"
    ON app_private.documents
    FOR SELECT
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM app_private.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- INSERT policy: Tenants can only insert documents for themselves
CREATE POLICY "Tenant can insert own documents"
    ON app_private.documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id
            FROM app_private.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- UPDATE policy: Tenants can only update their own documents
CREATE POLICY "Tenant can update own documents"
    ON app_private.documents
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM app_private.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- DELETE policy: Tenants can only delete their own documents
CREATE POLICY "Tenant can delete own documents"
    ON app_private.documents
    FOR DELETE
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM app_private.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- Create document_chunks table
-- Stores chunked document content with vector embeddings for similarity search
-- embedding column uses VECTOR(512) for text-embedding-3-small dimensions
CREATE TABLE IF NOT EXISTS app_private.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES app_private.documents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES app_private.tenants(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(512),
    metadata JSONB DEFAULT '{}',
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'html', 'text')),
    source_page_ref TEXT,
    source_url TEXT,
    hierarchy_path TEXT[],
    word_count INTEGER,
    char_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on document_chunks table
-- RLS ensures tenants can only access their own document chunks
ALTER TABLE app_private.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_chunks table
-- SELECT policy: Tenants can only view their own chunks
CREATE POLICY "Tenant can view own chunks"
    ON app_private.document_chunks
    FOR SELECT
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM app_private.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- INSERT policy: Tenants can only insert chunks for themselves
CREATE POLICY "Tenant can insert own chunks"
    ON app_private.document_chunks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id
            FROM app_private.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- UPDATE policy: Tenants can only update their own chunks
CREATE POLICY "Tenant can update own chunks"
    ON app_private.document_chunks
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM app_private.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- DELETE policy: Tenants can only delete their own chunks
CREATE POLICY "Tenant can delete own chunks"
    ON app_private.document_chunks
    FOR DELETE
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM app_private.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- Create tenant_members table for user-to-tenant mapping
-- Links Supabase auth.users to tenants for RLS policy evaluation
CREATE TABLE IF NOT EXISTS app_private.tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES app_private.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Enable RLS on tenant_members table
ALTER TABLE app_private.tenant_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_members table
-- Users can view their own tenant memberships
CREATE POLICY "Users can view own tenant memberships"
    ON app_private.tenant_members
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Create similarity_search RPC function for pgvector cosine distance search
-- Uses cosine distance (<=> operator) for semantic similarity
-- Filters results by tenant_id for multi-tenant isolation
-- Returns chunks with similarity score >= match_threshold
CREATE OR REPLACE FUNCTION app_private.similarity_search(
    query_embedding VECTOR(512),
    match_threshold DOUBLE PRECISION,
    match_count INT,
    tenant_filter UUID
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    distance DOUBLE PRECISION,
    metadata JSONB,
    hierarchy_path TEXT[],
    source_page_ref TEXT,
    source_url TEXT,
    source_type TEXT,
    document_title TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        (dc.embedding <=> query_embedding) AS distance,
        dc.metadata,
        dc.hierarchy_path,
        dc.source_page_ref,
        dc.source_url,
        dc.source_type,
        d.title AS document_title
    FROM app_private.document_chunks dc
    INNER JOIN app_private.documents d ON dc.document_id = d.id
    WHERE dc.tenant_id = tenant_filter
        AND (dc.embedding <=> query_embedding) < match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create HNSW index on document_chunks embedding column for fast similarity search
-- HNSW (Hierarchical Navigable Small World) provides excellent recall/performance trade-off
-- m=16: Number of connections per layer (higher = better recall, more memory)
-- ef_construction=64: Search width during index construction (higher = better index quality)
-- Uses vector_cosine_ops for cosine distance similarity
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
    ON app_private.document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Create indexes for common query patterns
-- Index on document_id for chunk-to-document lookups
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
    ON app_private.document_chunks(document_id);

-- Index on tenant_id for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_id
    ON app_private.document_chunks(tenant_id);

-- Index on status for document status queries
CREATE INDEX IF NOT EXISTS idx_documents_status
    ON app_private.documents(status);

-- Composite index for tenant+document lookups
CREATE INDEX IF NOT EXISTS idx_documents_tenant_created
    ON app_private.documents(tenant_id, created_at DESC);

-- Create updated_at trigger function to auto-update timestamp
CREATE OR REPLACE FUNCTION app_private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON app_private.documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON app_private.documents
    FOR EACH ROW
    EXECUTE FUNCTION app_private.update_updated_at_column();

-- Apply updated_at trigger to document_chunks table
DROP TRIGGER IF EXISTS update_document_chunks_updated_at ON app_private.document_chunks;
CREATE TRIGGER update_document_chunks_updated_at
    BEFORE UPDATE ON app_private.document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION app_private.update_updated_at_column();

-- Verify installation
-- These queries can be used to verify the migration completed successfully
-- SELECT * FROM pg_extension WHERE extname = 'vector';
-- SELECT schemaname, tablename, polname, roles FROM pg_policies WHERE tablename IN ('documents', 'document_chunks');
-- SELECT indexname FROM pg_indexes WHERE indexname LIKE '%hnsw%';
-- SELECT proname FROM pg_proc WHERE proname = 'similarity_search';
