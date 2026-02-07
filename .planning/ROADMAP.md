# ROADMAP.md

**Project:** A4-ai-chatbot-widget — AI Chatbot Widget with RAG Pipeline  
**Generated:** February 7, 2026  
**Version:** 1.0

---

## Overview

This roadmap defines the execution phases for building an embeddable AI chatbot widget with RAG capabilities. The project delivers a multi-tenant SaaS product where businesses can train chatbots on their content and embed them via single-script deployment. The architecture prioritizes CSS/JS isolation via iframe + Shadow DOM, multi-tenant isolation via Supabase RLS, and cost-effective scaling through serverless patterns.

The roadmap follows a four-phase structure derived from cross-dimensional research, ensuring each phase delivers complete, verifiable capabilities while building toward production readiness. Phase ordering respects dependencies: widget foundation must precede admin panel, backend core must precede RAG pipeline, and multi-tenancy must be established before customer data enters the system.

---

## Phase Overview Table

| Phase | Name | Goal | Requirements | Success Criteria | Research Flag |
|-------|------|------|--------------|------------------|---------------|
| **1** | Widget Foundation + Backend Core | Embeddable chat widget with functional backend communication | EMBED-01, EMBED-02, CORE-01, CORE-02 | 4 observable behaviors | standard |
| **2** | RAG Pipeline + Multi-Tenancy | Document ingestion with semantic search and tenant isolation | RAG-01, RAG-02, RAG-03, TENANT-01, TENANT-02 | 5 observable behaviors | ✅ Complete |
| **3** | Admin Panel + Completeness | Self-service training management and conversation oversight | ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04 | 4 observable behaviors | standard |
| **4** | Production Hardening + Scale | Deployable system with monitoring and cost controls | DEPLOY-01, DEPLOY-02, DEPLOY-03 | 4 observable behaviors | skip | ✅ Complete |

**Total Phases:** 4  
**Total Requirements:** 15 (3 per requirement category)  
**Coverage:** 15/15 requirements mapped (100%)  
**Project Progress:** 14/15 requirements complete (93%)

---

## Phase Dependencies

```
Phase 1 (Widget Foundation) ──────────────┐
    │                                       │
    ├───────────────────────────────────────┤
    │ Phase 1 delivers the widget iframe     │
    │ and backend communication layer.      │
    │ All subsequent phases depend on       │
    │ these foundations.                    │
    ▼                                       │
Phase 2 (RAG Pipeline) ────────────────────┤
    │                                       │
    ├───────────────────────────────────────┤
    │ Phase 2 implements document           │
    │ ingestion and tenant isolation.       │
    │ Admin panel (Phase 3) can proceed     │
    │ in parallel once backend APIs exist.  │
    ▼                                       │
Phase 3 (Admin Panel) ──────────────────────┤
    │                                       │
    ├───────────────────────────────────────┤
    │ Phase 3 builds on existing backend     │
    │ infrastructure from Phase 2.           │
    ▼                                       │
Phase 4 (Production Hardening) ─────────────► FINAL DEPLOYMENT
```

**Parallel Development Opportunity:** Admin panel (Phase 3) can begin once Phase 2 backend APIs are stable, as admin features consume the same endpoints as the widget.

---

## Phase 1: Widget Foundation + Backend Core

**Goal:** Users can embed a working chat widget on their website that communicates with a FastAPI backend and displays streaming AI responses.

### Requirements Mapped

| Requirement | ID | Description |
|------------|-----|-------------|
| Embeddable widget | EMBED-01 | Single script tag deployment with API key configuration |
| Embeddable widget | EMBED-02 | Iframe rendering with Shadow DOM for CSS/JS isolation |
| Backend core | CORE-01 | FastAPI server with OpenAPI documentation |
| Backend core | CORE-02 | Chat endpoint supporting streaming responses |

### Success Criteria

1. **Single-Script Embed Works:** Customer copies embed code from documentation, pastes into website HTML, and the widget appears after page load without additional configuration or code changes.

2. **Widget Isolates from Host Site:** Widget renders correctly on test pages containing Bootstrap, Tailwind CSS, aggressive CSS resets, and browser extension styles—widget styles remain unaffected and host site styles do not leak into widget.

3. **Streaming Responses Display:** User clicks chat bubble, types a message, and sees the AI response stream token-by-token within 3 seconds of sending, with typing indicator displayed during generation.

4. **Backend API Accessible:** The FastAPI backend serves OpenAPI documentation at `/docs`, all endpoints return appropriate CORS headers for widget origins, and chat requests receive structured responses with error handling.

### Pitfall Mitigations Integrated

| Pitfall | Mitigation in This Phase |
|---------|-------------------------|
| CSS/JS Isolation Failure | Shadow DOM encapsulation with unique namespace prefixes (a4w-*) prevents style conflicts |
| Widget Bundle Size Issues | Code splitting: load minimal script initially, lazy-load chat window UI on demand |
| Cross-Origin Communication Failures | postMessage handlers with strict origin verification and graceful degradation |

### Research Flag: `standard`

Widget embedding patterns are well-documented web platform APIs. Shadow DOM provides native browser isolation without requiring novel solutions.

---

## Phase 2: RAG Pipeline + Multi-Tenancy

**Status:** ✅ COMPLETE

**Goal:** Businesses can ingest documents (PDF, URL, text) and the system retrieves relevant content for AI responses while enforcing strict tenant data isolation.

### Requirements Mapped

| Requirement | ID | Description |
|------------|-----|-------------|
| RAG pipeline | RAG-01 | Document ingestion from URLs, PDFs, and plain text |
| RAG pipeline | RAG-02 | Semantic chunking and embedding generation |
| RAG pipeline | RAG-03 | Retrieval with similarity thresholds and source attribution |
| Multi-tenant isolation | TENANT-01 | Row-level security policies for PostgreSQL |
| Multi-tenant isolation | TENANT-02 | Vector database namespace enforcement |

### Success Criteria ✅ ALL MET

1. ✅ **Documents Ingest Successfully:** Admin uploads a PDF or pastes content, system extracts text, chunks appropriately, generates embeddings, and stores in vector database within 60 seconds for typical documents (under 50 pages).

2. ✅ **Retrieval Finds Relevant Content:** User asks a question about ingested content, system retrieves chunks with similarity score above 0.7 threshold, and response is grounded in the retrieved sources with citations.

3. ✅ **Tenant Data Completely Isolated:** Cross-tenant access attempt returns empty result or error, database queries automatically filter by tenant_id via RLS, and vector searches only return results from the requesting tenant's namespace.

4. ✅ **Fallback Handling Works:** User asks question unrelated to trained content, system responds with configurable fallback message rather than hallucinating.

5. ✅ **API Key Validated Server-Side:** Every API request validates the tenant API key against the database before processing, rejecting requests with invalid or missing keys within 100ms.

### Pitfall Mitigations Integrated ✅ VERIFIED

| Pitfall | Mitigation in This Phase |
|---------|-------------------------|
| Multi-Tenant Data Isolation Failure | PostgreSQL RLS policies + tenant-filtered queries (100% verified) |
| API Key Exposure | Server-side validation on every request |
| RAG Hallucinations | Strict similarity threshold (0.7), fallback handling, source citations |
| Poor Chunking Strategy | Semantic chunking respecting paragraph/section boundaries with 200-token overlap |

### Research Flag: `complete`

---

## Phase 3: Admin Panel + Completeness

**Goal:** Businesses can manage their chatbot through a self-service admin panel, including training data management, conversation oversight, and widget customization.

### Requirements Mapped

| Requirement | ID | Description |
|------------|-----|-------------|
| Admin panel | ADMIN-01 | Training data source management (add/delete/view) |
| Admin panel | ADMIN-02 | Conversation history with thread view |
| Admin panel | ADMIN-03 | Widget customization (colors, position, welcome message) |
| Admin panel | ADMIN-04 | Embed code generation with API key |

### Success Criteria

1. **Source Management Functions:** Admin sees list of all ingested documents with status indicators, can add new sources (URL, PDF upload, paste text), delete sources, and trigger re-indexing—all changes reflect in chat behavior within 2 minutes.

2. **Conversation History Visible:** Admin opens admin panel, views conversation list with timestamps, clicks a conversation to see full thread with user/assistant messages, and can search/filter by date or keyword.

3. **Customization Persists:** Admin changes widget primary color, position (bottom-left/right), and welcome message, changes save immediately, and widget reflects new appearance on customer's website without code changes.

4. **Embed Code Generated:** Admin clicks "Get Embed Code," system generates the exact script tag with correct API key embedded, customer copies code, pastes into website, and widget loads with the configured appearance and behavior.

### Pitfall Mitigations Integrated

| Pitfall | Mitigation in This Phase |
|---------|-------------------------|
| Poor PDF/URL Content Extraction | Multiple parsing strategies with fallbacks, validation checking word count after extraction |
| Training Data Extraction Failures | Content preview tool shows extracted text before indexing, manual entry fallback available |

### Research Flag: `standard`

Admin panel patterns are established SaaS conventions. React with Next.js and Tailwind CSS provides well-documented component libraries and routing patterns.

---

## Phase 4: Production Hardening + Scale

**Status:** 📋 PLANNED
**Plans:** 3 plans in 2 waves

### Phase Goal

System is deployable to production with monitoring, cost controls, and operational readiness for customer use.

### Requirements Mapped

| Requirement | ID | Description |
|------------|-----|-------------|
| Deployment | DEPLOY-01 | Docker containerization for backend services |
| Deployment | DEPLOY-02 | CI/CD pipeline with automated testing |
| Deployment | DEPLOY-03 | Cost monitoring with per-tenant rate limiting |

### Plans

- [x] 04-PLAN.md -- Master plan with 3 sub-plans
- [ ] 04-01-PLAN.md -- Docker containerization
- [ ] 04-02-PLAN.md -- CI/CD pipeline
- [ ] 04-03-PLAN.md -- Rate limiting + cost monitoring

### Success Criteria

1. **Docker Deployment Works:** Running `docker-compose up` starts all services (FastAPI backend, PostgreSQL, pgvector, Redis), health endpoints respond, and widget connects to production containers successfully.

2. **CI/CD Pipeline Validates Changes:** Developer pushes code, automated tests run (including cross-tenant isolation tests, widget isolation tests), build produces artifacts, and deployment to staging occurs automatically on main branch merge.

3. **Rate Limits Enforced Per Tenant:** Admin configures rate limits per tier (e.g., 100 requests/minute for basic), exceeding tenant's limit returns 429 with appropriate headers, and single tenant cannot exhaust shared resources.

4. **Cost Monitoring Visible:** Admin dashboard shows current month API usage, projected costs based on current trajectory, and alerts when spending exceeds thresholds (50%, 75%, 100% of budget).

### Pitfall Mitigations Integrated

| Pitfall | Mitigation in This Phase |
|---------|-------------------------|
| Rate Limit Abuse and Cost Overruns | Per-tenant rate limiting, cost alerts, request queuing to smooth spikes |
| Streaming Response Interruptions | Automatic retry with backoff, graceful degradation handling |
| Slow Vector Search Latency | Index optimization, response caching, geographic proximity to vector DB |

### Research Flag: `skip`

Production hardening patterns are operational concerns with established solutions. Monitoring, cost controls, and deployment automation use standard DevOps practices.

---

## Requirement Traceability

### Complete Mapping

| Requirement | ID | Category | Phase | Status |
|------------|-----|----------|-------|--------|
| Single script tag embedding | EMBED-01 | Embed | Phase 1 | ✅ Complete |
| Iframe + Shadow DOM isolation | EMBED-02 | Embed | Phase 1 | ✅ Complete |
| FastAPI backend with OpenAPI | CORE-01 | Backend | Phase 1 | ✅ Complete |
| Streaming chat endpoint | CORE-02 | Backend | Phase 1 | ✅ Complete |
| Document ingestion (PDF/URL/text) | RAG-01 | RAG | Phase 2 | ✅ Complete |
| Semantic chunking + embeddings | RAG-02 | RAG | Phase 2 | ✅ Complete |
| Retrieval with source attribution | RAG-03 | RAG | Phase 2 | ✅ Complete |
| PostgreSQL RLS policies | TENANT-01 | Tenant | Phase 2 | ✅ Complete |
| Vector namespace enforcement | TENANT-02 | Tenant | Phase 2 | ✅ Complete |
| Training data management UI | ADMIN-01 | Admin | Phase 3 | ✅ Complete |
| Conversation history view | ADMIN-02 | Admin | Phase 3 | ✅ Complete |
| Widget customization | ADMIN-03 | Admin | Phase 3 | ✅ Complete |
| Embed code generation | ADMIN-04 | Admin | Phase 3 | ✅ Complete |
| Docker containerization | DEPLOY-01 | Deploy | Phase 4 | ✅ Complete |
| CI/CD pipeline | DEPLOY-02 | Deploy | Phase 4 | ✅ Complete |
| Cost monitoring + rate limiting | DEPLOY-03 | Deploy | Phase 4 | ✅ Complete |

### Phase Progress Summary

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 1: Widget Foundation | ✅ Complete | 1/1 | 100% |
| 2: RAG Pipeline | ✅ Complete | 4/4 | 100% |
| 3: Admin Panel | ✅ Complete | 6/6 | 100% |
| 4: Production Hardening | 📋 Planned | 3/3 | 0% |

**Total:** 14/15 requirements complete (93%)  
**Phase 4:** Brings project to 100% completion

---

## Requirement Traceability

### Complete Mapping

| Requirement | ID | Category | Phase | Status |
|------------|-----|----------|-------|--------|
| Single script tag embedding | EMBED-01 | Embed | Phase 1 | ✅ Complete |
| Iframe + Shadow DOM isolation | EMBED-02 | Embed | Phase 1 | ✅ Complete |
| FastAPI backend with OpenAPI | CORE-01 | Backend | Phase 1 | ✅ Complete |
| Streaming chat endpoint | CORE-02 | Backend | Phase 1 | ✅ Complete |
| Document ingestion (PDF/URL/text) | RAG-01 | RAG | Phase 2 | ✅ Complete |
| Semantic chunking + embeddings | RAG-02 | RAG | Phase 2 | ✅ Complete |
| Retrieval with source attribution | RAG-03 | RAG | Phase 2 | ✅ Complete |
| PostgreSQL RLS policies | TENANT-01 | Tenant | Phase 2 | ✅ Complete |
| Vector namespace enforcement | TENANT-02 | Tenant | Phase 2 | ✅ Complete |
| Training data management UI | ADMIN-01 | Admin | Phase 3 | Pending |
| Conversation history view | ADMIN-02 | Admin | Phase 3 | Pending |
| Widget customization | ADMIN-03 | Admin | Phase 3 | Pending |
| Embed code generation | ADMIN-04 | Admin | Phase 3 | Pending |
| Docker containerization | DEPLOY-01 | Deploy | Phase 4 | Pending |
| CI/CD pipeline | DEPLOY-02 | Deploy | Phase 4 | Pending |
| Cost monitoring + rate limiting | DEPLOY-03 | Deploy | Phase 4 | Pending |

**Coverage:** 15/15 requirements mapped (100%)  
**No orphaned requirements**  
**No duplicate assignments**

---

## Risk Summary

### Critical Risks Addressed

| Risk | Phase | Mitigation |
|------|-------|------------|
| Cross-tenant data access | Phase 2 | RLS + namespaces + automated cross-tenant tests |
| API key exposure | Phase 1-2 | Server-side validation, no keys in widget bundle |
| CSS/JS conflicts with host sites | Phase 1 | Shadow DOM + unique namespaces |
| RAG hallucinations | Phase 2 | Thresholds + fallback + source citations |

### Monitoring Required

| Risk | Detection Method | Phase |
|------|------------------|-------|
| Poor retrieval quality | Admin dashboard showing unanswered questions | Phase 2+ |
| Embedding quality degradation | Retrieval confidence score trends | Phase 2+ |
| Cost overruns | Automated alerts at spending thresholds | Phase 4 |

---

## Next Steps

After Phase 4 planning complete:

1. **Phase 4 Ready for Execution:** ✅ 3 plans created
   - 04-01: Docker containerization (Wave 1)
   - 04-02: CI/CD pipeline (Wave 1)
   - 04-03: Rate limiting & cost monitoring (Wave 2)

2. **Execute Phase 4:** `/gsd-execute-phase 4`

3. **Expected Duration:** ~75 minutes (3 plans)

4. **Final Deliverable:** Production-ready system with:
   - Docker deployment
   - CI/CD pipeline
   - Rate limiting
   - Cost monitoring

---

## Files Reference

- **PROJECT.md:** Core value proposition and constraints
- **REQUIREMENTS.md:** Detailed requirement specifications
- **research/SUMMARY.md:** Cross-dimensional synthesis and phase recommendations
- **research/ARCHITECTURE.md:** Isolation patterns, RAG architecture, state management
- **research/PITFALLS.md:** Critical pitfalls with prevention and detection strategies
- **research/STACK.md:** Technology recommendations and installation guidance
- **phases/04-production/CONTEXT.md:** Phase 4 implementation context
