# Phase 1: Widget Foundation + Backend Core - Research

**Researched:** February 7, 2026
**Domain:** Embeddable AI Chatbot Widget with FastAPI Backend
**Confidence:** HIGH
**Readiness:** yes

## Summary

This research defines the technical implementation for Phase 1: creating an embeddable AI chatbot widget with a FastAPI backend supporting streaming responses. The widget will be built using Lit 3.x with TypeScript, leveraging Shadow DOM for complete CSS/JS isolation from host websites. The backend uses FastAPI 0.109+ with Python 3.11+ and implements Server-Sent Events (SSE) for real-time streaming responses.

The recommended approach uses a two-part architecture: a lightweight loader script (served from CDN) that creates an iframe containing the Lit-based chat widget, and a FastAPI backend that validates API keys server-side and streams AI responses via SSE. Shadow DOM ensures complete isolation from host site CSS, while iframe boundaries provide JavaScript isolation. The sse-starlette library handles SSE streaming with automatic reconnection support.

**Primary recommendation:** Use Lit 3.3.2+ with Vite 6.x in library mode to produce a single bundled widget.js file (~10-15KB gzipped) served from CDN, combined with FastAPI backend using sse-starlette 3.2.0+ for SSE streaming with pingheartbeat mechanisms for/ connection stability.

## Standard Stack

### Widget Layer (Client-Side)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lit | 3.3.2 | Web component framework | Native Shadow DOM support, small bundle size (~5KB), reactive properties |
| vite | 6.3.1 | Build tool | Fast bundling, library mode with IIFE output, built-in minification |
| typescript | 5.7+ | Language | Type safety for widget development, better IDE support |

### Backend Layer (Server-Side)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| python | 3.11+ | Runtime | Best AI/ML ecosystem, async support, performance |
| fastapi | 0.109+ | Web framework | Async-native, automatic OpenAPI docs, high performance |
| sse-starlette | 3.2.0 | SSE streaming | Production-ready SSE for FastAPI/Starlette, automatic disconnect detection |
| uvicorn | 0.27+ | ASGI server | Fast, production-ready, handles SSE well |
| openai | 1.x | AI integration | Official SDK, streaming support |

### Supporting Tools

| Tool | Purpose | Version |
|------|---------|---------|
| npm | Package manager | 10+ |
| pip | Python package manager | 24+ |

### Installation

```bash
# Widget dependencies
npm create vite@latest chatbot-widget -- --template lit-ts
cd chatbot-widget
npm install lit@3.3.2 vite@6.3.1 typescript@5.7

# Backend dependencies
mkdir chatbot-backend && cd chatbot-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi==0.109.0 uvicorn==0.27.0 sse-starlette==3.2.0 openai==1.55.0
```

## Architecture Patterns

### Widget Embedding Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      HOST WEBSITE                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  <script src="https://cdn.a4-ai.com/widget.js"          │   │
│  │    data-api-key="tenant_api_key"                        │   │
│  │    data-widget-id="widget_uuid"                         │   │
│  │  ></script>                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Widget Loader Script                                    │   │
│  │  - Creates iframe element                               │   │
│  │  - Injects configuration via postMessage                 │   │
│  │  - Handles resize events from iframe                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WIDGET IFRAME (Shadow DOM)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  <ai-chat-widget>                                       │   │
│  │  ├── <chat-bubble> (floating button)                    │   │
│  │  └── <chat-window> (expandable chat interface)          │   │
│  │      ├── <message-list>                                 │   │
│  │      ├── <input-area>                                   │   │
│  │      └── <typing-indicator>                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                          postMessage                             │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FASTAPI BACKEND                          │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   /chat     │    │  /health    │    │   /docs (OpenAPI)   │ │
│  │  (streaming)│    │  (status)   │    │                     │ │
│  └──────┬──────┘    └─────────────┘    └─────────────────────┘ │
│         │                                                      │
│         ▼                                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  API Key Validation                                       │  │
│  │  - Extract X-API-Key header                               │  │
│  │  - Validate against database                              │  │
│  │  - Reject invalid keys (401)                             │  │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Chat Service                                             │  │
│  │  - Call OpenAI API with streaming                        │  │
│  │  - Yield chunks via sse-starlette                       │  │
│  │  - Handle disconnection gracefully                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Shadow DOM Pattern

```typescript
// src/chat-widget.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('ai-chat-widget')
export class AiChatWidget extends LitElement {
  // Shadow DOM for complete CSS isolation
  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --a4w-primary-color: #6366f1;
      --a4w-bg-color: #ffffff;
      --a4w-text-color: #1f2937;
      --a4w-secondary-bg: #f3f4f6;
    }
    
    .chat-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
    }
    
    .bubble {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--a4w-primary-color);
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 380px;
      height: 500px;
      background: var(--a4w-bg-color);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
    }
  `;
  
  @property({ type: String }) apiKey = '';
  @property({ type: String }) widgetId = '';
  @state() private isOpen = false;
  @state() private messages: Message[] = [];
  
  render() {
    return html`
      <div class="chat-container">
        <div class="window" ?hidden="${!this.isOpen}">
          <div class="messages">
            ${this.messages.map(msg => html`
              <div class="message ${msg.role}">${msg.content}</div>
            `)}
          </div>
          <div class="input-area">
            <input 
              type="text" 
              placeholder="Type a message..."
              @keydown="${this.handleKeydown}"
            />
          </div>
        </div>
        <div class="bubble" @click="${this.toggleChat}">
          ${this.isOpen ? '✕' : '💬'}
        </div>
      </div>
    `;
  }
}
```

### Iframe Communication Pattern

```typescript
// widget-loader.js (served from CDN)
(function() {
  // Read configuration from script attributes
  const script = document.currentScript;
  const config = {
    apiKey: script.dataset.apiKey,
    widgetId: script.dataset.widgetId,
    apiUrl: script.dataset.apiUrl || 'https://api.a4-ai.com'
  };
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'a4-chat-widget-' + config.widgetId;
  iframe.src = 'https://cdn.a4-ai.com/widget.html?id=' + config.widgetId;
  iframe.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border: none;
    border-radius: 50%;
    z-index: 999999;
    transition: all 0.3s ease;
  `;
  iframe.sandbox = 'allow-scripts allow-same-origin';
  
  // Setup postMessage handler
  window.addEventListener('message', handleWidgetMessage);
  
  // Initialize iframe
  document.body.appendChild(iframe);
  
  // Send config after iframe loads
  iframe.onload = () => {
    iframe.contentWindow.postMessage({
      type: 'INIT',
      config: config
    }, '*');
  };
  
  function handleWidgetMessage(event) {
    // SECURITY: Always verify origin
    if (event.origin !== 'https://cdn.a4-ai.com') {
      console.warn('Ignored message from untrusted origin:', event.origin);
      return;
    }
    
    const message = event.data;
    
    switch (message.type) {
      case 'READY':
        // Widget loaded, expand to full size
        iframe.style.width = '400px';
        iframe.style.height = '600px';
        iframe.style.borderRadius = '12px';
        break;
        
      case 'RESIZE':
        // Adjust iframe height to content
        iframe.style.height = message.height + 'px';
        break;
        
      case 'TOGGLE':
        // Toggle expanded/collapsed state
        if (message.expanded) {
          iframe.style.width = '400px';
          iframe.style.height = '600px';
          iframe.style.borderRadius = '12px';
        } else {
          iframe.style.width = '60px';
          iframe.style.height = '60px';
          iframe.style.borderRadius = '50%';
        }
        break;
    }
  }
})();
```

### FastAPI SSE Pattern

```python
# app/api/chat.py
from fastapi import APIRouter, Request, HTTPException, Depends
from sse_starlette import EventSourceResponse
from pydantic import BaseModel
import json
import asyncio
from openai import AsyncOpenAI

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

async def validate_api_key(request: Request):
    """Validate API key from X-API-Key header"""
    api_key = request.headers.get('X-API-Key')
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # Validate against database (placeholder)
    tenant = await validate_tenant(api_key)
    if not tenant:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return tenant

@router.post("/chat")
async def stream_chat(
    request: ChatRequest,
    tenant = Depends(validate_api_key)
):
    """Stream chat responses using Server-Sent Events"""
    
    async def event_generator():
        client = AsyncOpenAI(api_key=tenant.openai_key)
        
        try:
            # Start streaming response from OpenAI
            stream = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": request.message}
                ],
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield {
                        "event": "message",
                        "data": json.dumps({"chunk": content})
                    }
                    
        except asyncio.CancelledError:
            # Client disconnected - cleanup
            yield {"event": "done", "data": json.dumps({"status": "cancelled"})}
            raise
            
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"error": str(e)})}
            
        finally:
            yield {"event": "done", "data": json.dumps({"status": "complete"})}
    
    return EventSourceResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Connection": "keep-alive",
        }
    )
```

### Widget SSE Client Pattern

```typescript
// In the Lit component
@state() private streamingContent = '';
@state() private isStreaming = false;

private async sendMessage(message: string) {
  this.isStreaming = true;
  this.streamingContent = '';
  
  const response = await fetch(`${this.apiUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    },
    body: JSON.stringify({ message })
  });
  
  // Parse SSE stream
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (this.isStreaming && reader) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          this.isStreaming = false;
          break;
        }
        
        try {
          const event = JSON.parse(data);
          if (event.chunk) {
            this.streamingContent += event.chunk;
          }
        } catch (e) {
          // Ignore parse errors for partial chunks
        }
      }
    }
  }
}
```

## Implementation Approach

### Step 1: Project Setup

1. **Create widget project structure**
   ```
   chatbot-widget/
   ├── src/
   │   ├── components/
   │   │   ├── chat-widget.ts
   │   │   ├── chat-bubble.ts
   │   │   ├── chat-window.ts
   │   │   ├── message-list.ts
   │   │   └── input-area.ts
   │   ├── services/
   │   │   ├── api.ts
   │   │   └── config.ts
   │   ├── styles/
   │   │   └── theme.css
   │   └── index.ts
   ├── vite.config.ts
   ├── tsconfig.json
   └── package.json
   ```

2. **Create backend project structure**
   ```
   chatbot-backend/
   ├── app/
   │   ├── api/
   │   │   ├── __init__.py
   │   │   ├── chat.py
   │   │   └── health.py
   │   ├── core/
   │   │   ├── __init__.py
   │   │   ├── config.py
   │   │   └── security.py
   │   ├── main.py
   │   └── models/
   │       └── __init__.py
   ├── tests/
   ├── requirements.txt
   └── pyproject.toml
   ```

### Step 2: Configure Vite for CDN Bundle

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'A4ChatWidget',
      fileName: (format) => `widget.${format}.js`,
      formats: ['iife']  // IIFE for direct script tag inclusion
    },
    rollupOptions: {
      output: {
        // Minify CSS and inline it
        assetFileNames: 'widget.[ext]',
        manualChunks: undefined,  // Single bundle
      },
    },
    minify: 'esbuild',
    cssCodeSplit: false,  // Inline CSS in JS
    sourcemap: false,
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
```

### Step 3: Build Shadow DOM Components

Create reusable Lit components with Shadow DOM encapsulation:

1. **ChatWidget** - Main container component
2. **ChatBubble** - Expandable/collapsible button
3. **ChatWindow** - Chat interface with message list
4. **MessageList** - Scrollable message display
5. **InputArea** - Text input with send functionality

### Step 4: Implement Widget Loader

Create the loader script that:
- Extracts configuration from data attributes
- Creates and positions the iframe
- Establishes postMessage communication
- Handles resize events

### Step 5: Build FastAPI Backend

1. **Setup FastAPI application**
   ```python
   # main.py
   from fastapi import FastAPI
   from fastapi.middleware.cors import CORSMiddleware
   from app.api import chat, health
   
   app = FastAPI(
       title="A4 AI Chatbot API",
       description="API for embeddable AI chatbot widget",
       version="1.0.0"
   )
   
   app.include_router(health.router, prefix="/api/v1")
   app.include_router(chat.router, prefix="/api/v1")
   ```

2. **Implement API key validation**
   - Extract from X-API-Key header
   - Validate against database
   - Return 401 for invalid keys

3. **Implement SSE streaming**
   - Use sse-starlette for response streaming
   - Handle client disconnection gracefully
   - Configure nginx proxy for streaming

### Step 6: Configure Nginx for SSE

```nginx
location /api/v1/chat {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_buffering off;  # Critical for SSE
    chunked_transfer_encoding off;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

## Decisions

### Decision 1: Iframe + Shadow DOM vs Script Tag Only

**Decision:** Iframe with Shadow DOM

**Rationale:**
- Complete JavaScript isolation from host site
- Shadow DOM guarantees no CSS conflicts
- Standard pattern used by Intercom, Drift, Zendesk
- Trade-off: Slightly more complex communication via postMessage

**Implementation:** Widget loads in iframe with Shadow DOM for style isolation.

### Decision 2: IIFE Bundle Format for Widget

**Decision:** Use IIFE (Immediately Invoked Function Expression) format

**Rationale:**
- Works directly in browser without module loader
- No build step required for customer
- Variables are scoped, no global pollution
- Vite library mode supports this natively

**Configuration:** `formats: ['iife']` in Vite lib config.

### Decision 3: SSE over WebSocket

**Decision:** Server-Sent Events (SSE)

**Rationale:**
- Simpler protocol (HTTP-based, no upgrade handshake)
- Automatic reconnection via browser EventSource
- Works through most firewalls
- Sufficient for one-way server→client streaming
- Better browser support than WebSocket in some corporate environments

**Implementation:** sse-starlette library for FastAPI with ping/heartbeat.

### Decision 4: Inline CSS in JS Bundle

**Decision:** Inline CSS within JavaScript bundle

**Rationale:**
- Single HTTP request for widget
- CSS automatically scoped with Shadow DOM
- No separate CSS file to load
- Prevents flash of unstyled content

**Implementation:** `cssCodeSplit: false` in Vite config.

### Decision 5: Server-Side API Key Validation

**Decision:** Validate API key on every backend request

**Rationale:**
- Keys never exposed in client bundle
- Can revoke/rotate keys without widget updates
- Per-tenant rate limiting enforcement
- Audit trail for API usage

**Implementation:** X-API-Key header validated via FastAPI dependency.

### Decision 6: Vite esbuild Minification

**Decision:** Use esbuild for minification (default in Vite)

**Rationale:**
- 20-40x faster than Terser
- Excellent compression (1-2% worse than Terser)
- No additional dependencies
- Production-ready

**Configuration:** `minify: 'esbuild'` (default in Vite 6).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS isolation | Custom CSS naming schemes | Shadow DOM | Native browser feature, zero runtime overhead |
| Component framework | Raw Web Components | Lit 3.x | Reactive properties, template syntax, dev experience |
| Bundle optimization | Manual bundling with Rollup | Vite lib mode | Built-in optimization, tree-shaking, minification |
| SSE streaming | Custom EventSource implementation | sse-starlette | Production-tested, disconnect handling, ping intervals |
| TypeScript config | Manual tsconfig | Vite template + adjustments | Pre-configured for modern browsers, decorators |
| Iframe communication | Custom polling | postMessage | Native browser API, secure with origin verification |

**Key insight:** The web component ecosystem (Lit + Vite) provides battle-tested solutions for embeddable widgets. Building custom alternatives would introduce maintenance burden and potential isolation bugs.

## Common Pitfalls

### Pitfall 1: Missing Origin Verification in postMessage

**What goes wrong:** Widget accepts messages from any origin, enabling malicious sites to control widget behavior.

**Why it happens:** Using wildcard `*` in postMessage calls or skipping origin checks.

**How to avoid:** Always verify event.origin matches expected CDN origin.

**Warning signs:**
```typescript
// BAD - no origin check
window.addEventListener('message', (event) => {
  // Accepts any origin!
  handleMessage(event.data);
});

// GOOD - verify origin
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://cdn.a4-api.com') {
    console.warn('Ignored message from:', event.origin);
    return;
  }
  handleMessage(event.data);
});
```

### Pitfall 2: Nginx Buffering SSE Responses

**What goes wrong:** SSE streams appear to hang; chunks buffer until ~16KB accumulates before appearing.

**Why it happens:** Nginx default buffering behavior for proxy responses.

**How to avoid:** Add `proxy_buffering off` and `X-Accel-Buffering: no` headers.

**Warning signs:** Long delays between messages, streaming appears frozen.

### Pitfall 3: CSS Conflicts via Inheritance

**What goes wrong:** Host site styles penetrate Shadow DOM via inheritance.

**Why it happens:** Inherited properties (font-family, color) pass through Shadow DOM boundary.

**How to avoid:** Explicitly reset inherited properties in Shadow DOM styles.

**Warning signs:**
```typescript
// GOOD - reset inherited properties
static styles = css`
  :host {
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1f2937;  // Explicit color
    background: #ffffff;  // Explicit background
  }
`;
```

### Pitfall 4: API Key in Bundle

**What goes wrong:** API key appears in network tab or bundle source.

**Why it happens:** Passing API key in configuration that gets bundled.

**How to avoid:** All API calls go through backend with server-side key validation.

**Warning signs:**
```typescript
// BAD - API key in bundle
const response = await fetch(`https://api.a4-ai.com/chat?key=${this.apiKey}`);

// GOOD - key in header (validated server-side)
const response = await fetch(`${this.apiUrl}/chat`, {
  headers: { 'X-API-Key': this.apiKey }
});
```

### Pitfall 5: Iframe Memory Leaks

**What goes wrong:** Widget creates multiple iframes or doesn't cleanup on page navigation.

**Why it happens:** No cleanup logic when script re-runs or page unloads.

**How to avoid:** Use unique widget ID and cleanup on page unload.

**Warning signs:**
```typescript
// GOOD - unique ID and cleanup
const WIDGET_ID = 'a4-chat-widget-' + config.widgetId;
const existing = document.getElementById(WIDGET_ID);
if (existing) existing.remove();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  iframe.remove();
});
```

### Pitfall 6: SSE Connection Without Ping

**What goes wrong:** Connections drop after idle periods without automatic reconnection.

**Why it happens:** No heartbeat mechanism to keep connection alive.

**How to avoid:** Implement ping interval in SSE responses.

**Warning signs:** Streams stop working after ~1-2 minutes of inactivity.

## Code Examples

### Complete Widget Loader

```typescript
// widget-loader.js - served from CDN
(function() {
  'use strict';
  
  const CONFIG_ATTRS = ['api-key', 'widget-id', 'api-url'];
  const CDN_ORIGIN = 'https://cdn.a4-ai.com';
  
  function initWidget() {
    // Get configuration
    const script = document.currentScript;
    const config = {};
    
    for (const attr of CONFIG_ATTRS) {
      const value = script.dataset[attr];
      if (value) config[attr.replace('-', '')] = value;
    }
    
    if (!config.apiKey || !config.widgetId) {
      console.error('[A4 Widget] Missing required configuration');
      return;
    }
    
    const widgetId = 'a4-widget-' + config.widgetId;
    
    // Remove existing widget
    const existing = document.getElementById(widgetId);
    if (existing) existing.remove();
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = widgetId;
    iframe.src = `${CDN_ORIGIN}/widget.html?id=${config.widgetId}`;
    iframe.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border: none;
      border-radius: 50%;
      z-index: 999999;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    iframe.sandbox = 'allow-scripts allow-same-origin';
    iframe.setAttribute('loading', 'lazy');
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      iframe.contentWindow.postMessage({
        type: 'INIT',
        config: config
      }, CDN_ORIGIN);
    };
  }
  
  // Handle messages from iframe
  function handleMessage(event) {
    if (event.origin !== CDN_ORIGIN) return;
    
    const { type, data } = event.data || {};
    
    switch (type) {
      case 'READY':
        // Widget ready, could track analytics
        break;
        
      case 'RESIZE':
        const iframe = document.getElementById('a4-widget-' + data.id);
        if (iframe && data.height) {
          iframe.style.height = Math.min(data.height, window.innerHeight - 100) + 'px';
        }
        break;
    }
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
  
  // Setup message handler
  window.addEventListener('message', handleMessage);
})();
```

### Complete FastAPI Endpoint

```python
# app/api/chat.py
from fastapi import APIRouter, Request, HTTPException, Depends, status
from sse_starlette import EventSourceResponse
from pydantic import BaseModel
from typing import AsyncGenerator
import json
import asyncio
from openai import AsyncOpenAI
from datetime import datetime

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

async def get_api_key(request: Request) -> str:
    """Extract and validate API key"""
    api_key = request.headers.get('X-API-Key')
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required in X-API-Key header"
        )
    return api_key

@router.post("/chat")
async def stream_chat(
    request: ChatRequest,
    api_key: str = Depends(get_api_key)
):
    """
    Stream chat responses using Server-Sent Events.
    
    Client should connect using:
    const eventSource = new EventSource(url, {
      headers: { 'X-API-Key': apiKey }
    });
    """
    
    async def generate_events() -> AsyncGenerator[str, None]:
        # Simulated OpenAI client - replace with actual initialization
        client = AsyncOpenAI(api_key="your-key")
        
        try:
            # Build messages
            messages = [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": request.message}
            ]
            
            # Stream from OpenAI
            stream = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'chunk': content})}\n\n"
                    
        except asyncio.CancelledError:
            yield f"data: {json.dumps({'status': 'cancelled'})}\n\n"
            raise
            
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            
        finally:
            yield f"data: {json.dumps({'status': 'done'})}\n\n"
    
    return EventSourceResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
```

### Complete Lit Component

```typescript
// src/components/chat-widget.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@customElement('ai-chat-widget')
export class AiChatWidget extends LitElement {
  @property({ type: String }) apiUrl = '';
  @property({ type: String }) apiKey = '';
  
  @state() private isOpen = false;
  @state() private messages: Message[] = [];
  @state() private inputValue = '';
  @state() private isStreaming = false;
  @state() private streamingContent = '';
  
  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --primary: #6366f1;
      --bg: #ffffff;
      --text: #1f2937;
      --secondary-bg: #f3f4f6;
      --border: #e5e7eb;
    }
    
    .container {
      position: relative;
      z-index: 999999;
    }
    
    .bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--primary);
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: transform 0.2s ease;
    }
    
    .bubble:hover {
      transform: scale(1.05);
    }
    
    .window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 520px;
      background: var(--bg);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
      transition: all 0.3s ease;
    }
    
    .window.open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    
    .header {
      padding: 16px;
      background: var(--primary);
      color: white;
      font-weight: 600;
    }
    
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .message {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .message.user {
      align-self: flex-end;
      background: var(--primary);
      color: white;
      border-bottom-right-radius: 4px;
    }
    
    .message.assistant {
      align-self: flex-start;
      background: var(--secondary-bg);
      color: var(--text);
      border-bottom-left-radius: 4px;
    }
    
    .input-area {
      padding: 16px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 8px;
    }
    
    .input-area input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }
    
    .input-area input:focus {
      border-color: var(--primary);
    }
    
    .input-area button {
      padding: 10px 16px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .input-area button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
  
  private handleToggle() {
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      // Notify parent for iframe sizing
      window.parent.postMessage({
        type: 'TOGGLE',
        expanded: true,
        height: 600
      }, '*');
    } else {
      window.parent.postMessage({
        type: 'TOGGLE',
        expanded: false
      }, '*');
    }
  }
  
  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }
  
  private async sendMessage() {
    if (!this.inputValue.trim() || this.isStreaming) return;
    
    const message = this.inputValue.trim();
    this.inputValue = '';
    
    // Add user message
    this.messages = [...this.messages, {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }];
    
    // Add placeholder for streaming response
    const responseId = crypto.randomUUID();
    this.messages = [...this.messages, {
      id: responseId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }];
    
    this.isStreaming = true;
    this.streamingContent = '';
    
    try {
      const response = await fetch(`${this.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error('Request failed');
      }
      
      // Parse SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      while (this.isStreaming && reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              this.isStreaming = false;
              break;
            }
            
            try {
              const event = JSON.parse(data);
              if (event.chunk) {
                this.streamingContent += event.chunk;
                // Update the last message
                this.messages = this.messages.map(msg =>
                  msg.id === responseId
                    ? { ...msg, content: this.streamingContent }
                    : msg
                );
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      this.messages = this.messages.map(msg =>
        msg.id === responseId
          ? { ...msg, content: 'Sorry, something went wrong. Please try again.' }
          : msg
      );
    } finally {
      this.isStreaming = false;
    }
  }
  
  render() {
    return html`
      <div class="container">
        <div 
          class="window ${this.isOpen ? 'open' : ''}"
          style="${styleMap({ height: this.isOpen ? '520px' : '0' })}"
        >
          <div class="header">
            AI Chatbot
          </div>
          
          <div class="messages">
            ${this.messages.length === 0 ? html`
              <div style="text-align: center; color: #6b7280; margin-top: 100px;">
                Start a conversation...
              </div>
            ` : this.messages.map(msg => html`
              <div class="message ${msg.role}">
                ${msg.content}
              </div>
            `)}
          </div>
          
          <div class="input-area">
            <input
              type="text"
              placeholder="Type a message..."
              .value="${this.inputValue}"
              @input="${(e: Event) => this.inputValue = (e.target as HTMLInputElement).value}"
              @keydown="${this.handleKeydown}"
              ?disabled="${this.isStreaming}"
            />
            <button 
              @click="${this.sendMessage}"
              ?disabled="${!this.inputValue.trim() || this.isStreaming}"
            >
              Send
            </button>
          </div>
        </div>
        
        <div class="bubble" @click="${this.handleToggle}">
          ${this.isOpen ? '✕' : '💬'}
        </div>
      </div>
    `;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom CSS prefixes (BEM) | Shadow DOM | 2021+ | Complete isolation, no naming conventions needed |
| WebSocket | SSE | 2017+ | Simpler protocol, automatic reconnection, better firewall support |
| Raw Custom Elements | Lit 3.x | 2020+ | Reactive properties, better dev experience, smaller bundles |
| Manual bundling (Rollup CLI) | Vite | 2020+ | Faster builds, built-in optimization, better DX |
| Inline scripts | IIFE bundles | 2015+ | No global pollution, works without module loaders |

**Deprecated/outdated:**
- **BEM CSS naming** - Replaced by Shadow DOM for isolation
- **WebSocket for streaming** - SSE simpler for one-way streaming
- **Custom element definitions without framework** - Lit provides better DX
- **Manual build scripts** - Vite provides integrated tooling

## Open Questions

### 1. Widget Theme Customization

**Question:** How should tenant theme customization (colors, positioning) be configured?

**Options:**
- Configuration via data attributes (current)
- Runtime configuration via API call
- CSS variables override

**Recommendation:** Use data attributes for basic config (color, position), with CSS variable fallbacks for advanced customization.

### 2. Conversation Persistence

**Question:** Should conversations persist across sessions?

**Options:**
- LocalStorage only (privacy-focused)
- Server-side with visitor tracking
- No persistence (stateless)

**Recommendation:** Defer to Phase 2. Keep stateless for Phase 1 MVP.

### 3. Error Handling Strategy

**Question:** How should different error states be displayed to users?

**Options:**
- Generic error messages (more secure)
- Specific error details (better UX)
- Tiered approach with rate limits

**Recommendation:** Generic messages for API errors, specific for validation errors. Track errors server-side for monitoring.

### 4. Bundle Size Targets

**Question:** What is the acceptable bundle size for initial widget load?

**Options:**
- < 10KB gzipped (aggressive)
- 10-20KB gzipped (balanced)
- 20-50KB gzipped (flexible)

**Recommendation:** Target 10-15KB gzipped with Vite optimization. Code split chat window for lazy load.

## Sources

### Primary (HIGH confidence)

- **Lit Documentation** (https://lit.dev/docs/) - Official web component framework docs
- **Vite Documentation** (https://vitejs.dev/) - Build tool and configuration
- **sse-starlette GitHub** (https://github.com/sysid/sse-starlette) - SSE implementation for FastAPI
- **MDN postMessage** (https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) - Cross-origin communication standard
- **MDN SSE** (https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) - SSE specification and browser API

### Secondary (MEDIUM confidence)

- **Shadow DOM Spec** - W3C standard for style encapsulation
- **FastAPI Documentation** - Framework documentation with streaming examples
- **Vite Library Mode Guide** - Library bundling best practices

### Tertiary (LOW confidence)

- Industry widget patterns from Intercom, Drift documentation
- Community blog posts on embeddable widget patterns

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - All libraries are actively maintained with recent releases
- Architecture Patterns: HIGH - Standard web platform APIs with well-documented patterns
- Pitfalls: HIGH - Common pitfalls documented in web platform literature
- Implementation: HIGH - Research backed by official documentation

**Research date:** February 7, 2026
**Valid until:** August 2026 (6 months - fast-moving JavaScript ecosystem)

**Divergences from project baseline:** None - Aligned with research/SUMMARY.md, research/STACK.md, research/ARCHITECTURE.md, and research/PITFALLS.md

**Phase-specific concerns addressed:**
- EMBED-01: Single script tag via CDN-hosted widget.js with data attributes
- EMBED-02: Iframe rendering with Shadow DOM for CSS/JS isolation  
- CORE-01: FastAPI server with automatic OpenAPI documentation at /docs
- CORE-02: Chat endpoint using SSE for streaming responses
