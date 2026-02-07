# Technology Stack Research: AI Chatbot Widget

**Project:** AI Chatbot Widget for Website Embedding
**Research Date:** February 2025
**Confidence Level:** HIGH

## Executive Summary

This research identifies the recommended technology stack for building an embeddable AI chatbot widget with RAG (Retrieval-Augmented Generation) capabilities. The recommended stack prioritizes developer experience, cost-effectiveness at scale, and robust isolation from host websites. Key recommendations include using a hybrid architecture where the browser widget communicates with a Python backend for heavy RAG processing, leveraging LangChain for the AI pipeline, and implementing Shadow DOM for CSS isolation. The stack should use OpenAI's API for embeddings and chat completions (or Anthropic Claude as a cost-effective alternative), with a serverless backend infrastructure for multi-tenant scalability.

## Recommended Technology Stack

### Widget Layer (Client-Side)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TypeScript | 5.x | Primary language | Type safety, better tooling, reduced runtime errors |
| Shadow DOM | Native | CSS isolation | Built-in browser feature for clean style encapsulation |
| Lit | 3.x | Web component framework | Lightweight, Shadow DOM native support, small bundle size |
| Vite | 5.x | Build tool | Fast development, optimized production builds |

### Backend Layer (Server-Side)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python | 3.11+ | Primary language | Best ecosystem for AI/ML libraries |
| FastAPI | 0.109+ | Web framework | High performance, async native, automatic API docs |
| LangChain | 0.2.x | AI/LLM orchestration | Comprehensive RAG pipeline support |
| OpenAI SDK | 1.x | LLM integration | Official client, well-documented, reliable |
| Uvicorn | 0.27+ | ASGI server | Fast, production-ready ASGI implementation |
| PostgreSQL | 15.x | Primary database | Robust, scalable, good JSON support |
| Supabase | Latest | Database + Auth + Realtime | Built-in multi-tenancy support, scalable |
| Pinecone | Latest | Vector database | Managed service, good performance, cost-effective |

### AI/ML Stack

| Technology | Purpose | Why |
|------------|---------|-----|
| OpenAI text-embedding-3-small | Text embeddings | High performance, good price point, 1536 dimensions |
| OpenAI GPT-4o-mini | Chat completions | Cost-effective, fast, good reasoning |
| or Anthropic Claude 3.5 Haiku | Chat completions | Competitive pricing, good performance |
| LangChain RAG components | Vector store, retrievers | Standardized interface, multiple backend support |

### Admin Panel

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x | UI framework | Large ecosystem, component reuse |
| Next.js | 14.x | Full-stack React | Server-side rendering, API routes, routing |
| Tailwind CSS | 3.x | Styling | Rapid development, small bundle size |
| shadcn/ui | Latest | UI components | Accessible, customizable, modern design |

### Infrastructure & DevOps

| Technology | Purpose | Why |
|------------|---------|-----|
| Docker | Containerization | Consistent environments, easy deployment |
| GitHub Actions | CI/CD | Free tier available, good integration |
| Vercel | Frontend hosting | Free tier, excellent Next.js support |
| Railway/Render | Backend hosting | Good free tier, easy scaling |
| Cloudflare Workers | Edge caching | Fast global distribution |

### Content Processing

| Technology | Purpose | Why |
|------------|---------|-----|
| python-docx | DOCX parsing | Simple, reliable for Word documents |
| pdfplumber | PDF text extraction | High quality, preserves layout info |
| Beautiful Soup 4 | HTML parsing | Robust, well-documented |
| Playwright | URL content scraping | Modern, headless browser capable |
| tiktoken | Token counting | Accurate OpenAI tokenization |

## Stack Justification

### Why TypeScript with Lit for the Widget

The widget must be embeddable via a single script tag while maintaining strict isolation from host site CSS and JavaScript. TypeScript provides compile-time type checking that catches integration issues early, which is critical when your widget will run on unpredictable third-party websites. Lit is specifically designed for building web components that leverage Shadow DOM natively, providing automatic style encapsulation without additional tooling overhead.

Shadow DOM prevents host site styles from bleeding into the widget and prevents widget styles from affecting the host page. This is non-negotiable for a widget that will run on thousands of different websites with varying CSS practices. Lit's reactive property system and template syntax provide a modern development experience while keeping the final bundle small, which is important because widgets that load slowly hurt the user experience on host sites.

The alternative of using raw Custom Elements without Lit is possible but increases development time and maintenance burden. Alternatives like React or Vue are too heavy for embeddable widgets due to their large runtime requirements, even with techniques like micro-frontends. Solid.js could work but has a smaller ecosystem specifically for web components compared to Lit.

### Why Python with FastAPI for the Backend

Python is the dominant language in the AI/ML ecosystem, and every major LLM provider offers Python SDKs with the best documentation and features. FastAPI provides exceptional performance (comparable to Node.js) while maintaining Python's developer experience advantages. The async capabilities in FastAPI are essential for handling concurrent RAG requests efficiently, and the automatic OpenAPI documentation reduces integration friction for future API consumers.

The multi-tenant SaaS requirement makes a robust backend essential. FastAPI's dependency injection system makes implementing tenant isolation straightforward, and Supabase provides excellent PostgreSQL hosting with built-in authentication and row-level security. This combination allows focusing on business logic rather than infrastructure plumbing.

Alternative backend frameworks like Django provide more built-in features but introduce unnecessary complexity for this use case. Node.js with Express could work but would require more effort integrating with Python-centric AI libraries. Serverless functions (AWS Lambda, Cloudflare Workers) could reduce infrastructure management but introduce cold start latency and complicate the RAG pipeline implementation.

### Why OpenAI for Embeddings and Chat

OpenAI's text-embedding-3-small model offers an excellent balance of performance and cost for RAG applications. With 62,500 pages per dollar and 1536 dimensions, it provides high-quality semantic search capabilities at a price point suitable for multi-tenant SaaS. The embedding dimensions can be reduced (e.g., to 256 or 512) without significant performance loss, further reducing storage costs.

For chat completions, GPT-4o-mini offers state-of-the-art reasoning capabilities at approximately $0.15 per million input tokens and $0.60 per million output tokens (pricing as of early 2025). This makes per-query costs manageable even at scale, especially with effective caching strategies. The 128K context window allows processing substantial document chunks.

Anthropic Claude 3.5 Haiku offers competitive pricing at $0.80 per million output tokens and has shown strong performance on instruction-following and reasoning tasks. For some use cases, Claude may produce more consistent responses. The recommendation is to implement an abstraction layer that allows switching between providers based on cost, performance, or accuracy requirements per tenant.

Alternative embedding providers like Cohere or open-source solutions like sentence-transformers exist, but OpenAI offers the best combination of quality, price, and ease of integration for this use case. Self-hosted embedding models could reduce costs at scale but require significant infrastructure investment and ML expertise.

### Why LangChain for RAG Pipeline

LangChain provides a standardized interface for building RAG pipelines that abstracts away provider-specific implementations. This is crucial for a multi-tenant system where different tenants might require different configurations or where you might need to switch LLM providers in the future. The framework handles common patterns like document loading, text splitting, vector store integration, and retrieval.

The LangChain Expression Language (LCEL) allows building complex RAG pipelines with minimal boilerplate while maintaining readability. Integrations with major vector databases, LLM providers, and document loaders are well-maintained and production-tested. The community ecosystem provides solutions to common RAG challenges like hybrid search, re-ranking, and citation extraction.

Alternative approaches include building a custom RAG pipeline using just SDKs, which provides maximum control but requires reimplementing common patterns. Libraries like LlamaIndex offer similar functionality to LangChain with different API design philosophies. For this project, LangChain is recommended due to its comprehensive documentation and broader integration ecosystem, but LlamaIndex is a valid alternative if the team has prior experience.

### Why Supabase for Database and Auth

Supabase provides an open-source Firebase alternative built on PostgreSQL with excellent TypeScript support, built-in authentication, row-level security for multi-tenancy, and realtime subscriptions. The row-level security is particularly valuable for tenant isolation, ensuring that data access queries automatically filter by tenant without requiring manual checks in application code.

The built-in auth system supports multiple providers and includes email/password, social logins, and magic links out of the box. For the admin panel, this eliminates significant authentication implementation effort. Supabase's pricing model includes a generous free tier suitable for early-stage development, with clear scaling paths as the tenant base grows.

Alternative database choices include direct PostgreSQL hosting on Railway/Render, which provides more control but requires manual configuration. Managed vector databases like Pinecone could replace Supabase for vector storage, but Supabase with pgvector extension provides a cost-effective solution for moderate-scale vector storage within the same database. For larger scale, a dedicated vector database like Pinecone becomes more attractive despite the additional cost.

## Compatibility Considerations

### Widget Integration Compatibility

The widget must function correctly across all modern browsers and avoid conflicts with common website technologies. Shadow DOM provides CSS isolation, but JavaScript conflicts can still occur through global variables, prototype chain modifications, or event handling. The widget should use unique prefixes for all global identifiers and avoid modifying prototypes.

Common integration issues include Content Security Policy (CSP) restrictions, ad blockers blocking external requests, and browser extensions interfering with DOM manipulation. The widget should gracefully handle CSP violations by falling back to inline styles if needed, use non-standard request endpoints if standard ones are blocked, and detect and work around common extension behaviors.

The single-script deployment pattern requires the widget to load all dependencies (CSS and JavaScript) from a single bundle. Vite's library mode supports this pattern with proper configuration. The widget should also support iframe-based embedding for sites that cannot accommodate script tags or have strict CSP policies.

### API Compatibility and Rate Limits

OpenAI's rate limits are structured by organization tier, with free tier at 60 RPM and 150K TPM, scaling up through paid tiers. For a multi-tenant SaaS, rate limits become a significant consideration. The backend should implement request queuing, caching, and tenant-level rate limiting to prevent any single tenant from exhausting shared limits.

Response streaming is essential for a good chatbot experience. OpenAI's API supports Server-Sent Events (SSE) for streaming responses, which FastAPI handles natively. The streaming implementation should account for potential network interruptions and provide appropriate retry mechanisms.

The API version compatibility should be pinned to a specific OpenAI API version to prevent breaking changes. OpenAI maintains backward compatibility for significant versions, but the recommended approach is to pin to a specific version and test updates before deploying to production.

### Multi-Tenant Data Isolation

Tenant isolation must be enforced at every layer: database (row-level security), application (tenant context injection), and API (tenant-scoped rate limiting). The tenant ID should be derived from the widget configuration passed during initialization and validated on every API request.

Document storage should include tenant_id as a mandatory foreign key, with database constraints preventing orphaned documents. Vector embeddings can share a single Pinecone index with namespace-based isolation, or use separate indexes per tenant for stronger isolation at higher cost.

### Cost Optimization at Scale

Per-query costs with OpenAI can be managed through several strategies: embedding caching (store and reuse embeddings for identical documents), semantic caching (cache responses for similar queries), prompt compression (reduce token usage), and model routing (use cheaper models for simpler queries).

For embedding storage, the text-embedding-3-small model produces 1536-dimensional vectors. At 4 bytes per dimension, each embedding requires approximately 6KB. For 10 million embeddings, this is roughly 60GB of storage. Using reduced dimensions (e.g., 512) would reduce storage by two-thirds with minimal quality loss for many use cases.

## Alternative Options with Trade-offs

### Embedding Provider Alternatives

| Provider | Model | Pages/Dollar | Dimensions | Pros | Cons |
|----------|-------|--------------|------------|------|------|
| **Recommended: OpenAI** | text-embedding-3-small | 62,500 | 1536 | Best quality/price, well-documented | Rate limits apply |
| Cohere | embed-english-v3.0 | ~50,000 | 1024 | Good multilingual support | Different API pattern |
| Hugging Face | sentence-transformers | Free | Variable | Self-hosting possible | Requires ML expertise |
| Google | text-embedding-004 | ~40,000 | 768 | Integrated with Vertex AI | Newer, less proven |

For this project, OpenAI is recommended due to its proven quality, straightforward pricing, and excellent documentation. Cohere is a strong backup if OpenAI pricing becomes prohibitive or if specific multilingual requirements emerge.

### Chat Model Alternatives

| Provider | Model | Input $/1M | Output $/1M | Context | Best For |
|----------|-------|------------|-------------|---------|----------|
| **Recommended: OpenAI** | GPT-4o-mini | $0.15 | $0.60 | 128K | Best balance |
| Anthropic | Claude 3.5 Haiku | $0.25 | $0.80 | 200K | Strong reasoning |
| Google | Gemini 1.5 Flash | $0.075 | $0.30 | 1M | Long context |
| Groq | Llama models | ~$0.10 | ~$0.10 | 32K | Fast inference |

The recommendation is to implement a model router that can select between providers based on query complexity, tenant preferences, or cost optimization goals. This future-proofs the architecture against pricing changes and model improvements.

### Backend Framework Alternatives

| Framework | Pros | Cons | Recommended For |
|-----------|------|------|-----------------|
| **FastAPI (Recommended)** | Fast, async-native, auto-docs | Less built-in than Django | API-first services |
| Django + Ninja | Full-featured, robust ORM | Heavier, more complex | Complex admin systems |
| Node.js + Express | Large ecosystem, fast I/O | TypeScript overhead | Teams with JS expertise |
| Go + Gin | Excellent performance | Less AI ecosystem | High-throughput services |

For a project centered on AI/ML workloads, Python's ecosystem advantages outweigh performance differences. FastAPI's async capabilities handle concurrent requests efficiently enough for most production workloads.

### Vector Database Alternatives

| Database | Pros | Cons | Pricing Model |
|----------|------|------|--------------|
| **Pinecone (Recommended)** | Managed, excellent performance | More expensive at scale | Usage-based |
| Supabase + pgvector | Included with Postgres, cheap | Less optimized for vectors | $4+/month base |
| Weaviate | Open-source, flexible | Self-hosted complexity | Free + hosting costs |
| Qdrant | High performance, Rust | Less managed options | Free + hosting |

For early-stage development, Supabase with pgvector provides the best value, allowing vector storage without additional costs. As scale increases, migration to Pinecone or similar managed service becomes justified by performance requirements.

### Widget Technology Alternatives

| Approach | Bundle Size | Isolation | Complexity | Best For |
|---------|-------------|-----------|------------|----------|
| **Lit + Shadow DOM (Recommended)** | ~10KB gzipped | Excellent | Low | General use |
| Raw Custom Elements | ~5KB gzipped | Excellent | High | Maximum control |
| iframe-based | Varies | Complete | Medium | Strict isolation needs |
| Shadow Portal | Varies | Excellent | Medium | Complex interactions |

The Lit approach balances bundle size, development experience, and isolation effectiveness. Raw Custom Elements are viable but increase development time. iframe approaches solve isolation completely but limit widget-host communication and may be blocked by some sites.

## Installation and Setup

### Widget Dependencies

```bash
# Create widget project
npm create vite@latest chatbot-widget -- --template lit-ts

# Install Lit and dependencies
cd chatbot-widget
npm install lit vite @lit/task @lit/localize

# Build for production
npm run build
```

### Backend Dependencies

```bash
# Create backend project
mkdir chatbot-backend && cd chatbot-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn langchain langchain-openai langchain-community
pip install supabase python-dotenv aiofiles
pip install python-docx pdfplumber beautifulsoup4 playwright
pip install tiktoken

# Install Playwright browsers (for URL scraping)
playwright install
```

### Admin Panel Dependencies

```bash
# Create Next.js project
npx create-next-app@latest admin-panel --typescript --tailwind --eslint
cd admin-panel
npm install @supabase/supabase-js lucide-react date-fns
```

## Recommended Project Structure

```
chatbot-project/
├── chatbot-widget/          # Embeddable widget
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat-widget.ts
│   │   │   ├── chat-window.ts
│   │   │   ├── message-list.ts
│   │   │   └── input-area.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── config.ts
│   │   ├── styles/
│   │   │   └── widget.css.ts
│   │   └── index.ts
│   ├── vite.config.ts
│   └── package.json
│
├── chatbot-backend/          # API server
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── chat.py
│   │   │   │   ├── documents.py
│   │   │   │   └── tenants.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── services/
│   │   │   ├── rag_pipeline.py
│   │   │   ├── embeddings.py
│   │   │   └── document_processor.py
│   │   └── models/
│   │       ├── database.py
│   │       └── schemas.py
│   ├── tests/
│   └── requirements.txt
│
├── admin-panel/             # Admin dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   ├── documents/
│   │   │   ├── settings/
│   │   │   └── api/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
│
└── docker-compose.yml
```

## Sources and Confidence Assessment

**Confidence: HIGH**

- LangChain documentation confirms Python and JavaScript SDK availability with active maintenance (https://python.langchain.com/docs/get_started/introduction)
- OpenAI API documentation confirms embedding models text-embedding-3-small with 1536 dimensions and rate limit structure (https://platform.openai.com/docs/guides/embeddings, https://platform.openai.com/docs/guides/rate-limits)
- Lit documentation confirms native Shadow DOM support and web component framework capabilities (https://lit.dev)
- FastAPI documentation confirms async support and high-performance characteristics (https://fastapi.tiangolo.com)
- Shadow DOM specification is W3C standard with universal browser support

**Notes on Confidence:**
- LLM pricing is subject to change; verify current rates at time of implementation
- Library versions should be checked for compatibility before production deployment
- Rate limits vary by organization tier; verify limits in OpenAI dashboard
- Some recommendations assume general use case; specific requirements may warrant different choices

## Key Research Findings

1. **Widget Architecture**: Shadow DOM with Lit provides the best balance of isolation, bundle size, and developer experience for embeddable widgets.

2. **RAG Pipeline**: LangChain with OpenAI embeddings provides the most straightforward path to production with excellent documentation and community support.

3. **Multi-Tenancy**: PostgreSQL with row-level security (via Supabase) provides robust tenant isolation at the database level.

4. **Cost Optimization**: text-embedding-3-small with reduced dimensions (256-512) can significantly reduce vector storage costs with minimal quality impact for most use cases.

5. **Model Selection**: GPT-4o-mini offers the best balance of capability and cost, but the architecture should support multiple providers for flexibility.

6. **Content Processing**: python-docx, pdfplumber, and Playwright cover the primary document formats (DOCX, PDF, URLs) with high reliability.

7. **Scaling Path**: Start with Supabase+pgvector for cost-effective vector storage, migrate to Pinecone when performance requirements exceed PostgreSQL capabilities.

## Roadmap Implications

The recommended stack supports the following development phases:

**Phase 1**: Core Widget + Basic RAG
- Lit-based widget with Shadow DOM
- FastAPI backend with basic RAG pipeline
- Supabase for data storage
- Single LLM provider (OpenAI)

**Phase 2**: Multi-Tenancy + Admin Panel
- Row-level security implementation
- Next.js admin panel
- Authentication integration
- Multi-tenant billing

**Phase 3**: Scale Optimization
- Dedicated vector database (Pinecone)
- Advanced caching layer
- Multiple LLM provider support
- Enhanced rate limiting

This architecture provides a solid foundation that can evolve with product requirements while maintaining the core value proposition of easy integration and effective RAG-based responses.