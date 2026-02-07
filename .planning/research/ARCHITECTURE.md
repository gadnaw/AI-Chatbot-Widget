# Architecture Patterns for AI Chatbot Widget

**Project:** AI Chatbot Widget with RAG Pipeline
**Research Date:** February 7, 2026
**Confidence Level:** HIGH

## Executive Summary

This document outlines recommended architectural patterns for building an embeddable AI chatbot widget with RAG (Retrieval-Augmented Generation) capabilities. The architecture prioritizes **CSS/JS isolation** via iframe embedding, **multi-tenant isolation** via Supabase Row Level Security, and **cost-effective scaling** through edge-optimized API gateway patterns. The recommended approach uses a **widget-first architecture** where the embedded component is treated as a first-class product boundary, with all tenant-specific logic occurring server-side to minimize client-side complexity and security risks.

## Recommended Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOST WEBSITE                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   <script> Widget Loader                  │  │
│  │  - Widget initialization script                           │  │
│  │  - Configuration injection                                │  │
│  │  - Iframe creation and sizing                             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUD INFRASTRUCTURE                        │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │   CDN /    │    │    Edge     │    │   API Gateway      │   │
│  │   Static   │    │   Functions  │    │   (Rate Limiting) │   │
│  │   Assets   │    │   (Workers)  │    │   + Authentication │   │
│  └─────────────┘    └─────────────┘    └─────────────────────┘   │
│         │                  │                     │               │
│         └──────────────────┼─────────────────────┘               │
│                            ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   MICROSERVICES LAYER                        │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │ │
│  │  │  Auth    │  │  Tenant  │  │  RAG     │  │  Chat      │  │ │
│  │  │  Service │  │  Service │  │  Service │  │  Service   │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                      │
│                            ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  DATA LAYER                                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│  │  │  Supabase    │  │  Vector DB   │  │  Document Store  │  │ │
│  │  │  (PostgreSQL)│  │  (pgvector)  │  │  (S3/Cloudflare │  │ │
│  │  │  + RLS       │  │              │  │   R2 or S3)     │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology Recommendation |
|-----------|---------------|--------------------------|
| **Widget Loader** | Bootstrap the embed, create iframe, inject config | Vanilla JS (no framework dependencies) |
| **Widget Iframe** | Render chat UI, handle user interactions, message posting | React/Preact with Shadow DOM |
| **Edge Functions** | Request routing, tenant resolution, rate limiting | Cloudflare Workers or Netlify Edge |
| **Auth Service** | JWT issuance, validation, tenant claims | Supabase Auth with custom claims |
| **Tenant Service** | Tenant configuration, subscription management | Custom Node.js/Go service |
| **RAG Service** | Document processing, embedding generation, retrieval | LangChain.js with OpenAI embeddings |
| **Chat Service** | Conversation management, LLM integration | OpenAI Responses API |
| **Primary Database** | Structured data (users, conversations, configs) | Supabase (PostgreSQL with RLS) |
| **Vector Database** | Embedding storage and similarity search | pgvector extension |
| **Document Storage** | Raw documents, training content | Cloudflare R2 or AWS S3 |

## Widget Embedding Pattern

### Pattern Selection: Iframe with Shadow DOM

**Recommendation:** Use **iframe with Shadow DOM** as the primary embedding mechanism, with a lightweight script loader that creates and configures the iframe.

**Why iframe with Shadow DOM:**

1. **CSS Isolation:** Shadow DOM provides complete CSS encapsulation. Host site styles cannot affect widget styles, and widget styles cannot leak to host site. This is critical because host sites may use aggressive CSS frameworks or normalize/resets that would otherwise break the widget.

2. **JavaScript Isolation:** Iframes create a separate JavaScript execution context. The widget's global objects, event handlers, and potential errors remain isolated from the host page. This prevents widget bugs from crashing host sites and host site scripts from interfering with widget functionality.

3. **Event Boundary:** Iframes naturally boundary cross-origin communication through `postMessage`, requiring explicit message handling. This forces clean interface contracts between widget and backend.

4. **Browser Support:** Iframe is baseline widely available since July 2015, and Shadow DOM is baseline since 2021. No polyfills required for modern browsers.

5. **Security:** Iframes can be sandboxed with `sandbox` attribute to further restrict capabilities (disabled by default for widget functionality, but available for high-security deployments).

### Implementation Pattern

```javascript
// Widget Loader (host site embed)
(function() {
  // Configuration passed from host
  const config = window.CHAT_WIDGET_CONFIG || {
    tenantId: 'tenant_abc123',
    apiUrl: 'https://api.yourdomain.com',
    theme: 'auto'
  };
  
  // Create iframe with unique ID
  const iframe = document.createElement('iframe');
  iframe.id = 'ai-chatbot-widget-' + config.tenantId;
  iframe.src = `https://widget.yourdomain.com/embed/${config.tenantId}`;
  iframe.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 600px;
    border: none;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
    z-index: 999999;
  `;
  
  // Cross-origin communication setup
  window.addEventListener('message', handleWidgetMessage);
  iframe.contentWindow.postMessage({ type: 'INIT', config }, '*');
  
  document.body.appendChild(iframe);
})();
```

```javascript
// Widget Iframe (widget.yourdomain.com)
// Using Shadow DOM for style isolation
class ChatWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this.setupMessageHandling();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* Widget styles - completely isolated from host */
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
          border-radius: 12px;
          overflow: hidden;
        }
        /* ... more styles */
      </style>
      <div class="chat-container">
        <!-- Chat UI components -->
      </div>
    `;
  }
}
customElements.define('ai-chatbot-widget', ChatWidget);
```

### Script vs Iframe Trade-offs

| Aspect | Script Embed | Iframe Embed |
|--------|-------------|--------------|
| **CSS Isolation** | ❌ Requires CSS naming prefixes (BEM, CSS Modules) | ✅ Native via Shadow DOM |
| **JS Isolation** | ❌ Single global namespace, potential conflicts | ✅ Complete separation |
| **Performance** | ✅ Lower initial load | ❌ Additional document parse |
| **Flexibility** | ✅ Can render inline | ❌ Fixed position/dimensions |
| **Host Impact** | ❌ Can break host sites | ✅ Zero impact on host |
| **Responsive** | ✅ Fully flexible | ⚠️ Requires careful sizing |
| **Mobile** | ✅ Can adapt to container | ⚠️ Fixed positioning issues |

**Verdict:** Iframe wins for widget isolation requirements. The minor performance cost is acceptable given the isolation guarantees.

### Alternative: Web Components with Shadow DOM (No Iframe)

**Consider this pattern if:** Widget needs to render inline within host content (not as floating widget), or iframe positioning constraints are problematic.

```javascript
// Shadow DOM without iframe - for inline embedding
class ChatWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* Truly isolated CSS */
        :host { display: block; }
        .message { 
          padding: 12px 16px;
          border-radius: 8px;
          background: #f0f0f0;
          margin: 8px 0;
        }
      </style>
      <div class="chat-widget">
        <slot></slot>
      </div>
    `;
  }
}
```

**Limitation:** Shadow DOM alone does NOT provide JS isolation. Host site scripts can still access and manipulate the web component's internals. Only use without iframe if host trust is high.

## Multi-Tenant Isolation Architecture

### Database-Level Isolation: Row Level Security (RLS)

**Recommendation:** Use PostgreSQL Row Level Security (RLS) as the primary multi-tenant isolation mechanism. This provides defense-in-depth at the database layer, ensuring tenant data cannot leak even if application code has bugs.

**Why RLS over Application-Level Isolation:**

1. **Defense in Depth:** RLS is a Postgres primitive that applies to ALL queries, regardless of how they're executed. Even direct database connections (for debugging/admin) cannot bypass RLS policies.

2. **Simplicity:** Application code doesn't need to remember to add tenant filters to every query. RLS automatically injects the appropriate `WHERE tenant_id = ...` clause.

3. **Auditability:** RLS policies are stored in the database schema, making them version-controllable and reviewable.

4. **Performance:** RLS policies can be indexed for performance. Supabase benchmarks show properly indexed RLS adds <1ms overhead.

### RLS Implementation Pattern

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies that reference auth.jwt() claims
CREATE POLICY "Tenant can view own conversations"
ON conversations
FOR SELECT
TO authenticated
USING (
  auth.jwt() -> 'app_metadata' ->> 'tenant_id' = tenant_id
);

CREATE POLICY "Tenant can create conversations"
ON conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() -> 'app_metadata' ->> 'tenant_id' = tenant_id
);

-- Helper function for consistent tenant access
CREATE OR REPLACE FUNCTION private.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
END;
$$;
```

### Tenant Context Propagation

```typescript
// API Gateway / Edge Function
async function handleRequest(request: Request): Promise<Response> {
  const apiKey = request.headers.get('X-API-Key');
  
  // Validate API key and extract tenant
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, subscription_tier')
    .eq('api_key', apiKey)
    .single();
  
  if (error || !tenant) {
    return new Response('Invalid API key', { status: 401 });
  }
  
  // Create JWT with tenant claim
  const jwt = await createJWT({
    sub: tenant.id,  // user ID
    app_metadata: {
      tenant_id: tenant.id,
      subscription_tier: tenant.subscription_tier
    }
  });
  
  // Forward request with tenant-scoped JWT
  return forwardToBackend(request, jwt);
}
```

### Isolation Levels Comparison

| Level | Implementation | Pros | Cons |
|-------|---------------|------|------|
| **Database** | RLS policies per table | Defense in depth, cannot bypass | Requires PostgreSQL |
| **Schema** | Separate schemas per tenant | Complete isolation | Complex migrations |
| **Database** | Separate databases per tenant | Maximum isolation | Operational overhead |
| **Application** | tenant_id on all queries | Simple implementation | Bug risk if forgotten |
| **Row** | tenant_id column + RLS | Balanced approach | Requires discipline |

**Verdict:** Use **RLS at database level** with **application-level tenant_id** as the recommended pattern.

## RAG Pipeline Architecture

### RAG Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     RAG PIPELINE ARCHITECTURE                    │
│                                                                   │
│  ┌─────────────┐                                                 │
│  │   Admin     │    Upload/Paste Documents                       │
│  │   Panel     │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              DOCUMENT PROCESSING SERVICE                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │   Ingestion  │  │   Parsing    │  │   Chunking      │  │  │
│  │  │   Queue      │  │   (PDF/DOCX) │  │   (Overlap)     │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              EMBEDDING GENERATION                          │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │  OpenAI text-embedding-3-small (1536 dimensions)    │   │  │
│  │  │  - Cost-effective ($0.02/1M tokens)                │   │  │
│  │  │  - Good quality/speed ratio                         │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              VECTOR STORAGE (pgvector)                     │  │
│  │                                                            │  │
│  │  CREATE TABLE document_embeddings (                        │  │
│  │    id UUID PRIMARY KEY,                                   │  │
│  │    tenant_id UUID NOT NULL,                               │  │
│  │    document_id UUID NOT NULL,                             │  │
│  │    chunk_text TEXT NOT NULL,                              │  │
│  │    embedding vector(1536),                                │  │
│  │    created_at TIMESTAMPTZ DEFAULT NOW()                    │  │
│  │  );                                                       │  │
│  │                                                            │  │
│  │  CREATE INDEX ON document_embeddings                       │  │
│  │    USING ivfflat (embedding vector_cosine_ops)             │  │
│  │    WHERE tenant_id = 'tenant_uuid';                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              CHAT QUERY FLOW                               │  │
│  │                                                            │  │
│  │  1. User message → Embed query                             │  │
│  │  2. Search pgvector for similar chunks                     │  │
│  │  3. Retrieve top K relevant chunks (K=5-10)                │  │
│  │  4. Construct prompt with context                         │  │
│  │  5. Send to LLM with system instruction                   │  │
│  │  6. Stream response to widget                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### RAG Implementation Options

#### Option 1: OpenAI Responses API (Recommended)

**Why:** The new OpenAI Responses API (replacing Assistants API) provides built-in file search and retrieval, simplifying infrastructure.

```typescript
// Using OpenAI Responses API with file search
const response = await openai.responses.create({
  model: 'gpt-4o',
  input: [
    { role: 'user', content: userMessage }
  ],
  tools: [
    {
      type: 'file_search',
      vector_store_ids: [tenant.vectorStoreId],
      max_num_results: 10
    }
  ],
  instructions: `
    You are a helpful assistant answering questions about ${tenant.name}.
    Use the retrieved documents to ground your answers.
    If you cannot find relevant information, say so clearly.
    Always cite your sources when providing specific information.
  `
});
```

**Benefits:**
- Managed vector storage (OpenAI handles it)
- No need for separate vector database
- Simpler architecture
- Automatic retrieval and prompt construction

**Drawbacks:**
- Less control over retrieval strategy
- Higher per-query latency
- Vendor lock-in considerations

#### Option 2: Custom RAG with pgvector

**Why:** More control, cost optimization, and independence from LLM vendor.

```typescript
// Custom RAG implementation
async function handleChatMessage(tenantId: string, message: string) {
  // 1. Embed the query
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: message
  });
  
  // 2. Search pgvector for similar chunks
  const { data: similarChunks } = await supabase.rpc('search_embeddings', {
    query_embedding: embedding.data[0].embedding,
    match_threshold: 0.7,
    match_count: 5,
    tenant_id: tenantId
  });
  
  // 3. Construct context
  const context = similarChunks
    .map(chunk => `[Source ${chunk.document_id}]: ${chunk.chunk_text}`)
    .join('\n\n');
  
  // 4. Send to LLM
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: `Answer based on context. Context:\n${context}` },
      { role: 'user', content: message }
    ]
  });
  
  return completion.choices[0].message;
}
```

**Benefits:**
- Full control over retrieval strategy
- Can optimize for cost/speed
- Independent of LLM vendor
- Can mix embedding providers

**Drawbacks:**
- More infrastructure to manage
- Requires pgvector setup
- More complex implementation

### Document Chunking Strategy

**Recommendation:** Use semantic chunking with overlap for optimal retrieval.

```typescript
interface DocumentChunk {
  id: string;
  tenantId: string;
  documentId: string;
  chunkText: string;
  embedding: number[];
  metadata: {
    sourceUrl?: string;
    title?: string;
    chunkIndex: number;
    charStart: number;
    charEnd: number;
  };
}

function chunkDocument(text: string, chunkSize: number = 1000): string[] {
  // Split by sentences first (naive approach, improve with NLP)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      // Push current chunk and start new one with overlap
      chunks.push(currentChunk.trim());
      // Start new chunk with overlap (last 200 chars of previous)
      currentChunk = currentChunk.slice(-200) + sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
```

## Data Flow and State Management

### Widget State Management

**Recommendation:** Use a lightweight state machine pattern within the widget, with server-side authoritative state for multi-device consistency.

```typescript
// Widget State Machine
interface ChatState {
  status: 'idle' | 'loading' | 'streaming' | 'error';
  messages: Message[];
  currentStreamingMessage: string | null;
  tenantConfig: TenantConfig | null;
  error: string | null;
}

type ChatEvent =
  | { type: 'SEND_MESSAGE'; payload: string }
  | { type: 'RECEIVE_MESSAGE'; payload: Message }
  | { type: 'STREAM_TOKEN'; payload: string }
  | { type: 'STREAM_COMPLETE' }
  | { type: 'ERROR'; payload: string }
  | { type: 'RETRY' };

// Simple state reducer
function chatReducer(state: ChatState, event: ChatEvent): ChatState {
  switch (event.type) {
    case 'SEND_MESSAGE':
      return {
        ...state,
        status: 'loading',
        messages: [...state.messages, {
          id: crypto.randomUUID(),
          role: 'user',
          content: event.payload,
          timestamp: new Date()
        }]
      };
    
    case 'RECEIVE_MESSAGE':
      return {
        ...state,
        status: 'streaming',
        messages: [...state.messages, event.payload]
      };
    
    case 'STREAM_TOKEN':
      return {
        ...state,
        currentStreamingMessage: (state.currentStreamingMessage || '') + event.payload
      };
    
    case 'STREAM_COMPLETE':
      return {
        ...state,
        status: 'idle',
        messages: state.messages.map(msg =>
          msg.id === state.currentStreamingMessage?.id
            ? { ...msg, content: state.currentStreamingMessage }
            : msg
        ),
        currentStreamingMessage: null
      };
    
    case 'ERROR':
      return { ...state, status: 'error', error: event.payload };
    
    case 'RETRY':
      return { ...state, status: 'idle', error: null };
  }
}
```

### Message Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MESSAGE FLOW                                 │
│                                                                   │
│  USER ──► WIDGET ──► IFRAME ──► POSTMESSAGE ──► WINDOW LISTENER  │
│    │                                                      │       │
│    │ (UI update) ◄───────────────────────────────────────┘       │
│    │                                                      │       │
│    ▼                                                      ▼       │
│  API GATEWAY ──► AUTH CHECK ──► CHAT SERVICE ──► LLM API         │
│         │                                                      │
│         ▼                                                      │
│  DATABASE ──► RLS ENFORCEMENT ──► SAVE MESSAGE                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Server-Side vs Client-Side State

| State Type | Location | Reasoning |
|------------|----------|-----------|
| **Conversation History** | Server + Local Storage | Multi-device continuity, backup, RLS enforcement |
| **Widget UI State** | Client (iframe) | Fast UI updates, no server round-trip |
| **Tenant Configuration** | Server (cached client) | Single source of truth, dynamic updates |
| **Authentication** | Server JWT + Client cookie | Security, session management |
| **Draft Messages** | Local Storage | Persist across reloads |

### Offline-First Considerations

**Recommendation:** Implement optimistic updates with local-first message storage.

```typescript
// Optimistic message sending
async function sendMessage(content: string) {
  const tempId = crypto.randomUUID();
  
  // 1. Immediately show in UI (optimistic)
  dispatch({ type: 'SEND_MESSAGE', payload: content });
  
  // 2. Persist locally (IndexedDB)
  await saveMessageLocally({
    id: tempId,
    content,
    status: 'sending',
    createdAt: new Date()
  });
  
  try {
    // 3. Send to server
    const response = await api.post('/chat', { message: content });
    
    // 4. Update local with server ID
    await updateLocalMessage(tempId, { 
      id: response.id, 
      status: 'sent' 
    });
    
  } catch (error) {
    // 5. Handle failure - show retry option
    await updateLocalMessage(tempId, { status: 'failed' });
    dispatch({ type: 'ERROR', payload: 'Failed to send message' });
  }
}
```

## Scalability Considerations

### Scaling Tiers

#### Tier 1: Startup (0-100 Tenants)

| Component | Scale Strategy |
|-----------|----------------|
| **Database** | Supabase Pro ($25/mo) - Handles ~10K concurrent connections |
| **Compute** | Vercel/Netlify Serverless Functions |
| **Vector Storage** | OpenAI Vector Stores (managed) or pgvector on Pro |
| **CDN** | Vercel/Netlify built-in CDN |

#### Tier 2: Growth (100-10,000 Tenants)

| Component | Scale Strategy |
|-----------|----------------|
| **Database** | Supabase Pro with read replicas, connection pooling (PgBouncer) |
| **Compute** | Kubernetes or managed containers (AWS ECS, GCP Cloud Run) |
| **Vector Storage** | Dedicated pgvector instance, consider Pinecone for scale |
| **CDN + Edge** | Cloudflare Enterprise or Fastly |

#### Tier 3: Enterprise (10,000+ Tenants)

| Component | Scale Strategy |
|-----------|----------------|
| **Database** | Sharded PostgreSQL, or dedicated database per tenant |
| **Compute** | Kubernetes autoscaling, multi-region deployment |
| **Vector Storage** | Dedicated vector DB clusters per tenant or pool |
| **Architecture** | Microservices decomposition |

### Cost Optimization Strategies

#### Token Optimization

```typescript
// Context window optimization
function buildOptimizedPrompt(
  systemPrompt: string,
  conversationHistory: Message[],
  retrievedContext: RetrievedChunk[]
): Message[] {
  const maxTokens = 12000; // Reserve 4K for completion
  const historyTokens = estimateTokens(conversationHistory);
  const contextTokens = estimateTokens(retrievedContext.map(c => c.text));
  const systemTokens = estimateTokens(systemPrompt);
  
  // If over budget, truncate oldest history first
  let truncatedHistory = conversationHistory;
  if (historyTokens + contextTokens + systemTokens > maxTokens) {
    const excessTokens = (historyTokens + contextTokens + systemTokens) - maxTokens;
    truncatedHistory = truncateFromMiddle(conversationHistory, excessTokens);
  }
  
  return [
    { role: 'system', content: systemPrompt },
    ...truncatedHistory,
    { role: 'assistant', content: 'Based on the documents, ' } // Prompt engineering
  ];
}
```

#### Caching Strategy

| Cache Level | Cache For | TTL | Technology |
|-------------|----------|-----|------------|
| **CDN Static** | Widget JS/CSS, fonts | 1 year | Vercel/Netlify CDN |
| **Edge Config** | Tenant configuration | 5 min | Cloudflare Workers KV |
| **Response** | Similar queries | 1 hour | Redis (Upstash) |
| **Embeddings** | Document chunks | 30 days | pgvector (already persistent) |
| **LLM Responses** | Exact question matches | 7 days | Supabase with semantic caching |

### Rate Limiting Architecture

```typescript
// Edge-based rate limiting (Cloudflare Workers)
export default {
  async fetch(request: Request): Promise<Response> {
    const tenantId = await getTenantId(request);
    const rateLimitKey = `ratelimit:${tenantId}`;
    
    // Check rate limit (100 requests/minute per tenant)
    const { success, limit, remaining } = await checkRateLimit(
      rateLimitKey,
      limit = 100,
      window = 60 // seconds
    );
    
    // Add rate limit headers
    const response = await handleRequest(request);
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    
    if (!success) {
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    return response;
  }
};
```

## Integration Patterns

### Widget-Backend Communication

**Pattern:** Use typed message passing through postMessage with versioned schemas.

```typescript
// Message schema (versioned for backwards compatibility)
interface WidgetMessage {
  version: '1.0';
  type: WidgetMessageType;
  payload: Record<string, unknown>;
  timestamp: string;
}

type WidgetMessageType =
  | 'INIT'           // Widget → Host: Request initialization config
  | 'INIT_CONFIG'    // Host → Widget: Send tenant config
  | 'CHAT_MESSAGE'   // Widget → Host: User sent message
  | 'CHAT_RESPONSE'  // Host → Widget: Streaming response
  | 'CHAT_COMPLETE'  // Host → Widget: Response finished
  | 'ERROR'          // Bidirectional: Error occurred
  | 'TOGGLE'         // Widget → Host: Widget toggled open/close
  | 'READY';         // Widget → Host: Widget fully loaded

// Message handler (widget side)
function setupMessageHandler() {
  window.addEventListener('message', (event) => {
    // Validate origin
    if (!isTrustedOrigin(event.origin)) {
      console.warn('Ignored message from untrusted origin');
      return;
    }
    
    const message: WidgetMessage = event.data;
    
    switch (message.type) {
      case 'INIT_CONFIG':
        initializeWidget(message.payload);
        break;
      case 'CHAT_RESPONSE':
        streamToken(message.payload.token);
        break;
      case 'CHAT_COMPLETE':
        finalizeMessage();
        break;
      case 'ERROR':
        handleError(message.payload);
        break;
    }
  });
}

// Message sender (widget side)
function sendMessage(type: WidgetMessageType, payload: Record<string, unknown>) {
  window.parent.postMessage({
    version: '1.0',
    type,
    payload,
    timestamp: new Date().toISOString()
  }, '*'); // Use specific origin in production
}
```

### Admin Panel Integration

**Pattern:** Separate admin panel application with elevated permissions, using the same backend services.

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN PANEL ARCHITECTURE                     │
│                                                                   │
│  ┌─────────────────┐        ┌─────────────────────────────────┐   │
│  │   React SPA     │───────►│   Admin API Gateway              │   │
│  │   (Next.js)     │        │   (Role-based access control)   │   │
│  └─────────────────┘        └─────────────────────────────────┘   │
│                                    │                              │
│                                    ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                  ADMIN MICROSERVICES                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │  Tenant      │  │  Document    │  │  Analytics       │   │  │
│  │  │  Management  │  │  Upload      │  │  & Reporting     │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                    │                              │
│                           Same shared data layer                  │
└─────────────────────────────────────────────────────────────────┘
```

### Webhook Integration for External Systems

```typescript
// Event types for webhook delivery
interface WebhookEvent {
  tenantId: string;
  eventType: 'conversation.created' | 'conversation.resolved' | 'document.processed';
  timestamp: string;
  data: Record<string, unknown>;
}

async function dispatchWebhook(tenant: Tenant, event: WebhookEvent) {
  if (!tenant.webhookUrl) return;
  
  // Verify webhook signature
  const signature = signWebhook(event, tenant.webhookSecret);
  
  await fetch(tenant.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Tenant': tenant.id
    },
    body: JSON.stringify(event)
  });
}
```

## Trade-offs and Decision Framework

### Key Architectural Decisions

#### Decision 1: Widget Embedding Approach

| Option | Isolation | Performance | Flexibility | Complexity |
|--------|-----------|-------------|-------------|------------|
| **Script + Namespaced CSS** | Low | High | High | Low |
| **Web Component + Shadow DOM** | Medium | High | High | Medium |
| **Iframe + Shadow DOM** | **High** | Medium | Medium | **Medium** |
| **Shadow DOM Only** | Medium | High | High | Medium |

**Decision:** Iframe + Shadow DOM (Winner)
**Rationale:** Your constraint requires "clean CSS/JS isolation from host sites." Only iframe provides true JS isolation. Shadow DOM provides CSS isolation. The performance cost is acceptable.

#### Decision 2: RAG Backend

| Option | Control | Cost | Complexity | Latency |
|--------|---------|------|------------|---------|
| **OpenAI File Search** | Low | Variable | **Low** | Medium |
| **Custom pgvector** | **High** | **Low** | Medium | **Low** |
| **Pinecone** | Medium | Medium | Low | Low |
| **Weaviate** | High | Medium | High | Medium |

**Decision:** Start with **OpenAI File Search** (MVP), migrate to **custom pgvector** (scale)
**Rationale:** OpenAI File Search has lowest implementation complexity for MVP. pgvector provides cost control and flexibility at scale.

#### Decision 3: Multi-Tenancy Isolation

| Option | Security | Performance | Operational |
|--------|----------|-------------|-------------|
| **Application-Level** | Medium | **High** | Simple |
| **RLS + Application** | **High** | High | Medium |
| **Schema Isolation** | **High** | Medium | Complex |
| Database Isolation | **Highest** | Medium | Very Complex |

**Decision:** RLS + Application-Level (Winner)
**Rationale:** Defense-in-depth with RLS at database layer ensures tenant isolation even if application has bugs. Supabase makes RLS easy to implement and audit.

#### Decision 4: Deployment Platform

| Option | Cost | DX | Scaling | Vendor Lock |
|--------|------|-----|---------|-------------|
| **Vercel** | Low | **Excellent** | Good | Medium |
| **AWS (ECS/Lambda)** | Medium | Medium | **Excellent** | Low |
| **Kubernetes** | Medium | Low | **Excellent** | **None** |
| **Supabase + Edge** | **Low** | Good | Good | Medium |

**Decision:** **Supabase + Vercel/Netlify** (MVP), **Kubernetes** (Scale)
**Rationale:** For MVP, Supabase provides database + auth, Vercel provides edge functions + CDN. Splitting services across platforms is acceptable given managed nature. At scale, consider Kubernetes for better multi-region control.

## Anti-Patterns to Avoid

### 1. Client-Side Tenant Isolation

**Anti-Pattern:** Storing tenant ID only in JavaScript variables and filtering in frontend.

```javascript
// AVOID: Frontend-only filtering
async function getConversations() {
  const all = await api.get('/conversations');
  return all.filter(c => c.tenantId === currentTenantId); // Insecure!
}
```

**Why:** Any user can modify JavaScript and access other tenants' data. Always enforce isolation at the database layer.

### 2. Over-Embedding Documents

**Anti-Pattern:** Embedding every paragraph/sentence at high cost.

**Impact:** Excessive API costs, slower retrieval, lower relevance.

**Solution:** Use semantic chunking with reasonable chunk sizes (800-1200 chars), batch embedding operations.

### 3. Missing Rate Limits on Widget

**Anti-Pattern:** No rate limiting on chat API endpoints.

**Impact:** One malicious tenant can cost thousands in LLM API fees.

**Solution:** Implement tiered rate limits at the edge (100 req/min basic, 1000 req/min enterprise).

### 4. Iframe Without Resize Observer

**Anti-Pattern:** Fixed-height iframe that doesn't adapt to content.

**Impact:** Poor UX on mobile, scrolling issues, black space.

**Solution:** Use ResizeObserver to auto-size iframe to content height.

```typescript
// Widget (iframe) side
const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    window.parent.postMessage({
      type: 'RESIZE',
      height: entry.contentRect.height
    }, '*');
  }
});

resizeObserver.observe(document.body);
```

### 5. Storing API Keys in Client Code

**Anti-Pattern:** Embedding LLM API keys in widget JavaScript.

**Impact:** Complete compromise of LLM budget.

**Solution:** All LLM calls must go through your backend. Widget never sees LLM API keys.

## Sources

- **MDN Web Docs**: iframe element documentation, Shadow DOM specification
- **OpenAI API Reference**: Responses API, file search, rate limits
- **Supabase Documentation**: Row Level Security, Auth helpers, Performance optimization
- **Cloudflare Developers**: Edge Functions, Workers KV, Rate limiting
- **AWS Well-Architected Framework**: Security, Reliability, Performance Efficiency pillars
- **LangChain.js Documentation**: RAG pipeline patterns, vector stores
- **PostgreSQL Documentation**: Row Level Security policies, pgvector extension

## Research Confidence

| Area | Confidence | Notes |
|------|------------|-------|
| Widget Embedding Patterns | HIGH | Standard web platform APIs, well-documented |
| Multi-Tenant Isolation | HIGH | RLS is mature PostgreSQL feature |
| RAG Pipeline Architecture | MEDIUM | Multiple viable approaches, depends on scale |
| State Management | HIGH | Established patterns, React ecosystem |
| Scalability Considerations | MEDIUM | General patterns, specific metrics need monitoring |

## Open Questions for Future Research

1. **Embedding Strategy:** Optimal chunk size and overlap for different document types (PDF vs HTML vs Markdown)
2. **Evaluation Metrics:** How to measure RAG quality - retrieval relevance vs response accuracy
3. **Multi-Modal RAG:** Support for images and documents beyond text
4. **Streaming Architecture:** Optimal approach for handling streaming LLM responses at scale
5. **Cost Optimization:** Hybrid approach using cheaper embedding models for some content
