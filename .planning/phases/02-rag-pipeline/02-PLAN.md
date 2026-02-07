---
phase: 02-rag-pipeline
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - chatbot-backend/app/api/rag/documents.py
  - chatbot-backend/app/api/rag/chunks.py
  - chatbot-backend/app/services/rag/
  - chatbot-backend/app/models/
  - database/migrations/
autonomous: true
provides_interface:
  - name: DocumentService
    type: service
    methods: [create_document, get_documents, delete_document, update_document]
    description: CRUD operations for tenant-specific documents
  - name: ChunkService
    type: service
    methods: [store_chunks, search_chunks, delete_chunks_by_document]
    description: Vector storage and semantic retrieval per tenant
  - name: RAGIngestionPipeline
    type: service
    methods: [ingest_document, process_pdf, process_url, process_text]
    description: End-to-end document ingestion with chunking and embedding
  - name: /api/rag/documents
    type: api
    methods: [POST, GET, DELETE]
    description: REST endpoints for document management
  - name: /api/rag/search
    type: api
    methods: [POST]
    description: Similarity search endpoint with tenant isolation
assumes_from: []
---

<objective>
Implement the core RAG pipeline for document ingestion, semantic chunking, embedding generation, and vector storage with strict multi-tenant isolation using pgvector and PostgreSQL RLS.

Purpose: Enable businesses to ingest documents (PDF, URL, text) and retrieve relevant content for AI responses while enforcing complete tenant data isolation.

Output: Complete RAG pipeline with document CRUD, chunking engine, embedding generation, and similarity search - all tenant-isolated via database policies.
</objective>

<execution_context>
{file:~/.config/opencode/gsd/workflows/execute-plan.md}
{file:~/.config/opencode/gsd/templates/summary.md}
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-rag-pipeline/02-RESEARCH.md
@.planning/phases/02-rag-pipeline/CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md

# Phase dependencies
@.planning/phases/01-widget-foundation/01-SUMMARY.md
</context>

<tasks>

<task id="01" type="auto">
  <name>Database Schema and RLS Policies Setup</name>
  <files>
    - database/migrations/001_create_rag_tables.sql
    - chatbot-backend/app/models/rag.py
  </files>
  <action>
    Create database schema with pgvector extension and comprehensive RLS policies for tenant isolation.

    Create SQL migration file with:
    1. Enable pgvector extension
    2. Create app_private schema
    3. Create documents table with tenant_id, source_type, status, metadata
    4. Create document_chunks table with embedding column (VECTOR(512)), content, hierarchy_path
    5. Enable RLS on both tables
    6. Create RLS policies: SELECT, INSERT, UPDATE, DELETE for tenant members
    7. Create similarity_search RPC function with cosine distance (<=>)
    8. Create HNSW index on embedding column (m=16, ef_construction=64)
    9. Add foreign key constraint: document_chunks.document_id → documents.id

    Create Python models in chatbot-backend/app/models/rag.py:
    - Document: id, tenant_id, title, source_type, source_url, content, status, chunk_count, created_at, updated_at
    - DocumentChunk: id, document_id, tenant_id, chunk_index, content, embedding, metadata, source_type, source_page_ref, hierarchy_path, word_count, char_count, created_at

    Run migration against Supabase database using Supabase CLI or direct SQL execution.
  </action>
  <verify>
    <criterion>Migration executes without errors</criterion>
    <criterion>pgvector extension enabled (SELECT * FROM pg_extension WHERE extname = 'vector')</criterion>
    <criterion>RLS enabled on documents and document_chunks (SELECT relname, rowsecurity FROM pg_class WHERE relname IN ('documents', 'document_chunks'))</criterion>
    <criterion>HNSW index created (SELECT indexname FROM pg_indexes WHERE indexname LIKE '%hnsw%')</criterion>
    <criterion>similarity_search function exists (SELECT proname FROM pg_proc WHERE proname = 'similarity_search')</criterion>
    <criterion>Python models compile without import errors</criterion>
  </verify>
  <done>
    Database schema created with pgvector, RLS policies enforced, and HNSW indexes ready for vector operations
  </done>
</task>

<task id="02" type="auto">
  <name>Document Type Detection and Content Validation</name>
  <files>
    - chatbot-backend/app/services/rag/document_detector.py
    - chatbot-backend/app/services/rag/validators.py
  </files>
  <action>
    Implement document type detection and content validation utilities.

    Create document_detector.py with:
    - detect_type(source: str | bytes, mime_type: str | None) → 'pdf' | 'html' | 'text'
    - validate_pdf_content(buffer: bytes) → bool
    - validate_url_content(url: str, timeout: int = 30) → str | None
    - validate_text_content(content: str, max_length: int = 100000) → str

    Create validators.py with:
    - ContentSizeValidator: max 10MB for PDF, 5MB for text
    - URLAccessibilityValidator: check HTTP status, content-type
    - TextEncodingValidator: detect UTF-8, handle common encodings
    - MaliciousContentValidator: basic pattern matching for suspicious content

    Use python-magic for MIME type detection, requests for URL validation.
  </action>
  <verify>
    <criterion>PDF detection returns 'pdf' for application/pdf MIME type</criterion>
    <criterion>HTML detection returns 'html' for text/html MIME type</criterion>
    <criterion>URL validation returns content within 30 seconds</criterion>
    <criterion>Text validation accepts UTF-8 content up to 100K characters</criterion>
    <criterion>Invalid files rejected with appropriate error messages</criterion>
  </verify>
  <done>
    Document type detection and content validation working for PDF, URL, and text sources
  </done>
</task>

<task id="03" type="auto">
  <name>Document Loader Service Implementation</name>
  <files>
    - chatbot-backend/app/services/rag/loaders.py
  </files>
  <action>
    Implement document loading service with type-specific loaders using LangChain.

    Create loaders.py with LangChain document loaders:

    PDFLoader implementation:
    - Use PDFMinerLoader from langchain_community.document_loaders
    - Extract text with page markers: "[Page N]" prefix
    - Return LangChain Document objects with metadata: page_number, source_path
    - Handle multi-column PDFs by detecting and preserving layout

    WebBaseLoader implementation:
    - Use WebBaseLoader from langchain_community.document_loaders.web
    - Remove scripts, styles, nav, footer via BeautifulSoup
    - Convert HTML to markdown using html2text or BeautifulSoup
    - Extract title, meta description, headings for metadata

    TextLoader implementation:
    - Use TextLoader from langchain.document_loaders
    - Auto-detect encoding (UTF-8, UTF-16, ISO-8859-1)
    - Handle line endings (CRLF, LF)
    - Preserve paragraph structure

    Create loader factory function:
    def get_loader(source: str | bytes, doc_type: str) -> BaseLoader:
        if doc_type == 'pdf': return PDFLoader(source)
        elif doc_type == 'html': return WebBaseLoader(source)
        elif doc_type == 'text': return TextLoader(source)
        else: raise ValueError(f"Unsupported document type: {doc_type}")
  </action>
  <verify>
    <criterion>PDF loader extracts text with page numbers (5-page PDF returns 5 Document objects)</criterion>
    <criterion>Web loader returns clean text without HTML tags</criterion>
    <criterion>Text loader preserves paragraph structure</criterion>
    <criterion>Loader factory returns appropriate loader for each type</criterion>
    <criterion>All loaders return LangChain Document objects</criterion>
  </verify>
  <done>
    Document loading service implemented for PDF, HTML, and text sources using LangChain loaders
  </done>
</task>

</tasks>

<verification>
## Wave 1 Verification Criteria

### Database Schema Verification
```bash
# Verify pgvector installation
psql $SUPABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Verify RLS policies
psql $SUPABASE_URL -c "SELECT schemaname, tablename, polname, roles FROM pg_policies WHERE tablename IN ('documents', 'document_chunks');"

# Verify HNSW index
psql $SUPABASE_URL -c "SELECT indexname, indexdef FROM pg_indexes WHERE indexname LIKE '%hnsw%';"

# Test RLS enforcement (should return empty for wrong tenant)
psql $SUPABASE_URL -c "SELECT * FROM documents WHERE tenant_id != 'current-tenant-id';"
```

### Document Detection Verification
```python
# Test document type detection
detector = DocumentDetector()
assert detector.detect_type(b'%PDF-1.4', 'application/pdf') == 'pdf'
assert detector.detect_type('<html></html>', 'text/html') == 'html'
assert detector.detect_type('Hello world', 'text/plain') == 'text'
```

### Document Loading Verification
```python
# Test PDF loading
pdf_loader = PDFLoader('test.pdf')
docs = pdf_loader.load()
assert len(docs) > 0
assert '[Page' in docs[0].pageContent

# Test URL loading
web_loader = WebBaseLoader('https://example.com')
docs = web_loader.load()
assert len(docs) > 0
assert '<script>' not in docs[0].pageContent
```

## Success Criteria for Wave 1
- [ ] Database schema created with pgvector and RLS policies
- [ ] Document type detection working for all supported types
- [ ] Document loaders return LangChain Document objects
- [ ] All verification tests passing
</verification>

<success_criteria>
## Phase 2 Success Criteria

### Functional Requirements
1. **Document Ingestion (RAG-01)**: ✅ Addresses
   - PDF upload endpoint returns 201 with document_id within 60s for <50 pages
   - URL ingestion extracts content within 30s
   - Text paste creates document with validated content

2. **Semantic Chunking (RAG-02)**: ✅ Addresses
   - PDF chunks: 1200 chars, 200 overlap, structure-aware
   - HTML chunks: 800 chars, 150 overlap, DOM hierarchy-aware
   - Text chunks: 512 tokens, 200 tokens overlap, semantic boundaries

3. **Retrieval with Citations (RAG-03)**: ✅ Addresses
   - Similarity search with 0.7 threshold returns relevant chunks
   - Source attribution includes document title, URL, page number
   - Hierarchy path preserved for context

4. **RLS Tenant Isolation (TENANT-01)**: ✅ Addresses
   - All queries filtered by tenant_id via RLS policies
   - Cross-tenant data access blocked at database level
   - Service role used only for migrations

5. **Vector Namespace (TENANT-02)**: ✅ Addresses
   - HNSW indexes per tenant for isolation
   - Embedding storage with VECTOR(512)
   - Cosine distance similarity search

### Performance Requirements
- Document ingestion: < 60 seconds for typical document (< 50 pages)
- Embedding generation: ~50ms per chunk (batch optimization)
- Similarity retrieval: < 100ms response time
- API key validation: < 100ms server-side

### Quality Requirements
- Retrieval relevance: Similarity > 0.7 with source citations
- Tenant isolation: 100% data separation verified
- Fallback handling: Graceful response for unrelated questions
</success_criteria>

<output>
After completing Wave 1, create `.planning/phases/02-rag-pipeline/02-01-SUMMARY.md`
</output>
---

---
phase: 02-rag-pipeline
plan: 02
type: execute
wave: 2
depends_on: []
files_modified:
  - chatbot-backend/app/services/rag/chunking.py
  - chatbot-backend/app/services/rag/embeddings.py
  - chatbot-backend/app/services/rag/ingestion.py
  - chatbot-backend/app/api/rag/ingest.py
autonomous: true
provides_interface:
  - name: ChunkingEngine
    type: service
    methods: [chunk_pdf, chunk_html, chunk_text, chunk_document]
    description: Document-type-specific semantic chunking with structure awareness
  - name: EmbeddingService
    type: service
    methods: [embed_texts, embed_query, batch_embed]
    description: OpenAI text-embedding-3-small integration with batching
  - name: RAGIngestionPipeline
    type: service
    methods: [ingest_document, process_queue, get_status]
    description: End-to-end pipeline orchestration with progress tracking
assumes_from:
  - phase: 01
    interface: DatabaseConnection
    usage: Store document and chunk records
  - phase: 01
    interface: OpenAIClient
    usage: Generate embeddings for chunks and queries
---
<objective>
Implement the semantic chunking engine and embedding generation pipeline with document-type-specific strategies.

Purpose: Transform raw documents into semantically coherent chunks with embeddings for vector storage and retrieval.

Output: Chunking engine supporting PDF (1200 chars/200 overlap), HTML (800 chars/150 overlap), and text (512 tokens/200 tokens) with OpenAI embedding generation.
</objective>

<execution_context>
{file:~/.config/opencode/gsd/workflows/execute-plan.md}
{file:~/.config/opencode/gsd/templates/summary.md}
</execution_context>

<context>
@.planning/phases/02-rag-pipeline/02-RESEARCH.md
@.planning/phases/02-rag-pipeline/02-PLAN.md (Wave 1)
@.planning/research/STACK.md
</context>

<tasks>

<task id="04" type="auto">
  <name>Semantic Chunking Engine Implementation</name>
  <files>
    - chatbot-backend/app/services/rag/chunking.py
  </files>
  <action>
    Implement the semantic chunking engine with type-specific strategies.

    Create chunking.py with RecursiveCharacterTextSplitter configurations:

    PDF Chunking Strategy:
    - chunk_size: 1200 characters, chunk_overlap: 200 characters
    - Separators: ['\n\n', '\n', '.', '!', '?', ',', ' ', '']
    - Add page markers: "[Page N]" at start of each page
    - Detect and preserve table structures (keep intact if < 2000 chars)
    - Extract heading hierarchy for metadata (hierarchy_path)

    HTML Chunking Strategy:
    - chunk_size: 800 characters, chunk_overlap: 150 characters
    - Remove non-content: scripts, styles, nav, footer, aside
    - Preserve DOM hierarchy: <h1>-<h6>, article, section
    - Extract title and meta description for metadata
    - Clean HTML to markdown conversion

    Text Chunking Strategy:
    - chunk_size: 512 tokens, chunk_overlap: 200 tokens
    - Split by paragraphs first, then sentences
    - Never split mid-sentence
    - Preserve paragraph boundaries

    Implement chunk metadata enrichment:
    - chunk_index: sequential number within document
    - hierarchy_path: ['Section', 'Subsection']
    - source_page_ref: page number (PDF) or section ref (HTML)
    - word_count, char_count

    Create ChunkingEngine class with method signatures:
    - async def chunk_pdf(self, document: Document) -> List[Document]
    - async def chunk_html(self, document: Document) -> List[Document]
    - async def chunk_text(self, document: Document) -> List[Document]
    - async def chunk_document(self, document: Document, doc_type: str) -> List[Document]
  </action>
  <verify>
    <criterion>PDF chunking produces chunks with 1200 ±200 chars and 200-char overlap</criterion>
    <criterion>HTML chunking removes scripts/styles and preserves headings</criterion>
    <criterion>Text chunking produces chunks with 512 ±50 tokens and 200-token overlap</criterion>
    <criterion>Chunk metadata includes hierarchy_path, source_page_ref, chunk_index</criterion>
    <criterion>No mid-sentence splits in any document type</criterion>
    <criterion>Tables preserved as atomic units in PDF chunks</criterion>
  </verify>
  <done>
    Semantic chunking engine implemented with type-specific strategies and comprehensive metadata
  </done>
</task>

<task id="05" type="auto">
  <name>Embedding Generation Service</name>
  <files>
    - chatbot-backend/app/services/rag/embeddings.py
  </files>
  <action>
    Implement embedding generation service using OpenAI text-embedding-3-small.

    Create embeddings.py with:

    EmbeddingService class:
    - model: text-embedding-3-small
    - dimensions: 512
    - batch_size: 100 chunks per API call
    - encoding_format: float (for pgvector compatibility)

    Methods:
    - async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        Use OpenAI embeddings API with batch processing
        Handle rate limits with exponential backoff (max 3 retries)
        Validate embedding dimensions (should be 512)
        Return list of embedding vectors

    - async def embed_query(self, query: str) -> List[float]:
        Generate single embedding for search query
        Cache recent queries (LRU cache, size 100) to avoid redundant API calls
        Return embedding vector

    - async def batch_embed(self, chunks: List[Document]) -> List[Tuple[Document, List[float]]]:
        Process large document batches (>100 chunks)
        Progress tracking with callback
        Handle partial failures (log and continue)
        Return chunks with embeddings attached

    Implement retry logic:
    - Exponential backoff: 1s, 2s, 4s
    - Handle 429 (rate limit) and 500+ errors
    - Log failures with chunk identifiers for debugging

    Add embedding validation:
    - Verify vector dimensions = 512
    - Check for NaN or infinite values
    - Normalize vectors for cosine similarity
  </action>
  <verify>
    <criterion>Embedding generation returns 512-dimensional vectors</criterion>
    <criterion>Batch processing handles 100+ chunks without timeout</criterion>
    <criterion>Retry logic handles rate limits (429) gracefully</criterion>
    <criterion>Query embedding cache reduces API calls by 50%+</criterion>
    <criterion>Embedding vectors compatible with pgvector storage</criterion>
  </verify>
  <done>
    Embedding generation service implemented with OpenAI text-embedding-3-small, batching, and retry logic
  </done>
</task>

<task id="06" type="auto">
  <name>Ingestion Pipeline Orchestration</name>
  <files>
    - chatbot-backend/app/services/rag/ingestion.py
    - chatbot-backend/app/api/rag/ingest.py
  </files>
  <action>
    Implement the end-to-end ingestion pipeline orchestration.

    Create ingestion.py with RAGIngestionPipeline class:

    Pipeline Stages:
    1. Document Creation: Create document record in database with 'processing' status
    2. Content Loading: Use loaders to extract raw text from source
    3. Chunking: Apply type-specific chunking strategy
    4. Embedding: Generate embeddings for all chunks
    5. Storage: Store chunks with embeddings in pgvector
    6. Completion: Update document status to 'ready' with chunk_count

    Ingestion Methods:
    - async def ingest_pdf(self, tenant_id: str, file_buffer: bytes, filename: str) -> Document:
        Create document record
        Load PDF content
        Chunk with PDF strategy
        Generate embeddings
        Store chunks
        Return document

    - async def ingest_url(self, tenant_id: str, url: str) -> Document:
        Validate URL accessibility
        Fetch and load HTML content
        Chunk with HTML strategy
        Generate embeddings
        Store chunks
        Return document

    - async def ingest_text(self, tenant_id: str, content: str, title: str) -> Document:
        Validate text content
        Chunk with text strategy
        Generate embeddings
        Store chunks
        Return document

    Error Handling:
    - Processing failures: Update document status to 'error' with error_message
    - Partial failures: Continue processing valid chunks, log failures
    - Timeout handling: Implement 60-second timeout per stage
    - Cleanup: Delete document on complete failure

    Progress Tracking:
    - Callback system for progress updates
    - Stages: loading (10%), chunking (30%), embedding (60%), storing (90%)
    - Return status endpoint for long-running ingestions

    Create FastAPI endpoint in ingest.py:
    - POST /api/rag/ingest/pdf - Upload PDF file
    - POST /api/rag/ingest/url - Ingest from URL
    - POST /api/rag/ingest/text - Paste text content
    - GET /api/rag/ingest/{document_id}/status - Check processing status

    All endpoints validate tenant_id from JWT token.
  </action>
  <verify>
    <criterion>PDF ingestion (<50 pages) completes within 60 seconds</criterion>
    <criterion>URL ingestion extracts and processes content within 30 seconds</criterion>
    <criterion>Text ingestion processes and stores within 10 seconds</criterion>
    <criterion>Document status transitions: processing → ready OR processing → error</criterion>
    <criterion>Progress callbacks report stage completion</criterion>
    <criterion>Error handling creates 'error' status with message</criterion>
  </verify>
  <done>
    End-to-end ingestion pipeline implemented with PDF, URL, and text support, error handling, and progress tracking
  </done>
</task>

</tasks>

<verification>
## Wave 2 Verification Criteria

### Chunking Verification
```python
# Test PDF chunking
engine = ChunkingEngine()
pdf_chunks = engine.chunk_pdf(langchain_doc)
assert len(pdf_chunks) > 0
assert all(1100 <= len(c.pageContent) <= 1300 for c in pdf_chunks)
assert any('[Page' in c.pageContent for c in pdf_chunks)

# Test HTML chunking
html_chunks = engine.chunk_html(langchain_doc)
assert len(html_chunks) > 0
assert all('<script>' not in c.pageContent for c in html_chunks)

# Test text chunking
text_chunks = engine.chunk_text(langchain_doc)
assert len(text_chunks) > 0
# Verify no mid-sentence splits
```

### Embedding Verification
```python
# Test embedding generation
service = EmbeddingService()
embeddings = service.embed_texts(["sample text 1", "sample text 2"])
assert len(embeddings) == 2
assert len(embeddings[0]) == 512

# Test query embedding
query_embedding = service.embed_query("test query")
assert len(query_embedding) == 512
```

### Ingestion Verification
```bash
# Test PDF ingestion
curl -X POST https://api.example.com/api/rag/ingest/pdf \
  -H "Authorization: Bearer $JWT" \
  -F "file=@test.pdf" \
  | jq '.status'

# Test URL ingestion
curl -X POST https://api.example.com/api/rag/ingest/url \
  -H "Authorization: Bearer $JWT" \
  -d '{"url": "https://example.com"}' \
  | jq '.status'

# Check status
curl https://api.example.com/api/rag/ingest/{doc_id}/status \
  -H "Authorization: Bearer $JWT"
```

## Success Criteria for Wave 2
- [ ] Semantic chunking engine with type-specific strategies
- [ ] Embedding generation with OpenAI text-embedding-3-small
- [ ] Ingestion pipeline with PDF, URL, text support
- [ ] Error handling and progress tracking
- [ ] All verification tests passing
</verification>

<success_criteria>
## Phase 2 Success Criteria (Continued)

### Performance Requirements (Wave 2)
- Chunking: < 10 seconds for typical document (< 50 pages)
- Embedding: ~50ms per chunk (100-chunk batch in ~5 seconds)
- Storage: < 5 seconds for 100 chunks
- Total ingestion: < 60 seconds end-to-end for < 50 pages

### Quality Requirements (Wave 2)
- Chunk coherence: > 95% chunks have complete sentences
- Embedding quality: 512 dimensions, no NaN values
- Metadata completeness: hierarchy_path, source_page_ref, chunk_index
- Error handling: Graceful degradation with status updates
</success_criteria>

<output>
After completing Wave 2, create `.planning/phases/02-rag-pipeline/02-02-SUMMARY.md`
</output>
---

---
phase: 02-rag-pipeline
plan: 02
type: execute
wave: 3
depends_on: []
files_modified:
  - chatbot-backend/app/api/rag/search.py
  - chatbot-backend/app/services/rag/retrieval.py
  - chatbot-backend/app/services/rag/retrievers.py
autonomous: true
provides_interface:
  - name: SimilaritySearchService
    type: service
    methods: [search, search_with_filters, get_relevant_chunks]
    description: Vector similarity search with tenant isolation and source attribution
  - name: /api/rag/search
    type: api
    methods: [POST]
    description: Search endpoint for retrieving relevant chunks with citations
assumes_from:
  - phase: 01
    interface: SupabaseClient
    usage: Execute pgvector similarity queries with RLS
  - phase: 02
    interface: DocumentService
    usage: Link retrieved chunks to source documents
---
<objective>
Implement the retrieval API with similarity search, tenant isolation verification, and source attribution.

Purpose: Enable semantic search across tenant documents with strict isolation and relevant chunk retrieval for AI responses.

Output: Similarity search API with 0.7 threshold, source citations, and complete tenant isolation.
</objective>

<execution_context>
{file:~/.config/opencode/gsd/workflows/execute-plan.md}
{file:~/.config/opencode/gsd/templates/summary.md}
</execution_context>

<context>
@.planning/phases/02-rag-pipeline/02-RESEARCH.md
@.planning/phases/02-rag-pipeline/02-PLAN.md (Wave 1-2)
</context>

<tasks>

<task id="07" type="auto">
  <name>Similarity Search Service Implementation</name>
  <files>
    - chatbot-backend/app/services/rag/retrieval.py
  </files>
  <action>
    Implement similarity search service with pgvector cosine distance and tenant isolation.

    Create retrieval.py with SimilaritySearchService class:

    Core Method:
    - async def search(
        self,
        tenant_id: str,
        query: str,
        similarity_threshold: float = 0.7,
        max_results: int = 5,
        filters: Dict[str, Any] | None = None
    ) -> SearchResult:
        # Step 1: Embed query using EmbeddingService
        query_embedding = await self.embedding_service.embed_query(query)

        # Step 2: Execute pgvector similarity search with RLS
        # Use similarity_search RPC function with tenant filter
        results = await self.supabase.rpc('similarity_search', {
            'query_embedding': query_embedding,
            'match_threshold': 1 - similarity_threshold,  # pgvector uses distance
            'match_count': max_results * 2,  # Get extra for filtering
            'tenant_filter': tenant_id
        })

        # Step 3: Filter by similarity threshold
        filtered_results = [
            r for r in results
            if (1 - r['distance']) >= similarity_threshold
        ][:max_results]

        # Step 4: Enrich with source attribution
        enriched_results = await self.enrich_with_source_info(filtered_results)

        # Step 5: Calculate average similarity score
        avg_similarity = sum(r['similarity'] for r in enriched_results) / len(enriched_results)

        return SearchResult(
            chunks=enriched_results,
            total_found=len(filtered_results),
            query=query,
            similarity_threshold=similarity_threshold,
            avg_similarity=avg_similarity
        )

    Similarity Threshold Handling:
    - Default: 0.7 (cosine similarity)
    - Range: 0.1 to 1.0
    - Higher = more precise, fewer results
    - Lower = more recall, potentially less relevant

    Metadata Enrichment:
    - Fetch document details (title, source_url) for each chunk
    - Include hierarchy_path for context
    - Add source_page_ref for PDF pages
    - Calculate similarity as 1 - distance

    Error Handling:
    - Empty results: Return empty list, not error
    - Embedding failure: Log and return empty results
    - Database errors: Propagate with tenant context
  </action>
  <verify>
    <criterion>Search returns chunks with similarity >= 0.7</criterion>
    <criterion>Cross-tenant queries return empty results (RLS enforced)</criterion>
    <criterion>Query embedding generated within 100ms</criterion>
    <criterion>pgvector search returns results within 50ms</criterion>
    <criterion>Source attribution includes document title and hierarchy</criterion>
  </verify>
  <done>
    Similarity search service implemented with pgvector cosine distance, tenant isolation, and source attribution
  </done>
</task>

<task id="08" type="auto">
  <name>Retrieval API Endpoints</name>
  <files>
    - chatbot-backend/app/api/rag/search.py
  </files>
  <action>
    Create FastAPI endpoints for RAG retrieval with validation and error handling.

    Create search.py with:

    POST /api/rag/search - Similarity Search Endpoint
    Request Body:
    {
        "query": "string",
        "similarity_threshold": 0.7,  // Optional, default 0.7
        "max_results": 5,              // Optional, default 5
        "filters": {                   // Optional
            "document_ids": ["uuid"],
            "source_types": ["pdf", "html", "text"]
        }
    }

    Response:
    {
        "chunks": [
            {
                "id": "uuid",
                "content": "text",
                "document_id": "uuid",
                "document_title": "string",
                "source_url": "string",
                "source_page_ref": "string",
                "hierarchy_path": ["path", "to", "section"],
                "similarity": 0.85,
                "metadata": {}
            }
        ],
        "total_found": 10,
        "query": "original query",
        "similarity_threshold": 0.7,
        "avg_similarity": 0.82,
        "search_time_ms": 45
    }

    Validation:
    - query: Required, 10-10000 characters
    - similarity_threshold: Optional, 0.1-1.0, default 0.7
    - max_results: Optional, 1-20, default 5
    - filters: Optional, validate document_ids are UUIDs

    Tenant Extraction:
    - Extract tenant_id from JWT token (auth.jwt() → app_metadata → tenant_id)
    - Pass tenant_id to search service
    - RLS policies enforce tenant isolation at database level

    Performance Requirements:
    - Total search time: < 100ms
    - Embedding generation: < 50ms
    - pgvector query: < 50ms
    - Response serialization: < 10ms

    Error Handling:
    - 400: Invalid request parameters
    - 401: Missing or invalid JWT
    - 500: Internal error (log with tenant context)

    Rate Limiting:
    - Implement tiered rate limits: 100 req/min basic, 1000 req/min enterprise
    - Track per-tenant usage
    - Return 429 with retry-after header
  </action>
  <verify>
    <criterion>POST /api/rag/search returns 200 with valid JSON response</criterion>
    <criterion>Search response includes chunks with similarity >= threshold</criterion>
    <criterion>Source attribution includes document title, URL, hierarchy</criterion>
    <criterion>Response time < 100ms for typical queries</criterion>
    <criterion>Rate limiting returns 429 after exceeding limit</criterion>
    <criterion>Invalid requests return 400 with error message</criterion>
  </verify>
  <done>
    Retrieval API endpoints implemented with validation, rate limiting, and comprehensive response format
  </done>
</task>

<task id="09" type="auto">
  <name>Source Attribution and Citation Generation</name>
  <files>
    - chatbot-backend/app/services/rag/citations.py
  </files>
  <action>
    Implement source attribution and citation generation utilities for retrieved chunks.

    Create citations.py with:

    CitationGenerator class:

    Method: def generate_citation(self, chunk: DocumentChunk) -> str:
        """Generate human-readable citation from chunk metadata."""
        parts = []

        # Document title
        if chunk.document_title:
            parts.append(f"**{chunk.document_title}**")

        # Source type and location
        if chunk.source_type == 'pdf':
            if chunk.source_page_ref:
                parts.append(f"(PDF, Page {chunk.source_page_ref})")
        elif chunk.source_type == 'html':
            if chunk.source_url:
                parts.append(f"([Source]({chunk.source_url}))")
        elif chunk.source_type == 'text':
            parts.append("(Document)")

        # Hierarchy context
        if chunk.hierarchy_path:
            path_str = " → ".join(chunk.hierarchy_path)
            parts.append(f"_{path_str}_")

        return " ".join(parts)

    Method: def format_chunk_for_context(
        self,
        chunk: DocumentChunk,
        max_length: int = 500
    ) -> str:
        """Format chunk content for inclusion in LLM context."""
        content = chunk.content[:max_length]
        if len(chunk.content) > max_length:
            content += "..."
        return content

    Method: def build_context_with_citations(
        self,
        chunks: List[DocumentChunk],
        max_chunks: int = 5,
        max_chars_per_chunk: int = 500
    ) -> Tuple[str, List[Citation]]:
        """Build context string with numbered citations for LLM."""
        context_parts = []
        citations = []

        for i, chunk in enumerate(chunks[:max_chunks], 1):
            content = self.format_chunk_for_context(chunk, max_chars_per_chunk)
            citation = self.generate_citation(chunk)
            context_parts.append(f"[{i}] {content}\nSource: {citation}")
            citations.append(citation)

        return "\n\n".join(context_parts), citations

    Method: def format_llm_response(
        self,
        answer: str,
        citations: List[Citation],
        citation_style: str = "numbered"
    ) -> str:
        """Format LLM answer with citations."""
        if citation_style == "numbered":
            return f"{answer}\n\nSources:\n" + "\n".join(
                f"[{i+1}] {c}" for i, c in enumerate(citations)
            )
        elif citation_style == "inline":
            return f"{answer} (Sources: {', '.join(citations)})"
        else:
            return answer

    Integration with Search:
    - Modify search results to include formatted citations
    - Return structured citation data alongside chunks
    - Support different citation styles via request parameter
  </action>
  <verify>
    <criterion>PDF citations include page number: "**[Title]** (PDF, Page 3)"</criterion>
    <criterion>HTML citations include URL: "**[Title]** ([Source](url))"</criterion>
    <criterion>Context building limits chunks to 5 and chars to 500</criterion>
    <criterion>LLM response formatting includes citations in answer</criterion>
    <criterion>Citation accuracy verified against chunk metadata</criterion>
  </verify>
  <done>
    Source attribution and citation generation implemented with PDF page refs, URL links, and hierarchy context
  </done>
</task>

</tasks>

<verification>
## Wave 3 Verification Criteria

### Similarity Search Verification
```python
# Test similarity search
service = SimilaritySearchService()
results = await service.search(
    tenant_id="test-tenant",
    query="How do I reset my password?",
    similarity_threshold=0.7,
    max_results=5
)

assert results.total_found >= 0
assert len(results.chunks) <= 5
for chunk in results.chunks:
    assert chunk.similarity >= 0.7
    assert chunk.document_title is not None

# Test cross-tenant isolation
other_results = await service.search(
    tenant_id="other-tenant",
    query="same query"
)
assert len(other_results.chunks) == 0  # RLS enforced
```

### API Endpoint Verification
```bash
# Test search endpoint
curl -X POST https://api.example.com/api/rag/search \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"query": "product features", "max_results": 3}' \
  | jq '.chunks[0].similarity'

# Verify response time
time curl -X POST https://api.example.com/api/rag/search \
  -H "Authorization: Bearer $JWT" \
  -d '{"query": "test"}'

# Test rate limiting
for i in {1..101}; do
  curl -X POST https://api.example.com/api/rag/search \
    -H "Authorization: Bearer $JWT" \
    -d '{"query": "test"}'
done
# Should get 429 on 101st request
```

### Citation Verification
```python
# Test citation generation
citation_gen = CitationGenerator()
citation = citation_gen.generate_citation(chunk)
assert "PDF" in citation or "Source" in citation
assert chunk.document_title in citation

# Test context building
context, citations = citation_gen.build_context_with_citations(chunks)
assert len(context) > 0
assert len(citations) == len(chunks[:5])
```

## Success Criteria for Wave 3
- [ ] Similarity search with 0.7 threshold returning relevant chunks
- [ ] Complete tenant isolation via RLS and API validation
- [ ] Source attribution with document title, URL, page refs
- [ ] Response time < 100ms for typical queries
- [ ] Rate limiting implemented (100 req/min)
- [ ] Citation generation with multiple formats
- [ ] All verification tests passing
</verification>

<success_criteria>
## Phase 2 Success Criteria (Final)

### Functional Completeness
1. **Document Ingestion**: ✅ Complete
   - PDF, URL, text support with type detection
   - Ingestion pipeline with progress tracking
   - Error handling with status updates

2. **Semantic Chunking**: ✅ Complete
   - Type-specific strategies (PDF/HTML/text)
   - Structure awareness (pages, headings, hierarchy)
   - Semantic overlap for context preservation

3. **Embedding Generation**: ✅ Complete
   - OpenAI text-embedding-3-small integration
   - Batch processing and caching
   - Retry logic and error handling

4. **Retrieval with Citations**: ✅ Complete
   - Similarity search with 0.7 threshold
   - Source attribution with metadata
   - Citation generation in multiple formats

5. **Tenant Isolation**: ✅ Complete
   - RLS policies on all queries
   - Tenant_id filtering at database level
   - API-level validation

### Integration Readiness
- [ ] All Phase 2 interfaces ready for Phase 3 (Chat Integration)
- [ ] API endpoints documented and tested
- [ ] Error handling comprehensive
- [ ] Performance meets success criteria
- [ ] Ready for production deployment

### Next Phase Handoff
Phase 3 (Admin Panel) will use:
- DocumentService for CRUD operations
- RAGIngestionPipeline for document management
- SimilaritySearchService for chatbot integration
</success_criteria>

<output>
After completing Wave 3, create `.planning/phases/02-rag-pipeline/02-03-SUMMARY.md`

Final Phase 2 completion requires:
- [ ] All 3 waves executed and verified
- [ ] Integration tests with Phase 1 backend
- [ ] Load testing (100 concurrent searches)
- [ ] Tenant isolation verification (cross-tenant tests)
</output>
</output>

<output>
After completion, create `.planning/phases/02-rag-pipeline/02-PLAN.md` (Wave 3)
</output>

---
phase: 02-rag-pipeline
plan: 02
type: execute
wave: 4
depends_on: []
files_modified:
  - chatbot-backend/app/tests/integration/
  - chatbot-backend/app/tests/unit/
autonomous: false
provides_interface: []
assumes_from:
  - phase: 02
    interface: SimilaritySearchService
    usage: Integration with chat service for context retrieval
---
<objective>
Implement comprehensive testing and tenant isolation verification for the RAG pipeline.

Purpose: Validate all components work together correctly and tenant isolation is truly enforced.

Output: Integration tests, unit tests, and tenant isolation verification suite.
</objective>

<execution_context>
{file:~/.config/opencode/gsd/workflows/execute-plan.md}
</execution_context>

<context>
@.planning/phases/02-rag-pipeline/02-PLAN.md (Wave 1-3)
@.planning/research/STACK.md
</context>

<tasks>

<task id="10" type="auto">
  <name>Unit Tests for Core Components</name>
  <files>
    - chatbot-backend/app/tests/unit/test_chunking.py
    - chatbot-backend/app/tests/unit/test_embeddings.py
    - chatbot-backend/app/tests/unit/test_retrieval.py
  </files>
  <action>
    Implement unit tests for core RAG components with mocking.

    Create test_chunking.py:
    - test_pdf_chunking_respects_boundaries
    - test_html_chunking_removes_scripts
    - test_text_chunking_preserves_paragraphs
    - test_overlap_prevents_context_loss
    - test_metadata_enrichment_complete
    - test_table_handling_pdf
    - test_hierarchy_path_extraction

    Create test_embeddings.py:
    - test_embedding_dimensions_512
    - test_batch_embedding_all_success
    - test_batch_embedding_partial_failure
    - test_query_embedding_caching
    - test_retry_on_rate_limit
    - test_embedding_normalization

    Create test_retrieval.py:
    - test_similarity_threshold_filtering
    - test_max_results_limit
    - test_empty_query_returns_empty
    - test_metadata_enrichment_complete
    - test_error_propagation

    Use pytest with mocking for external dependencies (OpenAI API, Supabase).
    Mock embedding generation to avoid API calls.
    Mock database queries for unit testing.
  </action>
  <verify>
    <criterion>All unit tests pass (>90% coverage on core modules)</criterion>
    <criterion>Mock tests run without external API calls</criterion>
    <criterion>Test isolation: each test is independent</criterion>
  </verify>
  <done>
    Unit tests implemented for chunking, embeddings, and retrieval with >90% coverage
  </done>
</task>

<task id="11" type="auto">
  <name>Integration Tests for API Endpoints</name>
  <files>
    - chatbot-backend/app/tests/integration/test_ingest_api.py
    - chatbot-backend/app/tests/integration/test_search_api.py
    - chatbot-backend/app/tests/integration/test_rls_enforcement.py
  </files>
  <action>
    Implement integration tests with real Supabase connection.

    Create test_ingest_api.py:
    - test_pdf_upload_creates_document
    - test_url_ingestion_extracts_content
    - test_text_ingestion_processes_content
    - test_document_status_transitions
    - test_error_handling_creates_error_status
    - test_ingestion_time_within_60s

    Create test_search_api.py:
    - test_search_returns_relevant_chunks
    - test_search_respects_threshold
    - test_search_time_within_100ms
    - test_citation_formatting_complete
    - test_rate_limiting_enforced

    Create test_rls_enforcement.py:
    - test_cross_tenant_query_returns_empty
    - test_tenant_can_only_see_own_documents
    - test_tenant_can_only_see_own_chunks
    - test_service_role_bypass_prevented

    Use real Supabase test database (separate from production).
    Implement proper setup/teardown for test isolation.
    Use test fixtures for common data setup.
  </action>
  <verify>
    <criterion>All integration tests pass against test database</criterion>
    <criterion>RLS enforcement tests verify complete isolation</criterion>
    <criterion>API response times within SLA</criterion>
  </verify>
  <done>
    Integration tests implemented for ingestion, search, and RLS enforcement with real database
  </done>
</task>

<task id="12" type="checkpoint:human-verify">
  <name>Tenant Isolation Verification</name>
  <files>
    - chatbot-backend/app/tests/rls_verification_report.md
  </files>
  <action>
    Manually verify tenant isolation with comprehensive testing.

    Create comprehensive test scenarios:

    Scenario 1: Cross-Tenant Document Access
    1. Create Document A for Tenant 1
    2. Search as Tenant 1 → Should find Document A
    3. Search as Tenant 2 → Should NOT find Document A

    Scenario 2: Cross-Tenant Chunk Access
    1. Create chunks for Tenant 1
    2. Query as Tenant 2 using same embedding
    3. Should return empty results

    Scenario 3: Direct Database Access
    1. Try SELECT * FROM documents WHERE tenant_id != 'my-tenant'
    2. Should return empty (RLS enforced)
    3. Try INSERT with wrong tenant_id
    4. Should fail (RLS WITH CHECK)

    Scenario 4: API-Level Validation
    1. Attempt to access Document ID of Tenant 1 while authenticated as Tenant 2
    2. GET /api/rag/documents/{doc_id} should return 404 (not 403)
    3. This confirms RLS working (document doesn't exist for Tenant 2)

    Generate verification report with:
    - Test scenarios executed
    - Expected vs actual results
    - Evidence (database queries, API responses)
    - Conclusion: Tenant isolation VERIFIED or ISSUES FOUND

    Present results to user for approval.
  </action>
  <verify>
    <criterion>All cross-tenant tests return empty/no access</criterion>
    <criterion>Direct database queries respect RLS policies</criterion>
    <criterion>API-level validation matches database isolation</criterion>
    <criterion>Verification report generated and reviewed</criterion>
  </verify>
  <done>
    Tenant isolation verified through comprehensive cross-tenant testing with documented evidence
  </done>
  <how-to-verify>
    Run rls_verification_test.py which executes all cross-tenant scenarios against test database.

    Steps:
    1. Execute: pytest chatbot-backend/app/tests/integration/test_rls_enforcement.py -v
    2. Review console output for PASS/FAIL on each scenario
    3. Check generated rls_verification_report.md
    4. Verify all scenarios show complete isolation

    Expected: All 10 RLS tests pass, cross-tenant queries return empty results
  </how-to-verify>
  <resume-signal>
    Type "approved" or describe isolation issues that need fixing.
  </resume-signal>
</task>

</tasks>

<verification>
## Wave 4 Verification Criteria

### Unit Test Coverage
```bash
# Run unit tests
pytest chatbot-backend/app/tests/unit/ -v --cov=chatbot-backend/app/services/rag/ \
  --cov-report=term-missing

# Verify coverage
Name                     Stmts   Miss  Cover   Missing
chunking.py                 150      2    99%   [21:unused]
embeddings.py               120      5    96%   [45:error_case]
retrieval.py                140      3    98%   [78:edge_case]
```

### Integration Test Results
```bash
# Run integration tests
pytest chatbot-backend/app/tests/integration/ -v

# Expected output
test_ingest_api.py::test_pdf_upload_creates_document PASSED
test_ingest_api.py::test_url_ingestion_extracts_content PASSED
test_search_api.py::test_search_returns_relevant_chunks PASSED
test_rls_enforcement.py::test_cross_tenant_query_returns_empty PASSED
```

### RLS Verification Report
```markdown
## Tenant Isolation Verification Report

### Test Results
| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| Cross-tenant document access | Empty | Empty | ✅ PASS |
| Cross-tenant chunk access | Empty | Empty | ✅ PASS |
| Direct DB SELECT | Empty | Empty | ✅ PASS |
| Direct DB INSERT | Fail | Fail | ✅ PASS |
| API document access | 404 | 404 | ✅ PASS |

### Conclusion
**Tenant isolation: VERIFIED**

All RLS policies working correctly across API and database layers.
No cross-tenant data access detected.
```

## Phase 2 Final Success Criteria

### Completeness
- [ ] All 4 waves completed and verified
- [ ] Unit tests: >90% coverage, all tests passing
- [ ] Integration tests: All scenarios passing
- [ ] Tenant isolation: VERIFIED by human review

### Performance
- [ ] Document ingestion: < 60s for < 50 pages
- [ ] Similarity search: < 100ms response time
- [ ] Embedding generation: ~50ms per chunk
- [ ] Rate limiting: Working correctly

### Quality
- [ ] Retrieval relevance: Similarity > 0.7
- [ ] Source attribution: Complete citations
- [ ] Error handling: Graceful degradation
- [ ] Documentation: API docs updated

### Handoff Ready
- [ ] All Phase 3 interfaces documented
- [ ] Integration points clearly defined
- [ ] Test suite ready for CI/CD
- [ ] Performance benchmarks established
</verification>

<success_criteria>
## Phase 2 Complete Success Criteria

### Functional Requirements ✅
1. **RAG-01 Document Ingestion**: COMPLETE
   - PDF upload with processing within 60s
   - URL ingestion with content extraction
   - Text paste with validation
   - Progress tracking and status updates

2. **RAG-02 Semantic Chunking**: COMPLETE
   - PDF: 1200 chars, 200 overlap, structure-aware
   - HTML: 800 chars, 150 overlap, DOM-aware
   - Text: 512 tokens, 200 tokens, semantic boundaries
   - Metadata enrichment complete

3. **RAG-03 Retrieval with Citations**: COMPLETE
   - Similarity search with 0.7 threshold
   - Source attribution: title, URL, page refs
   - Citation generation in multiple formats
   - Performance < 100ms

4. **TENANT-01 PostgreSQL RLS**: COMPLETE
   - RLS policies on documents and chunks
   - Cross-tenant queries blocked at DB level
   - Verified by comprehensive testing

5. **TENANT-02 Vector Namespace**: COMPLETE
   - HNSW indexes for similarity search
   - 512-dimensional embeddings stored
   - Cosine distance similarity

### Production Ready ✅
- [ ] Comprehensive test suite (>90% coverage)
- [ ] Integration tests with real database
- [ ] Tenant isolation verified
- [ ] Performance meets SLA
- [ ] Error handling robust
- [ ] Documentation complete

### Next Steps
Phase 2 is COMPLETE. Ready for:
1. Phase 3: Admin Panel Integration
2. Phase 4: Production Deployment
</success_criteria>

<output>
After completion, create `.planning/phases/02-rag-pipeline/02-04-SUMMARY.md`

Final Phase 2 completion summary:
- Create `.planning/phases/02-rag-pipeline/02-FINAL-SUMMARY.md`
- Update `.planning/ROADMAP.md` Phase 2 status to COMPLETE
- Document lessons learned and recommendations for Phase 3
</output>

---
phase: 02-rag-pipeline
plan: 02
type: tdd
wave: 1
depends_on: []
files_modified:
  - chatbot-backend/app/services/rag/retrieval.py
  - chatbot-backend/app/tests/unit/test_retrieval.py
autonomous: true
provides_interface: []
assumes_from:
  - phase: 02
    interface: EmbeddingService
    usage: Generate query embeddings for similarity search
---
<objective>
Implement similarity search using TDD methodology with comprehensive test coverage.

Purpose: Ensure high-quality retrieval implementation with red-green-refactor discipline.

Output: Fully tested SimilaritySearchService with >95% test coverage.
</objective>

<execution_context>
{file:~/.config/opencode/gsd/templates/tdd.md}
</execution_context>

<context>
@.planning/phases/02-rag-pipeline/02-RESEARCH.md
</context>

<feature>
  <name>Similarity Search with pgvector</name>
  <files>
    - chatbot-backend/app/services/rag/retrieval.py
    - chatbot-backend/app/tests/unit/test_retrieval.py
  </files>
  <behavior>
    Given a tenant ID and search query, return relevant document chunks with similarity scores.
    - Returns chunks with cosine similarity >= threshold (default 0.7)
    - Limits results to max_count (default 5)
    - Enriches results with source attribution metadata
    - Filters by tenant_id for isolation
    - Returns empty list for no matches
  </behavior>
  <implementation>
    1. Generate query embedding via EmbeddingService
    2. Call pgvector similarity_search RPC with tenant filter
    3. Filter results by similarity threshold
    4. Enrich with document metadata
    5. Calculate average similarity
  </implementation>
</feature>

<tasks>

<task id="TD01" type="auto">
  <name>RED: Write failing test for similarity search</name>
  <files>
    - chatbot-backend/app/tests/unit/test_retrieval.py
  </files>
  <action>
    Write failing test that describes expected similarity search behavior.

    Add to test_retrieval.py:

    ```python
    @pytest.mark.asyncio
    async def test_similarity_search_returns_relevant_chunks(self):
        """Test that similarity search returns chunks with similarity >= threshold."""
        # Setup
        mock_embedding = [0.1] * 512  # Fake embedding
        mock_chunks = [
            {
                'id': 'chunk-1',
                'content': 'Password reset requires email verification',
                'document_id': 'doc-1',
                'distance': 0.15,  # cosine distance
                'hierarchy_path': ['Support', 'Account'],
                'metadata': {'source_page_ref': '1'}
            }
        ]

        mock_embedding_service.embed_query.return_value = mock_embedding
        mock_supabase.rpc.return_value.data = mock_chunks

        # Execute
        result = await self.search_service.search(
            tenant_id='tenant-1',
            query='How do I reset my password?',
            similarity_threshold=0.7,
            max_results=5
        )

        # Verify
        assert len(result.chunks) == 1
        assert result.chunks[0].similarity >= 0.7  # 1 - 0.15 = 0.85
        assert result.chunks[0].content == 'Password reset requires email verification'
    ```

    Add test for empty results:
    ```python
    @pytest.mark.asyncio
    async def test_similarity_search_returns_empty_for_no_matches(self):
        """Test that empty list is returned when no chunks match threshold."""
        mock_embedding = [0.1] * 512
        mock_supabase.rpc.return_value.data = []

        result = await self.search_service.search(
            tenant_id='tenant-1',
            query='unrelated query',
            similarity_threshold=0.9
        )

        assert result.chunks == []
        assert result.total_found == 0
    ```

    Run test - should FAIL with NotImplementedError.
  </action>
  <verify>
    <criterion>pytest test_retrieval.py -v shows FAILED for similarity search tests</criterion>
    <criterion>Error message indicates SimilaritySearchService.search not implemented</criterion>
  </verify>
  <done>
    Failing tests written describing expected similarity search behavior
  </done>
</task>

<task id="TD02" type="auto">
  <name>GREEN: Implement minimal similarity search to pass tests</name>
  <files>
    - chatbot-backend/app/services/rag/retrieval.py
  </files>
  <action>
    Implement minimal SimilaritySearchService to pass failing tests.

    Create retrieval.py:

    ```python
    from typing import List, Dict, Any
    from dataclasses import dataclass

    @dataclass
    class RetrievedChunk:
        id: str
        content: str
        document_id: str
        similarity: float
        hierarchy_path: List[str]
        source_page_ref: str | None
        metadata: Dict[str, Any]

    @dataclass
    class SearchResult:
        chunks: List[RetrievedChunk]
        total_found: int
        query: str
        similarity_threshold: float
        avg_similarity: float

    class SimilaritySearchService:
        def __init__(self, embedding_service, supabase_client):
            self.embedding_service = embedding_service
            self.supabase = supabase_client

        async def search(
            self,
            tenant_id: str,
            query: str,
            similarity_threshold: float = 0.7,
            max_results: int = 5
        ) -> SearchResult:
            # Step 1: Generate query embedding
            query_embedding = await self.embedding_service.embed_query(query)

            # Step 2: Call pgvector similarity_search RPC
            rpc_result = self.supabase.rpc('similarity_search', {
                'query_embedding': query_embedding,
                'match_threshold': 1 - similarity_threshold,
                'match_count': max_results * 2,
                'tenant_filter': tenant_id
            })

            # Step 3: Filter and map results
            chunks = []
            total_similarity = 0.0

            for row in rpc_result.data:
                similarity = 1 - row['distance']
                if similarity >= similarity_threshold:
                    chunk = RetrievedChunk(
                        id=row['id'],
                        content=row['content'],
                        document_id=row['document_id'],
                        similarity=similarity,
                        hierarchy_path=row.get('hierarchy_path', []),
                        source_page_ref=row.get('metadata', {}).get('source_page_ref'),
                        metadata=row.get('metadata', {})
                    )
                    chunks.append(chunk)
                    total_similarity += similarity

            # Step 4: Calculate average similarity
            avg_similarity = total_similarity / len(chunks) if chunks else 0.0

            return SearchResult(
                chunks=chunks[:max_results],
                total_found=len(chunks),
                query=query,
                similarity_threshold=similarity_threshold,
                avg_similarity=avg_similarity
            )
    ```

    Run tests - should PASS.
  </action>
  <verify>
    <criterion>pytest test_retrieval.py -v shows PASSED for similarity search tests</criterion>
    <criterion>All test assertions pass</criterion>
  </verify>
  <done>
    Similarity search implementation passes all tests
  </done>
</task>

<task id="TD03" type="auto">
  <name>REFACTOR: Optimize and add edge case handling</name>
  <files>
    - chatbot-backend/app/services/rag/retrieval.py
    - chatbot-backend/app/tests/unit/test_retrieval.py
  </files>
  <action>
    Refactor implementation for robustness and add edge case tests.

    Improvements to add:

    1. **Empty Results Handling**:
       ```python
       if not rpc_result.data:
           return SearchResult(
               chunks=[],
               total_found=0,
               query=query,
               similarity_threshold=similarity_threshold,
               avg_similarity=0.0
           )
       ```

    2. **Error Handling**:
       ```python
       try:
           rpc_result = self.supabase.rpc(...)
       except Exception as e:
           # Log error and return empty results
           return SearchResult(
               chunks=[],
               total_found=0,
               query=query,
               similarity_threshold=similarity_threshold,
               avg_similarity=0.0
           )
       ```

    3. **Additional Edge Case Tests**:
       ```python
       @pytest.mark.asyncio
       async def test_similarity_search_handles_db_error_gracefully(self):
           """Test that DB errors return empty results, not exceptions."""
           mock_supabase.rpc.side_effect = Exception("Database error")

           result = await self.search_service.search(
               tenant_id='tenant-1',
               query='test query'
           )

           assert result.chunks == []

       @pytest.mark.asyncio
       async def test_similarity_search_filters_by_tenant(self):
           """Test that tenant filter is passed to RPC."""
           await self.search_service.search(
               tenant_id='test-tenant',
               query='test query'
           )

           # Verify tenant_filter was passed
           call_kwargs = mock_supabase.rpc.call_args[1]
           assert call_kwargs['tenant_filter'] == 'test-tenant'
       ```

    4. **Performance Optimization**:
       - Add LRU cache for recent queries (avoid re-embedding)
       - Batch metadata enrichment where possible

    Run all tests - should PASS with improvements.
  </action>
  <verify>
    <criterion>All existing tests still pass</criterion>
    <criterion>New edge case tests pass</criterion>
    <criterion>Error handling verified</criterion>
    <criterion>Coverage maintained >95%</criterion>
  </verify>
  <done>
    Similarity search refactored with error handling, edge cases, and optimizations
  </done>
</task>

</tasks>

<verification>
## TDD Cycle Verification

### RED Phase
```bash
$ pytest chatbot-backend/app/tests/unit/test_retrieval.py::test_similarity_search_returns_relevant_chunks -v
FAILED - NotImplementedError: SimilaritySearchService.search not implemented
```

### GREEN Phase
```bash
$ pytest chatbot-backend/app/tests/unit/test_retrieval.py -v
PASSED - All 2 similarity search tests pass
```

### REFACTOR Phase
```bash
$ pytest chatbot-backend/app/tests/unit/test_retrieval.py -v
PASSED - All 5 tests pass (2 original + 3 edge cases)

$ pytest --cov=chatbot-backend/app/services/rag/retrieval.py --cov-report=term-missing
Name                    Stmts   Miss  Cover   Missing
retrieval.py              85      2    98%   [78-79:error_case]
```

## TDD Success Criteria
- [ ] Tests written before implementation (RED)
- [ ] Minimal implementation passes tests (GREEN)
- [ ] Refactoring maintains test pass rate (REFACTOR)
- [ ] Coverage >95%
- [ ] Edge cases handled
- [ ] Error handling robust
</verification>

<success_criteria>
## TDD Feature Complete

### SimilaritySearchService
- [x] Returns chunks with similarity >= threshold
- [x] Returns empty for no matches
- [x] Handles database errors gracefully
- [x] Filters by tenant_id
- [x] Calculates average similarity
- [x] Performance optimized (query caching)

### Test Coverage
- [x] Core functionality tested
- [x] Edge cases covered
- [x] Error handling verified
- [x] Integration with EmbeddingService mocked
- [x] Integration with Supabase mocked

### Ready for Integration
- [x] Service interface matches requirements
- [x] Tests provide confidence for integration
- [x] Error handling ready for production
- [x] Documentation via tests (self-documenting code)
</success_criteria>

<output>
After TDD cycle complete, update `.planning/phases/02-rag-pipeline/02-TDD-SUMMARY.md`
</output>
