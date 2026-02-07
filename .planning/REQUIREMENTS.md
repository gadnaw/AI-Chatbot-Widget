# REQUIREMENTS.md

**Project:** A4-ai-chatbot-widget — AI Chatbot Widget with RAG Pipeline  
**Version:** 1.0  
**Last Updated:** February 7, 2026

---

## Requirement Categories

This document defines all v1 requirements organized by category. Each requirement maps to exactly one phase in the project roadmap.

---

## EMBED: Embeddable Widget Requirements

Requirements for the embeddable chat widget delivered to customer websites.

### EMBED-01: Single Script Tag Deployment

**Description:** The widget must deploy via a single script tag with API key configuration. Customers copy the embed code from the admin panel, paste it into their website HTML, and the widget loads and initializes automatically without additional code changes or technical expertise.

**Priority:** Critical (MVP)  
**Phase:** 1 - Widget Foundation + Backend Core  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Embed code is a single `<script>` tag
- [ ] API key is embedded in the script configuration
- [ ] Widget appears on page without manual initialization
- [ ] Widget works on any HTML page (no framework dependencies)

**Dependencies:** None

**Verification Test:** 
1. Customer copies embed code from admin panel
2. Customer pastes into static HTML page
3. Page loads in browser
4. Widget chat bubble appears within 1 second of page load

---

### EMBED-02: Iframe Rendering with Shadow DOM Isolation

**Description:** The widget must render inside an iframe with Shadow DOM encapsulation to ensure complete CSS and JavaScript isolation from the host website. Host site styles must not affect widget styles, and widget styles must not leak to the host site.

**Priority:** Critical (MVP)  
**Phase:** 1 - Widget Foundation + Backend Core  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Chat window renders inside iframe
- [ ] Shadow DOM encapsulates all widget styles
- [ ] Unique namespace prefixes used for all CSS classes (a4w-*)
- [ ] Widget functions correctly on pages with Bootstrap CSS
- [ ] Widget functions correctly on pages with Tailwind CSS
- [ ] Widget functions correctly on pages with aggressive CSS resets
- [ ] Host site styles do not affect widget appearance
- [ ] Widget styles do not affect host site appearance

**Dependencies:** EMBED-01

**Verification Test:**
1. Deploy widget to test page with Bootstrap CSS
2. Verify widget appears and functions correctly
3. Deploy widget to test page with Tailwind CSS
4. Verify widget appears and functions correctly
5. Inspect widget Shadow DOM in browser dev tools
6. Confirm no host CSS selectors match widget elements

---

## CORE: Backend Core Requirements

Requirements for the FastAPI backend server and API infrastructure.

### CORE-01: FastAPI Server with OpenAPI Documentation

**Description:** The backend must run on FastAPI with automatic OpenAPI documentation available at `/docs`. All API endpoints must be documented with request/response schemas, examples, and response codes.

**Priority:** Critical (MVP)  
**Phase:** 1 - Widget Foundation + Backend Core  
**Status:** Pending

**Acceptance Criteria:**
- [ ] FastAPI server starts successfully
- [ ] OpenAPI documentation available at `/docs`
- [ ] ReDoc documentation available at `/redoc`
- [ ] All endpoints documented with request schemas
- [ ] All endpoints documented with response schemas
- [ ] All endpoints include example values
- [ ] CORS configured for widget origins

**Dependencies:** None

**Verification Test:**
1. Start FastAPI server
2. Navigate to `/docs` in browser
3. Verify all endpoints are listed
4. Verify documentation is complete for chat endpoint

---

### CORE-02: Streaming Chat Endpoint

**Description:** The backend must provide a chat endpoint that accepts user messages, generates AI responses using OpenAI, and streams responses back to the client using Server-Sent Events (SSE). Streaming must begin within 1 second of receiving the message.

**Priority:** Critical (MVP)  
**Phase:** 1 - Widget Foundation + Backend Core  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Chat endpoint accepts POST requests with message content
- [ ] Endpoint returns streaming response via SSE format
- [ ] First token streams within 1 second of request
- [ ] Full response streams token-by-token
- [ ] Response includes usage statistics (tokens used)
- [ ] Appropriate error handling for API failures
- [ ] Timeout handling for long-running requests

**Dependencies:** CORE-01

**Verification Test:**
1. Send test message to chat endpoint
2. Verify SSE stream begins within 1 second
3. Verify tokens stream progressively (not all at once)
4. Verify final response includes usage statistics
5. Test timeout handling with deliberately slow request

---

## RAG: RAG Pipeline Requirements

Requirements for document ingestion, embedding generation, and retrieval-augmented generation.

### RAG-01: Document Ingestion (PDF, URL, Text)

**Description:** The system must support ingesting training content from three sources: PDF files uploaded by admins, URLs scraped for content, and plain text pasted directly. Each source must extract text content and prepare it for chunking.

**Priority:** Critical (MVP)  
**Phase:** 2 - RAG Pipeline + Multi-Tenancy  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Admin can upload PDF files (up to 10MB)
- [ ] PDF text extraction preserves paragraph structure
- [ ] Admin can specify URLs for content scraping
- [ ] URL scraping handles basic HTML pages
- [ ] Admin can paste plain text directly
- [ ] All sources validate extraction success
- [ ] Extraction failures provide helpful error messages
- [ ] Processing completes within 60 seconds for typical documents

**Dependencies:** CORE-01

**Verification Test:**
1. Upload 5-page PDF document
2. Verify extracted text appears in admin preview
3. Specify URL for product documentation page
4. Verify scraped content matches source page
5. Paste support FAQ text
6. Verify pasted text appears correctly

---

### RAG-02: Semantic Chunking and Embeddings

**Description:** Ingested content must be split into semantically coherent chunks and converted to vector embeddings using OpenAI text-embedding-3-small. Chunking must respect paragraph and section boundaries, with overlap to prevent boundary issues.

**Priority:** Critical (MVP)  
**Phase:** 2 - RAG Pipeline + Multi-Tenancy  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Chunking respects paragraph boundaries
- [ ] Chunk size is approximately 800-1200 characters
- [ ] Overlap of 200 characters between chunks
- [ ] Embeddings generated using text-embedding-3-small
- [ ] Embeddings stored with source document reference
- [ ] Chunking preserves semantic coherence
- [ ] Processing is batched for efficiency
- [ ] Admin can preview chunked content before indexing

**Dependencies:** RAG-01

**Verification Test:**
1. Ingest document with clear paragraph structure
2. Preview chunked output
3. Verify chunks align with paragraph boundaries
4. Check overlap regions for continuity
5. Verify embeddings are generated and stored

---

### RAG-03: Retrieval with Source Attribution

**Description:** When users ask questions, the system must retrieve relevant chunks from the vector database using similarity search, construct a prompt with retrieved context, and generate responses that cite sources. Retrieved chunks must have similarity score above 0.7 threshold.

**Priority:** Critical (MVP)  
**Phase:** 2 - RAG Pipeline + Multi-Tenancy  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Similarity search returns top 5 relevant chunks
- [ ] Only chunks with similarity > 0.7 are used for response
- [ ] Response includes citations referencing source documents
- [ ] System prompt explicitly grounds responses in retrieved context
- [ ] Fallback response when no chunks meet threshold
- [ ] Response time for retrieval is under 500ms
- [ ] Source citations link to original documents

**Dependencies:** RAG-02, TENANT-01, TENANT-02

**Verification Test:**
1. Ask question directly from ingested document
2. Verify response includes relevant information
3. Check similarity scores of retrieved chunks
4. Verify citations are included in response
5. Ask question unrelated to ingested content
6. Verify fallback response ("I don't know")

---

## TENANT: Multi-Tenant Isolation Requirements

Requirements for ensuring complete data isolation between customers.

### TENANT-01: PostgreSQL Row-Level Security Policies

**Description:** All database tables containing tenant data must implement PostgreSQL Row-Level Security (RLS) policies that automatically filter queries by tenant_id. RLS must be enabled on conversations, documents, and messages tables.

**Priority:** Critical (MVP)  
**Phase:** 2 - RAG Pipeline + Multi-Tenancy  
**Status:** Pending

**Acceptance Criteria:**
- [ ] RLS enabled on conversations table
- [ ] RLS enabled on documents table
- [ ] RLS enabled on chat_messages table
- [ ] Policies reference JWT claims for tenant_id
- [ ] Direct database queries are filtered by tenant
- [ ] Prepared statements include tenant_id parameter
- [ ] Automated tests verify cross-tenant access fails

**Dependencies:** CORE-01

**Verification Test:**
1. Create two tenant accounts
2. Tenant A creates conversation and messages
3. Tenant B attempts to query Tenant A's data
4. Verify Tenant B receives empty results or error
5. Direct database query with wrong tenant_id returns nothing

---

### TENANT-02: Vector Database Namespace Enforcement

**Description:** Vector embeddings must be stored with tenant namespace isolation. Pinecone implementations must use `cust_{tenant_id}` namespace pattern. pgvector implementations must include tenant_id in all queries.

**Priority:** Critical (MVP)  
**Phase:** 2 - RAG Pipeline + Multi-Tenancy  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Tenant namespace prefix applied to all vector operations
- [ ] Similarity search only returns tenant's own embeddings
- [ ] Cross-tenant vector queries return empty results
- [ ] Namespace enforcement is at database level (not just application)
- [ ] Embedding deletion removes only tenant's embeddings

**Dependencies:** RAG-02

**Verification Test:**
1. Ingest document for Tenant A
2. Generate embeddings in Tenant A namespace
3. Search as Tenant B
4. Verify Tenant B receives empty results
5. Verify Tenant A can retrieve their embeddings

---

## ADMIN: Admin Panel Requirements

Requirements for the customer-facing admin panel for chatbot management.

### ADMIN-01: Training Data Source Management

**Description:** Admins must be able to view all ingested sources, add new sources (PDF, URL, text), delete sources, and trigger re-indexing. The interface must show processing status and chunk counts for each source.

**Priority:** Critical (MVP)  
**Phase:** 3 - Admin Panel + Completeness  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Source list shows all ingested documents
- [ ] Status indicator shows processing state (processing, complete, error)
- [ ] Chunk count displayed for each source
- [ ] Add source form supports PDF upload
- [ ] Add source form supports URL input
- [ ] Add source form supports text paste
- [ ] Delete source removes from list and vector store
- [ ] Re-index button triggers reprocessing

**Dependencies:** RAG-01, RAG-02

**Verification Test:**
1. Open admin panel
2. Verify source list is visible
3. Add new PDF source
4. Watch status change to "processing" then "complete"
5. Verify chunk count is displayed
6. Delete source
7. Verify source is removed from list

---

### ADMIN-02: Conversation History View

**Description:** Admins must be able to view conversation history with timestamps, search and filter conversations, and drill into individual conversations to see the full message thread.

**Priority:** Critical (MVP)  
**Phase:** 3 - Admin Panel + Completeness  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Conversation list shows all conversations with tenant
- [ ] Timestamp displayed for each conversation
- [ ] Search box filters by keyword
- [ ] Date filter limits to time range
- [ ] Clicking conversation shows full thread
- [ ] Thread view shows user and assistant messages
- [ ] Messages show timestamp and content

**Dependencies:** CORE-02

**Verification Test:**
1. Generate test conversations via widget
2. Open admin panel
3. Verify conversations appear in list
4. Use search to find conversation by keyword
5. Filter by date range
6. Click conversation
7. Verify full message thread is displayed

---

### ADMIN-03: Widget Customization

**Description:** Admins must be able to customize widget appearance including primary color, widget position (bottom-left or bottom-right), welcome message, and bot name. Changes must apply immediately to deployed widgets.

**Priority:** Critical (MVP)  
**Phase:** 3 - Admin Panel + Completeness  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Color picker for primary widget color
- [ ] Position selector (bottom-left, bottom-right)
- [ ] Text input for welcome message
- [ ] Text input for bot name
- [ ] Preview shows customized widget appearance
- [ ] Changes save and apply within 5 seconds
- [ ] Deployed widget reflects changes immediately

**Dependencies:** EMBED-01, EMBED-02

**Verification Test:**
1. Open customization panel
2. Change primary color to blue
3. Change position to bottom-left
4. Change welcome message
5. Save changes
6. Open deployed widget
7. Verify changes are reflected

---

### ADMIN-04: Embed Code Generation

**Description:** The admin panel must generate and display the exact script tag customers need to embed on their website. The generated code must include the correct API key and configuration.

**Priority:** Critical (MVP)  
**Phase:** 3 - Admin Panel + Completeness  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Embed code displayed in admin panel
- [ ] Code includes correct tenant API key
- [ ] Code includes widget URL
- [ ] Copy-to-clipboard button works
- [ ] Code works when pasted into test HTML page
- [ ] Regenerate API key updates embed code

**Dependencies:** EMBED-01, ADMIN-03

**Verification Test:**
1. Open embed code section
2. Click copy button
3. Paste into test HTML file
4. Load page in browser
5. Verify widget appears and functions

---

## DEPLOY: Deployment Requirements

Requirements for production deployment, CI/CD, and operational readiness.

### DEPLOY-01: Docker Containerization

**Description:** All backend services must run in Docker containers with configuration via environment variables. Docker Compose must orchestrate all services (FastAPI, PostgreSQL, vector database) for local development and simple production deployment.

**Priority:** High (MVP)  
**Phase:** 4 - Production Hardening + Scale  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Dockerfile exists for FastAPI backend
- [ ] Docker Compose file orchestrates all services
- [ ] Environment variables configure database connections
- [ ] Environment variables configure API keys
- [ ] `docker-compose up` starts all services
- [ ] Health endpoints respond for all services
- [ ] Logs are accessible for debugging

**Dependencies:** CORE-01, TENANT-01

**Verification Test:**
1. Run `docker-compose up`
2. Verify all services start successfully
3. Verify health endpoints respond
4. Test widget chat functionality
5. Verify database queries work
6. Run `docker-compose down`
7. Verify clean shutdown

---

### DEPLOY-02: CI/CD Pipeline

**Description:** GitHub Actions must run automated tests on every pull request, including unit tests, integration tests, and security tests. Main branch merges must trigger automatic deployment to staging environment.

**Priority:** High (MVP)  
**Phase:** 4 - Production Hardening + Scale  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Unit tests run on every PR
- [ ] Integration tests run on every PR
- [ ] Security tests (secret detection, dependency scan) run on every PR
- [ ] Cross-tenant isolation test runs on every PR
- [ ] Build produces deployable artifacts
- [ ] Main branch merge triggers staging deployment
- [ ] CI/CD pipeline completes in under 10 minutes

**Dependencies:** All previous phases

**Verification Test:**
1. Create pull request
2. Verify CI pipeline runs automatically
3. Verify all test types execute
4. Verify pipeline fails if tests fail
5. Merge to main
6. Verify staging deployment triggers

---

### DEPLOY-03: Cost Monitoring and Rate Limiting

**Description:** The system must implement per-tenant rate limiting to prevent abuse, and provide cost monitoring visibility. Admins must see current month API usage, projected costs, and configure rate limits per tier.

**Priority:** High (MVP)  
**Phase:** 4 - Production Hardening + Scale  
**Status:** Pending

**Acceptance Criteria:**
- [ ] Rate limits enforced per API key
- [ ] Rate limit exceeded returns 429 with retry-after
- [ ] Admin dashboard shows current month API usage
- [ ] Dashboard shows projected end-of-month cost
- [ ] Alerts trigger at 50%, 75%, 100% of budget
- [ ] Rate limits configurable per tier (basic, pro, enterprise)
- [ ] Usage reports exportable for billing

**Dependencies:** CORE-02, TENANT-01, TENANT-02

**Verification Test:**
1. Configure rate limit of 10 requests/minute
2. Send 11 requests in 1 minute
3. Verify 11th request returns 429
4. Check admin dashboard
5. Verify usage metrics displayed
6. Test alert thresholds

---

## Traceability

### Complete Requirement Mapping

| Requirement | ID | Category | Phase | Status |
|------------|-----|----------|-------|--------|
| Single script tag deployment | EMBED-01 | Embed | Phase 1 | Pending |
| Iframe + Shadow DOM isolation | EMBED-02 | Embed | Phase 1 | Pending |
| FastAPI backend with OpenAPI | CORE-01 | Backend | Phase 1 | Pending |
| Streaming chat endpoint | CORE-02 | Backend | Phase 1 | Pending |
| Document ingestion (PDF/URL/text) | RAG-01 | RAG | Phase 2 | Pending |
| Semantic chunking + embeddings | RAG-02 | RAG | Phase 2 | Pending |
| Retrieval with source attribution | RAG-03 | RAG | Phase 2 | Pending |
| PostgreSQL RLS policies | TENANT-01 | Tenant | Phase 2 | Pending |
| Vector namespace enforcement | TENANT-02 | Tenant | Phase 2 | Pending |
| Training data management UI | ADMIN-01 | Admin | Phase 3 | Pending |
| Conversation history view | ADMIN-02 | Admin | Phase 3 | Pending |
| Widget customization | ADMIN-03 | Admin | Phase 3 | Pending |
| Embed code generation | ADMIN-04 | Admin | Phase 3 | Pending |
| Docker containerization | DEPLOY-01 | Deploy | Phase 4 | Pending |
| CI/CD pipeline | DEPLOY-02 | Deploy | Phase 4 | Pending |
| Cost monitoring + rate limiting | DEPLOY-03 | Deploy | Phase 4 | Pending |

### Coverage Summary

| Category | Total Requirements | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|----------|-------------------|---------|---------|---------|---------|
| Embed | 2 | 2 | 0 | 0 | 0 |
| Backend | 2 | 2 | 0 | 0 | 0 |
| RAG | 3 | 0 | 3 | 0 | 0 |
| Tenant | 2 | 0 | 2 | 0 | 0 |
| Admin | 4 | 0 | 0 | 4 | 0 |
| Deploy | 3 | 0 | 0 | 0 | 3 |
| **Total** | **16** | **4** | **5** | **4** | **3** |

**Mapped Requirements:** 16/16 (100%)  
**Orphaned Requirements:** 0

---

## Priority Levels

| Priority | Meaning | Timeline |
|----------|---------|----------|
| Critical | MVP requirement, must have for launch | Phase 1-3 |
| High | Production requirement, strongly expected | Phase 4 |
| Medium | Should-have feature, completes product | Phase 2-3 |
| Low | Nice-to-have, differentiation | Future v2 |

---

## Dependencies Matrix

| Requirement | Depends On | Depended On By |
|------------|------------|----------------|
| EMBED-01 | None | EMBED-02, ADMIN-04 |
| EMBED-02 | EMBED-01 | ADMIN-03 |
| CORE-01 | None | CORE-02, TENANT-01, DEPLOY-01 |
| CORE-02 | CORE-01 | ADMIN-02, DEPLOY-03 |
| RAG-01 | CORE-01 | RAG-02 |
| RAG-02 | RAG-01 | RAG-03 |
| RAG-03 | RAG-02, TENANT-01, TENANT-02 | None |
| TENANT-01 | CORE-01 | RAG-03, DEPLOY-03 |
| TENANT-02 | RAG-02 | RAG-03 |
| ADMIN-01 | RAG-01, RAG-02 | None |
| ADMIN-02 | CORE-02 | None |
| ADMIN-03 | EMBED-01, EMBED-02 | None |
| ADMIN-04 | EMBED-01, ADMIN-03 | None |
| DEPLOY-01 | CORE-01, TENANT-01 | None |
| DEPLOY-02 | All previous | None |
| DEPLOY-03 | CORE-02, TENANT-01, TENANT-02 | None |

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | February 7, 2026 | Initial requirements document |

---

## References

- **ROADMAP.md:** Phase structure and execution order
- **PROJECT.md:** Core value proposition and constraints
- **research/SUMMARY.md:** Research synthesis
- **research/ARCHITECTURE.md:** Technical patterns
- **research/PITFALLS.md:** Risk catalog
- **research/STACK.md:** Technology stack
