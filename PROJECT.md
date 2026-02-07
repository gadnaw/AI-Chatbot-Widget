# AI Customer Support Chatbot (Embeddable Widget)

## Overview

A customer support chatbot trained on a business's own content (FAQ, docs, product info) that can be embedded on any website via a single `<script>` tag. Includes an admin panel for managing training data, viewing conversations, and tracking analytics. This is the most common AI service on Upwork's Project Catalog -- businesses want custom chatbots that know their specific content and can be dropped onto their existing websites.

## Goals

- Demonstrate the most commonly requested AI service on Upwork (embeddable chatbot)
- Show ability to build production-ready embeddable widgets (iframe isolation, CORS, CSP)
- Prove RAG at scale with Pinecone (managed vector DB for production workloads)
- Demonstrate admin panel with analytics and content management
- Target Upwork job categories: AI Chatbot Development, Customer Support Automation, Widget Development, Project Catalog

## Tech Stack

- **Backend:** Next.js 14+ API routes, TypeScript
- **Widget Frontend:** React (compiled to standalone JS bundle for embedding)
- **Admin Panel:** Next.js App Router, Tailwind CSS, shadcn/ui
- **AI SDK:** Vercel AI SDK (streaming responses in widget)
- **LLM:** OpenAI GPT-4o-mini (high volume chatbot -- cost matters), GPT-4o available for complex queries
- **Embeddings:** OpenAI text-embedding-3-small
- **Vector Database:** Pinecone (managed, production-grade -- demonstrates scaling beyond pgvector)
- **Auth (admin):** Supabase Auth (for admin panel access)
- **Database:** Supabase PostgreSQL (conversation storage, analytics, customer management)
- **Deployment:** Vercel

## Components

### Chat Widget (embedded on customer's website)
- **Delivery:** Single `<script>` tag with `data-key` attribute for customer identification
- **UI:** Floating chat bubble (bottom-right), expandable to chat window
- **Isolation:** Widget renders inside a sandboxed iframe -- CSS/JS isolated from host site
- **Behavior:** Streaming AI responses, conversation thread, "powered by" branding
- **Responsive:** Adapts to mobile/desktop on the host site
- **Initialization:**
  ```html
  <script src="https://your-app.com/widget.js" data-key="cust_abc123"></script>
  ```

### Admin Panel (`/admin`)

#### Dashboard (`/admin`)
- Total conversations, messages, average satisfaction rating
- Conversations per day chart
- Top unanswered questions (queries where AI had low confidence)
- Active conversations count

#### Training Data (`/admin/training`)
- Upload sources: URLs (website scraping), PDFs, plain text
- View all indexed content with chunk counts
- Delete/re-index individual sources
- Test queries: ask a question and see which chunks are retrieved (debug tool)

#### Conversations (`/admin/conversations`)
- List of all widget conversations with timestamps
- Click to view full conversation thread
- Flag conversations for review
- Export conversations as CSV

#### Settings (`/admin/settings`)
- Widget appearance: primary color, bubble position, welcome message
- AI settings: response style (formal/casual), fallback message, max response length
- Embed code generator: copy the `<script>` tag
- API key management: regenerate widget API key

### REST API (`/api/v1/`)
- `POST /api/v1/chat` -- send message, receive streaming response (widget uses this)
- `GET /api/v1/conversations` -- list conversations (admin)
- `POST /api/v1/sources` -- add training source (admin)
- `DELETE /api/v1/sources/:id` -- remove training source (admin)
- All endpoints authenticated: widget uses `data-key`, admin uses JWT

## Pages / Screens

### Widget (embedded)
- **What user sees:** Floating chat bubble -> expandable chat window
- **Key interactions:** Type message, receive streaming AI response, view conversation history within session
- **Data displayed:** AI responses with optional source links

### Admin Dashboard (`/admin`)
- **Route:** `/admin`
- **What user sees:** Key metrics, conversation trends, top unanswered questions
- **Key interactions:** Click through to conversations, identify content gaps

### Training Data Page (`/admin/training`)
- **Route:** `/admin/training`
- **What user sees:** List of all training sources with status and chunk counts
- **Key interactions:** Upload URL/PDF/text, delete source, re-index, test queries

### Conversations Page (`/admin/conversations`)
- **Route:** `/admin/conversations`
- **What user sees:** Conversation list with preview, click for full thread
- **Key interactions:** Review conversations, flag for follow-up, export

### Settings Page (`/admin/settings`)
- **Route:** `/admin/settings`
- **What user sees:** Widget customization, AI behavior, embed code
- **Key interactions:** Customize widget appearance, copy embed code, regenerate API key

## Features

### Must-Have
- Embeddable chat widget via `<script>` tag with iframe isolation
- RAG pipeline: ingest business content -> chunk -> embed -> store in Pinecone -> retrieve on query
- Streaming AI responses in the widget
- Admin panel with conversation viewing and training data management
- Multiple source types: URL scraping, PDF upload, plain text
- Widget customization: colors, welcome message, position
- Conversation storage and history
- API key authentication for widget

### Nice-to-Have
- Multi-language support (detect user language, respond in same language)
- Suggested questions (based on common queries)
- Human handoff ("Talk to a human" escalation button)
- Email capture (collect visitor email before or during chat)
- Analytics: response time, satisfaction, deflection rate
- A/B testing widget welcome messages

## Data Model

### customers (businesses using the chatbot)
- `id` (uuid, PK)
- `name` (text) -- business name
- `api_key` (text, unique) -- widget authentication key
- `widget_config` (jsonb) -- colors, position, welcome message, response style
- `plan` (text) -- 'free' | 'pro'
- `created_at` (timestamptz)

### sources (training data)
- `id` (uuid, PK)
- `customer_id` (uuid, FK -> customers.id)
- `type` (text) -- 'url' | 'pdf' | 'text'
- `name` (text) -- URL, filename, or label
- `content_raw` (text) -- raw extracted text
- `chunk_count` (integer)
- `status` (text) -- 'processing' | 'ready' | 'error'
- `created_at` (timestamptz)

### conversations
- `id` (uuid, PK)
- `customer_id` (uuid, FK -> customers.id)
- `visitor_id` (text) -- anonymous visitor identifier (cookie-based)
- `visitor_email` (text, nullable)
- `started_at` (timestamptz)
- `last_message_at` (timestamptz)
- `message_count` (integer)

### messages
- `id` (uuid, PK)
- `conversation_id` (uuid, FK -> conversations.id)
- `role` (text) -- 'user' | 'assistant'
- `content` (text)
- `source_refs` (jsonb, nullable) -- Pinecone chunk IDs used
- `created_at` (timestamptz)

### RLS Policies
- Customer admin sees only their own sources, conversations, and messages
- Widget API key scopes all queries to the owning customer's data
- Pinecone namespace per customer (logical isolation)

## AI Architecture

### RAG Pipeline with Pinecone
1. **Source Ingestion:**
   - URL: Fetch page content, extract text (cheerio/puppeteer)
   - PDF: Parse via LangChain.js PDF loader
   - Text: Direct input
2. **Chunking:** RecursiveCharacterTextSplitter (500 tokens, 50 overlap)
3. **Embedding:** text-embedding-3-small (1536 dimensions)
4. **Storage:** Pinecone index with namespace per customer (e.g., namespace: `cust_abc123`)
5. **Query:** Embed user question -> search customer's Pinecone namespace (top-k=5, threshold=0.7) -> retrieve chunks
6. **Generation:** System prompt + retrieved chunks + question -> GPT-4o-mini streaming response

### Why Pinecone Instead of pgvector
- **Demo purpose:** Shows you can work with both pgvector (A1/A2) and Pinecone -- breadth of vector DB experience
- **Production rationale:** Managed service with built-in scaling, namespace isolation per customer, production-grade filtering. For a multi-customer chatbot serving hundreds of businesses, Pinecone scales better than pgvector.
- **Namespace isolation:** Each customer's data lives in a separate Pinecone namespace -- clean multi-tenant vector isolation without custom RLS on vectors.

### Widget Embed Architecture
1. Host site loads `widget.js` via `<script>` tag
2. Script creates a sandboxed iframe pointing to `https://your-app.com/widget/{api_key}`
3. Iframe renders the React chat UI (isolated CSS/JS -- no host site conflicts)
4. Chat messages sent via `POST /api/v1/chat` with api_key header
5. Streaming response via Server-Sent Events through the iframe
6. `postMessage` API used for widget-to-host communication (e.g., resize events)

### Prompt Design
- **System prompt:** "You are a helpful customer support assistant for {business_name}. Answer questions ONLY based on the provided context from the business's knowledge base. If you cannot find the answer in the provided context, say 'I don't have information about that. Would you like to speak with our team?' Be friendly, concise, and professional."
- **Customizable tone:** Admin can set response style (formal/casual) which adjusts the system prompt
- **Fallback:** When no relevant chunks found (similarity below threshold), return configurable fallback message instead of hallucinating

### Cost Estimation
- Pinecone: Free tier (1 index, 100k vectors) covers demo + small customers. Paid: $70/mo for production.
- Per query: embedding ~$0.00002 + GPT-4o-mini ~$0.0003 = ~$0.0004 total
- At 10,000 queries/day across all customers: ~$4/day = ~$120/month
- Per customer (100 queries/day): ~$1.20/month AI cost

## Security Requirements

- **Widget auth:** API key in `data-key` attribute, validated server-side on every request
- **Admin auth:** Supabase Auth with email/password for admin panel
- **CORS:** API allows requests from any origin (widget is embedded on customer sites) but validates api_key
- **CSP considerations:** Widget uses iframe isolation. Documentation must instruct host sites to allow your domain in frame-src.
- **Rate limiting:** Per-api_key rate limiting to prevent abuse (100 requests/minute default)
- **Input sanitization:** User messages sanitized before storage and before sending to AI
- **No PII in Pinecone:** Only content chunks stored in Pinecone, no user data

## Key Technical Decisions

- **Pinecone over pgvector:** Multi-customer SaaS needs per-customer isolation at scale. Pinecone namespaces provide this cleanly. Also demonstrates portfolio breadth (pgvector in A1/A2, Pinecone in A4).
- **Iframe over direct DOM injection:** Iframe isolates widget CSS/JS from the host site completely. No style conflicts, no JS conflicts. The widget looks identical on every site.
- **GPT-4o-mini over GPT-4o:** Customer support queries are typically straightforward (FAQ-style). Mini handles these well at 16x lower cost. Critical for multi-customer economics.
- **Separate React build for widget:** Widget JS bundle is built separately from the Next.js admin panel. Keeps the embed script small (~50-100KB) and self-contained.
- **Server-Sent Events over WebSocket:** SSE is simpler, works through more proxies/firewalls, and is perfect for the one-way streaming pattern of AI responses.

## Upwork Positioning

- **Project Catalog listings supported:** "Custom AI Chatbot for Your Website", "AI Customer Support Bot", "Embeddable Chat Widget"
- **Price tiers enabled:** $1,500-3,000 (basic chatbot), $3,000-8,000 (custom chatbot with admin panel), $8,000-20,000 (enterprise with analytics + integrations)
- **Key selling points for proposals:**
  - "One-line embed -- add to any website with a single script tag, no code changes needed"
  - "Trained on YOUR content -- answers from your docs and FAQ, never hallucinated generic responses"
  - "Admin panel to manage content, view conversations, and track what customers are asking"
  - "Production-ready with Pinecone vector search -- scales to millions of queries"
  - This is the MOST listed AI service on Upwork's Project Catalog

## Build Estimate

- **Estimated effort:** 1-2 days with Claude Code
- **Priority:** #3 -- the most common Project Catalog service. Building this early maximizes visibility on Upwork's Project Catalog listings.
- **Build order rationale:** After A1 (core RAG) and A2 (healthcare RAG), this applies RAG to a new delivery format (embeddable widget) with a different vector DB (Pinecone). Shows the same AI skills in a commercially popular package.
