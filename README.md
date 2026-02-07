# A4 AI Chatbot Widget

An embeddable AI customer support chatbot trained on your business content. Drop it onto any website with a single script tag.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What This Is

A4 is a multi-tenant SaaS chatbot platform where businesses can:

- **Train on their content** — Upload PDFs, URLs, or paste text to create a chatbot that knows your business
- **Embed anywhere** — Single script tag works on any website, no code changes required
- **Manage everything** — Admin panel for training data, conversations, and widget appearance
- **Control costs** — Built-in rate limiting and usage tracking per tenant

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-org/a4-ai-chatbot-widget.git
cd a4-ai-chatbot-widget

# Install backend dependencies
cd chatbot-backend
pip install -r requirements.txt

# Install admin panel dependencies
cd ../app
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `OPENAI_API_KEY` — OpenAI API key for embeddings and chat
- `REDIS_URL` — Redis connection string (for rate limiting)

### 3. Start Development Services

```bash
# Start all services with Docker Compose
docker-compose up -d

# Services available at:
# - Backend API: http://localhost:8000
# - Admin Panel: http://localhost:3000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### 4. Run the Application

```bash
# Backend (from chatbot-backend directory)
uvicorn app.main:app --reload --port 8000

# Admin Panel (from app directory)
npm run dev
```

## Usage

### Embed the Widget

Add this to any website's HTML:

```html
<script
  src="https://your-domain.com/widget.js"
  data-api-key="YOUR_TENANT_API_KEY"
></script>
```

The widget appears as a floating chat bubble in the bottom-right corner.

### Admin Panel

Access the admin panel at `http://localhost:3000/admin`:

| Section | Purpose |
|---------|---------|
| **Dashboard** | Overview metrics, usage stats, quick actions |
| **Training** | Upload documents (PDF, URL, text) for RAG |
| **Conversations** | View and manage customer chat threads |
| **Settings** | Customize widget appearance, manage API keys |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Customer Website                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  <script src="widget.js" data-key="..."></script> │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│                 ┌─────────────────┐                     │
│                 │   Widget Iframe │ ← Shadow DOM      │
│                 │  (chat UI)      │   isolated        │
│                 └────────┬────────┘                     │
│                          │ postMessage                  │
│                          ▼                              │
│                 ┌─────────────────┐                     │
│                 │  FastAPI Backend │                     │
│                 │  (port 8000)    │                     │
│                 └────────┬────────┘                     │
│                          │                              │
│         ┌────────────────┼────────────────┐            │
│         ▼                ▼                ▼            │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐    │
│  │ PostgreSQL │   │   pgvector │   │   Redis    │    │
│  │ (primary)  │   │ (embeddings│   │ (rate limit│    │
│  └────────────┘   └────────────┘   └────────────┘    │
│                          │                              │
│                          ▼                              │
│                 ┌─────────────────┐                     │
│                 │   OpenAI API    │  ← GPT-4o-mini     │
│                 │                 │    text-embedding-3 │
│                 └─────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Widget** | Lit + TypeScript | Web components with Shadow DOM isolation |
| **Backend** | FastAPI + Python 3.11 | Async API server, RAG pipeline |
| **Admin** | Next.js 14 + React 18 | Admin dashboard UI |
| **Database** | Supabase PostgreSQL | Primary storage, auth, RLS |
| **Vector DB** | pgvector | Embedding storage and search |
| **AI** | OpenAI GPT-4o-mini | Chat completions and embeddings |
| **Caching** | Redis 7 | Rate limiting, session caching |
| **Styling** | Tailwind CSS | Admin panel styling |

### Key Features

**Embeddable Widget**
- Single script tag deployment
- Shadow DOM + iframe isolation (no CSS/JS conflicts)
- Streaming AI responses
- Responsive design (mobile/desktop)

**RAG Pipeline**
- Document ingestion (PDF, URL, plain text)
- Semantic chunking with overlap
- Vector similarity search (threshold: 0.7)
- Source citations in responses

**Multi-Tenancy**
- PostgreSQL Row Level Security (RLS)
- Vector namespace isolation (`cust_{tenant_id}`)
- Per-tenant API key authentication
- Isolated conversation history

**Admin Panel**
- Training data management
- Conversation oversight
- Widget customization (colors, position, welcome message)
- Usage analytics and cost tracking

**Operations**
- Docker containerization
- CI/CD pipelines (GitHub Actions)
- Cross-tenant isolation tests
- Rate limiting (Redis-based)

## Project Structure

```
a4-ai-chatbot-widget/
├── chatbot-backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── models/           # Pydantic models
│   │   ├── services/         # Business logic
│   │   └── middleware/       # Auth, rate limiting
│   ├── tests/                # Backend tests
│   └── requirements.txt       # Python dependencies
│
├── chatbot-widget/           # Embeddable widget
│   ├── src/                  # Lit component source
│   ├── dist/                 # Compiled bundle
│   └── package.json
│
├── app/                      # Admin panel (Next.js)
│   ├── app/
│   │   ├── admin/            # Admin pages
│   │   │   ├── dashboard/
│   │   │   ├── training/
│   │   │   ├── conversations/
│   │   │   └── settings/
│   │   └── api/              # Admin API routes
│   ├── components/           # React components
│   └── lib/                  # Utilities and services
│
├── docker-compose.yml        # Local development
├── Dockerfile.backend         # Backend container
├── Dockerfile.admin          # Admin container
└── .env.example              # Environment template
```

## Development

### Running Tests

```bash
# Backend tests
cd chatbot-backend
pytest tests/ -v

# Admin tests
cd app
npm run test

# Isolation tests (tenant security)
pytest tests/test_tenant_isolation.py -v
```

### Building Docker Images

```bash
# Build all images
docker-compose build

# Or individually
docker build -f Dockerfile.backend -t a4-backend .
docker build -f Dockerfile.admin -t a4-admin .
```

### GitHub Actions CI/CD

The project includes three workflows:

| Workflow | Purpose |
|----------|---------|
| `.github/workflows/ci.yml` | Test and build on every push |
| `.github/workflows/deploy.yml` | Deploy to staging on main branch |
| `.github/workflows/test-isolation.yml` | Daily security isolation tests |

## Deployment

### Production Requirements

1. **Supabase Project**
   - PostgreSQL with pgvector extension enabled
   - Auth configured for admin panel

2. **Environment Variables**
   - All variables from `.env.example` filled in
   - Production secrets in GitHub Secrets

3. **Docker Registry**
   - GitHub Container Registry or Docker Hub
   - Images tagged by commit SHA

### Staging Deployment

Push to `main` branch triggers automatic deployment to staging via `.github/workflows/deploy.yml`.

### Production Deployment

1. Merge staging to production branch
2. Review and approve deployment
3. CI runs all tests
4. Images built and pushed
5. Deployment platform (Railway/Render/DigitalOcean) updates

## Documentation

| Document | Description |
|----------|-------------|
| [PROJECT.md](PROJECT.md) | Detailed project specs and architecture |
| [ROADMAP.md](.planning/ROADMAP.md) | Phase planning and requirements |
| [STATE.md](.planning/STATE.md) | Current project state and decisions |

## Requirements Covered

| Category | Status | Items |
|----------|--------|-------|
| Embeddable Widget | ✅ Complete | 2/2 |
| Backend Core | ✅ Complete | 2/2 |
| RAG Pipeline | ✅ Complete | 3/3 |
| Multi-Tenancy | ✅ Complete | 2/2 |
| Admin Panel | ✅ Complete | 5/5 |
| Production | ✅ Complete | 3/3 |

**Total: 15/15 requirements (100%)**

## License

MIT License — see [LICENSE](LICENSE) for details.

## Support

- Documentation: See `/docs` in the backend
- API Docs: http://localhost:8000/docs
- Admin Panel: http://localhost:3000/admin
