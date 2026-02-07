# Phase 1 Context: Widget Foundation + Backend Core

**Created:** February 7, 2026
**Phase:** 1 - Widget Foundation + Backend Core

---

## Goal

Users can embed a working chat widget on their website that communicates with a FastAPI backend and displays streaming AI responses.

---

## Implementation Decisions

### Deployment Model: CDN-based

**Decision:** Widget loaded via single script tag from CDN.

**Rationale:**
- Automatic updates without customer code changes
- Reduced customer bundle size (no widget code in their build)
- CDN provides geographic distribution and caching
- Simpler customer onboarding (copy-paste ready)

**Configuration:**
```html
<script
  src="https://cdn.a4-ai.com/widget.js"
  data-api-key="YOUR_API_KEY"
  data-widget-id="YOUR_WIDGET_ID"
></script>
```

### Authentication: Server-Side API Key Validation

**Decision:** API key validated on every backend request; never exposed to client bundle.

**Rationale:**
- API keys never appear in browser network tab
- Backend enforces rate limits and tenant isolation
- Compromise of frontend code doesn't expose API key directly
- Keys can be rotated server-side without widget updates

**Flow:**
1. Widget initializes with API key in config
2. Every chat request includes `X-API-Key` header
3. Backend validates key against database before processing
4. Invalid keys return 401 immediately

### Streaming Protocol: Server-Sent Events (SSE)

**Decision:** Use SSE for streaming AI responses.

**Rationale:**
- Native browser EventSource API
- Works through most firewalls (HTTP-based)
- Simpler than WebSocket (no upgrade handshake)
- Automatic reconnection on connection loss
- Optimal for one-way server→client streaming

**Implementation:**
```python
from fastapi import Request
from sse_starlette.sse import EventSourceResponse

async def stream_chat(request: Request, tenant_id: str, message: str):
    async def event_generator():
        async for chunk in openai_client.chat_stream(tenant_id, message):
            yield {"data": json.dumps({"chunk": chunk})}
    return EventSourceResponse(event_generator())
```

---

## Requirements Covered

| ID | Requirement | Implementation Approach |
|----|-------------|------------------------|
| EMBED-01 | Single script tag deployment | CDN-hosted widget.js with data attributes |
| EMBED-02 | Iframe + Shadow DOM isolation | Widget renders in iframe with Shadow DOM encapsulation |
| CORE-01 | FastAPI server with OpenAPI | /docs endpoint, Pydantic models, type validation |
| CORE-02 | Streaming chat endpoint | SSE-based response streaming |

---

## Technical Constraints

### From Project Research

- **Widget Framework:** Lit 3.x with TypeScript
- **CSS Isolation:** Shadow DOM (mandatory, non-negotiable)
- **Backend:** FastAPI 0.109+ with Python 3.11+
- **AI Integration:** OpenAI GPT-4o-mini for responses

### From Architecture Patterns

- postMessage for iframe↔parent communication
- Strict origin verification on all cross-origin messages
- Unique namespace prefixes (a4w-*) for all Shadow DOM elements
- Code splitting: minimal initial load, lazy-load chat window

---

## Open Questions (for Research)

1. What are optimal bundle splitting strategies for Lit components?
2. How to handle SSE connection lifecycle (reconnection, idle timeout)?
3. What error states need graceful handling in widget?

---

## References

- ROADMAP.md: Phase 1 specifications
- STATE.md: Project accumulated context
- research/ARCHITECTURE.md: Isolation patterns
- research/STACK.md: Technology recommendations
