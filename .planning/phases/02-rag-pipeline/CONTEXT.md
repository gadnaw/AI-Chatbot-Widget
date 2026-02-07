# Phase 2 Context: RAG Pipeline + Multi-Tenancy

**Created:** February 7, 2026
**Phase:** 2 - RAG Pipeline + Multi-Tenancy

---

## Goal

Businesses can ingest documents (PDF, URL, text) and the system retrieves relevant content for AI responses while enforcing strict tenant data isolation.

---

## Implementation Decisions

### Vector Database: pgvector via Supabase

**Decision:** Use pgvector extension on Supabase PostgreSQL for embedding storage.

**Rationale:**
- Built-in to Supabase (no separate infrastructure)
- PostgreSQL maintains ACID compliance and RLS
- Sufficient for typical multi-tenant loads (< 1M vectors per tenant)
- Lower operational complexity and cost
- Can migrate to Pinecone if scale outgrows pgvector

**Schema:**
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table with tenant isolation
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL, -- 'pdf', 'url', 'text'
    source_url TEXT,
    content TEXT,
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "Tenant can access own documents"
    ON documents FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Chunks table with embeddings
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- text-embedding-3-small dimensions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on chunks
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can access own chunks"
    ON document_chunks FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### Document Processing: LangChain Loaders

**Decision:** Use LangChain document loaders for PDF, URL, and text sources.

**Rationale:**
- Unified API across different source types
- Active maintenance and community support
- Can extend with custom loaders if needed
- Integrates seamlessly with LangChain chunking and embeddings

**Implementation:**
```python
from langchain_community.document_loaders import (
    PyPDFLoader,
    WebBaseLoader,
    TextLoader
)

def load_document(source: str, source_type: str) -> List[Document]:
    if source_type == "pdf":
        loader = PyPDFLoader(source)
    elif source_type == "url":
        loader = WebBaseLoader(source)
    elif source_type == "text":
        loader = TextLoader(source)
    else:
        raise ValueError(f"Unsupported source type: {source_type}")
    
    return loader.load()
```

---

## Requirements Covered

| ID | Requirement | Implementation Approach |
|----|-------------|------------------------|
| RAG-01 | Document ingestion | LangChain loaders (PyPDFLoader, WebBaseLoader, TextLoader) |
| RAG-02 | Semantic chunking | LangChain RecursiveCharacterTextSplitter with overlap |
| RAG-03 | Retrieval with citations | pgvector similarity search with source tracking |
| TENANT-01 | PostgreSQL RLS | Tenant_id policies on documents and chunks tables |
| TENANT-02 | Vector namespace | pgvector schema + RLS (same database, isolated by tenant_id) |

---

## Technical Constraints

### From Phase 1

- **Backend:** FastAPI 0.109+ with Python 3.11+
- **AI Integration:** OpenAI text-embedding-3-small + GPT-4o-mini
- **Database:** Supabase with PostgreSQL

### From Project Research

- **Chunking:** Semantic chunking respecting paragraph/section boundaries
- **Overlap:** 200-token overlap to prevent boundary issues
- **Similarity Threshold:** 0.7 for retrieval
- **Source Citations:** Include source references in responses

### Specific Research Needed

ROADMAP.md flags this phase with `needs-research`:
- Optimal chunking parameters for different document types (PDF vs HTML)
- Chunk size optimization for embedding quality
- Handling different content structures (headers, lists, tables)

---

## Open Questions (for Research)

1. What chunk size and overlap provide optimal retrieval for both PDF and HTML content?
2. How to handle nested structures (headers within headers, tables) in chunking?
3. What metadata should be stored with chunks for source attribution?
4. How to implement re-indexing when source documents change?
5. What's the maximum document size/number of pages supported?

---

## References

- ROADMAP.md: Phase 2 specifications
- STATE.md: Project accumulated context
- research/SUMMARY.md: Phase recommendations
- research/ARCHITECTURE.md: RAG architecture patterns
- research/STACK.md: LangChain integration
- Phase 1 RESEARCH.md: Backend patterns established
