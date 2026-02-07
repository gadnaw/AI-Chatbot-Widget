---
wave: "01"
depends_on: []
files_modified:
  - "chatbot-widget/package.json"
  - "chatbot-widget/vite.config.ts"
  - "chatbot-widget/src/chat-widget.ts"
  - "chatbot-widget/src/widget-loader.ts"
  - "chatbot-backend/app/main.py"
  - "chatbot-backend/app/api/chat.py"
  - "chatbot-backend/app/models/chat.py"
  - "chatbot-backend/app/core/config.py"
autonomous: true
provides_interface:
  endpoint: "POST /api/v1/chat"
  output: "streaming SSE response"
  status: "ready for Phase 2"
assumes_from: []
---

# Phase 1 Plan: Widget Foundation + Backend Core

**Goal:** Users can embed a working chat widget on their website that communicates with a FastAPI backend and displays streaming AI responses.

**Requirements Covered:**
- EMBED-01: Single script tag deployment with API key configuration
- EMBED-02: Iframe rendering with Shadow DOM for CSS/JS isolation
- CORE-01: FastAPI server with OpenAPI documentation
- CORE-02: Chat endpoint supporting streaming responses

**Success Criteria:**
1. Single-script embed works without additional configuration
2. Widget correctly isolated from host site CSS and JavaScript
3. Streaming AI responses display within 3 seconds of sending
4. FastAPI backend serves OpenAPI documentation with CORS configured

## Wave 01: Project Setup + Backend Foundation

<plan_check:complete>

### 01.01: Initialize Project Structure

```bash
cd chatbot-widget
npm create vite@latest chatbot-widget -- --template lit-ts
cd chatbot-widget
npm install lit@3.3.2 vite@6.3.1 typescript@5.7 vite-plugin-css-injected-by-js@5.1.12

cd chatbot-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi==0.109.0 uvicorn==0.27.0 sse-starlette==3.2.0 openai==1.55.0 pydantic==2.5.0 python-dotenv==1.0.0
pip install pytest==7.4.0 pytest-asyncio==0.23.0 httpx==0.26.0
```

**Verification:**
- `ls chatbot-widget/` contains `package.json`, `vite.config.ts`, `src/`
- `ls chatbot-backend/` contains `venv/`, `app/`
- `npm test` runs without errors
- `pytest` discovers tests

**Must-Haves:**
- [ ] Widget project builds with Vite
- [ ] Backend starts with `uvicorn app.main:app --reload`
- [ ] TypeScript compilation passes with no errors
- [ ] Python imports work correctly

### 01.02: Configure Vite for Library Mode

```typescript
// chatbot-widget/vite.config.ts
import { defineConfig } from 'vite';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [
    cssInjectedByJs()
  ],
  build: {
    lib: {
      entry: 'src/widget-loader.ts',
      name: 'A4ChatWidget',
      fileName: 'widget',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'widget.js',
        extend: true
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
```

**Verification:**
- `npm run build` produces `dist/widget.js`
- Bundle size < 50KB gzipped
- No console.log statements in production bundle

**Must-Haves:**
- [ ] Single `widget.js` output file
- [ ] CSS injected into JavaScript
- [ ] Works as IIFE in browser

### 01.03: Create Widget Loader Script

```typescript
// chatbot-widget/src/widget-loader.ts
interface WidgetConfig {
  apiKey: string;
  widgetId: string;
  apiUrl?: string;
}

(function() {
  const script = document.currentScript as HTMLScriptElement;
  const config: WidgetConfig = {
    apiKey: script.dataset.apiKey || '',
    widgetId: script.dataset.widgetId || '',
    apiUrl: script.dataset.apiUrl || 'https://api.a4-ai.com'
  };

  if (!config.apiKey || !config.widgetId) {
    console.error('[A4-Chat] Missing required data-api-key or data-widget-id');
    return;
  }

  const iframeId = `a4-chat-widget-${config.widgetId}`;
  if (document.getElementById(iframeId)) {
    console.warn('[A4-Chat] Widget already initialized');
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.src = `${config.apiUrl}/widget/${config.widgetId}`;
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

  window.addEventListener('message', handleWidgetMessage);

  iframe.onload = () => {
    iframe.contentWindow?.postMessage({
      type: 'INIT',
      config
    }, config.apiUrl);
  };

  function handleWidgetMessage(event: MessageEvent) {
    if (event.origin !== config.apiUrl) return;

    const { type, data } = event.data || {};

    switch (type) {
      case 'READY':
        iframe.style.width = '400px';
        iframe.style.height = '600px';
        iframe.style.borderRadius = '12px';
        break;
      case 'RESIZE':
        iframe.style.height = `${data.height}px`;
        break;
      case 'TOGGLE':
        if (data.expanded) {
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

declare global {
  interface Window {
    A4ChatWidget?: {
      init: (config: WidgetConfig) => void;
    };
  }
}
```

**Verification:**
- Script reads `data-api-key` and `data-widget-id` attributes
- Creates iframe with correct dimensions
- Sends INIT message via postMessage

**Must-Haves:**
- [ ] Works when added via `<script>` tag
- [ ] Creates properly styled iframe
- [ ] Sends configuration to iframe

### 01.04: Create FastAPI Backend with Chat Endpoint

```python
# chatbot-backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title="A4 AI Chatbot API",
    description="API for embeddable AI chatbot widget",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import chat, health

app.include_router(chat.router, prefix="/api/v1")
app.include_router(health.router)
```

```python
# chatbot-backend/app/api/chat.py
from fastapi import APIRouter, Request, HTTPException, Header
from sse_starlette import EventSourceResponse
from pydantic import BaseModel
from typing import AsyncGenerator
import json
from openai import AsyncOpenAI
from app.core.config import settings

router = APIRouter()
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

async def generate_stream(tenant_id: str, message: str):
    async for chunk in await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful customer support assistant."},
            {"role": "user", "content": message}
        ],
        stream=True
    ):
        content = chunk.choices[0].delta.content
        if content:
            yield {"data": json.dumps({"chunk": content})}

@router.post("/chat")
async def chat_endpoint(
    request: Request,
    x_api_key: str = Header(..., alias="X-API-Key"),
    chat_request: ChatRequest
):
    tenant_id = await validate_api_key(x_api_key)
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return EventSourceResponse(
        generate_stream(tenant_id, chat_request.message),
        media_type="text/event-stream"
    )

async def validate_api_key(api_key: str) -> str | None:
    # Placeholder: Replace with actual database lookup in Phase 2
    if api_key.startswith("test_"):
        return "test_tenant"
    return None
```

**Verification:**
- `curl http://localhost:8000/docs` returns OpenAPI UI
- POST to `/api/v1/chat` with valid X-API-Key returns SSE stream
- Invalid API key returns 401

**Must-Haves:**
- [ ] FastAPI server starts successfully
- [ ] OpenAPI documentation available at `/docs`
- [ ] CORS configured for widget origins
- [ ] Streaming response works

## Wave 02: Widget UI Components

<plan_check:complete>

### 01.05: Create Lit Chat Widget Component

```typescript
// chatbot-widget/src/chat-widget.ts
import { LitElement, html, css, PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

@customElement('ai-chat-widget')
export class AiChatWidget extends LitElement {
  @property({ type: String }) apiKey = '';
  @property({ type: String }) widgetId = '';
  @property({ type: String }) apiUrl = 'https://api.a4-ai.com';

  @state() private isOpen = false;
  @state() private messages: Message[] = [];
  @state() private inputValue = '';
  @state() private isLoading = false;
  @state() private error: string | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --a4w-primary: #6366f1;
      --a4w-bg: #ffffff;
      --a4w-text: #1f2937;
      --a4w-secondary: #f3f4f6;
      --a4w-border: #e5e7eb;
      --a4w-user-msg: #6366f1;
      --a4w-user-text: #ffffff;
      --a4w-assistant-msg: #f3f4f6;
      --a4w-assistant-text: #1f2937;
    }

    .a4w-container {
      position: fixed;
      bottom: 0;
      right: 0;
      z-index: 999999;
      font-size: 14px;
    }

    .a4w-bubble {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--a4w-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      transition: transform 0.2s ease;
    }

    .a4w-bubble:hover {
      transform: scale(1.05);
    }

    .a4w-bubble svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .a4w-window {
      position: absolute;
      bottom: 90px;
      right: 0;
      width: 380px;
      height: 520px;
      background: var(--a4w-bg);
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: all 0.25s ease;
    }

    .a4w-window.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .a4w-header {
      padding: 16px;
      background: var(--a4w-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .a4w-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .a4w-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      opacity: 0.8;
    }

    .a4w-close:hover {
      opacity: 1;
    }

    .a4w-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .a4w-message {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      line-height: 1.5;
    }

    .a4w-message.user {
      align-self: flex-end;
      background: var(--a4w-user-msg);
      color: var(--a4w-user-text);
      border-bottom-right-radius: 4px;
    }

    .a4w-message.assistant {
      align-self: flex-start;
      background: var(--a4w-assistant-msg);
      color: var(--a4w-assistant-text);
      border-bottom-left-radius: 4px;
    }

    .a4w-input-area {
      padding: 12px;
      border-top: 1px solid var(--a4w-border);
      display: flex;
      gap: 8px;
    }

    .a4w-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--a4w-border);
      border-radius: 20px;
      outline: none;
      font-size: 14px;
    }

    .a4w-input:focus {
      border-color: var(--a4w-primary);
    }

    .a4w-send {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--a4w-primary);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .a4w-send:hover {
      background: #4f46e5;
    }

    .a4w-send:disabled {
      background: var(--a4w-border);
      cursor: not-allowed;
    }

    .a4w-typing {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: var(--a4w-assistant-msg);
      border-radius: 12px;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .a4w-dot {
      width: 8px;
      height: 8px;
      background: var(--a4w-text);
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out;
    }

    .a4w-dot:nth-child(2) { animation-delay: 0.2s; }
    .a4w-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }

    .a4w-error {
      padding: 12px;
      background: #fef2f2;
      color: #dc2626;
      border-radius: 8px;
      margin: 12px;
      font-size: 13px;
    }

    @media (max-width: 480px) {
      .a4w-window {
        width: calc(100vw - 20px);
        right: -190px;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this.handleMessage);
  }

  disconnectedCallback() {
    window.removeEventListener('message', this.handleMessage);
    super.disconnectedCallback();
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'INIT') {
      this.apiKey = event.data.config.apiKey;
      this.widgetId = event.data.config.widgetId;
      this.apiUrl = event.data.config.apiUrl || this.apiUrl;
      this.notifyParent('READY');
    }
  };

  private notifyParent(type: string, data?: Record<string, unknown>) {
    window.parent.postMessage({ type, data }, '*');
  }

  private toggleChat() {
    this.isOpen = !this.isOpen;
    this.notifyParent('TOGGLE', { expanded: this.isOpen });
  }

  private async sendMessage() {
    const message = this.inputValue.trim();
    if (!message || this.isLoading) return;

    this.messages = [...this.messages, { role: 'user', content: message }];
    this.inputValue = '';
    this.isLoading = true;
    this.error = null;

    try {
      const response = await fetch(`${this.apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Invalid API key' : 'Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                assistantMessage += data.chunk;
                this.messages = [
                  ...this.messages.slice(0, -1),
                  { role: 'assistant', content: assistantMessage }
                ];
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  render() {
    return html`
      <div class="a4w-container">
        <div class="a4w-window ${this.isOpen ? 'open' : ''}">
          <div class="a4w-header">
            <h3>AI Assistant</h3>
            <button class="a4w-close" @click="${this.toggleChat}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="a4w-messages">
            ${this.messages.map(msg => html`
              <div class="a4w-message ${msg.role}">${msg.content}</div>
            `)}
            ${this.isLoading ? html`
              <div class="a4w-typing">
                <div class="a4w-dot"></div>
                <div class="a4w-dot"></div>
                <div class="a4w-dot"></div>
              </div>
            ` : ''}
          </div>

          ${this.error ? html`<div class="a4w-error">${this.error}</div>` : ''}

          <div class="a4w-input-area">
            <input
              type="text"
              class="a4w-input"
              placeholder="Type a message..."
              .value="${this.inputValue}"
              @input="${(e: Event) => {
                const target = e.target as HTMLInputElement;
                this.inputValue = target.value;
              }}"
              @keydown="${this.handleKeydown}"
              ?disabled="${this.isLoading}"
            />
            <button
              class="a4w-send"
              @click="${this.sendMessage}"
              ?disabled="${!this.inputValue.trim() || this.isLoading}"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="a4w-bubble" @click="${this.toggleChat}">
          ${this.isOpen ? html`
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ` : html`
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          `}
        </div>
      </div>
    `;
  }
}
```

**Verification:**
- Widget renders chat bubble and expandable window
- Clicking bubble toggles chat window
- Messages display in chat interface
- Typing indicator shows during streaming

**Must-Haves:**
- [ ] Chat bubble appears in corner
- [ ] Window expands/collapses on click
- [ ] User messages show on right side
- [ ] Assistant messages stream in with typing indicator

## Wave 03: Widget HTML Wrapper + Widget Page

<plan_check:complete>

### 01.06: Create Widget HTML Wrapper

```html
<!-- chatbot-widget/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A4 Chat Widget</title>
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <script type="module" src="/src/chat-widget.ts"></script>
  <ai-chat-widget></ai-chat-widget>
</body>
</html>
```

```typescript
// chatbot-widget/src/widget.ts
export { AiChatWidget } from './chat-widget';
```

### 01.07: Create Widget Endpoint Page

```python
# chatbot-backend/app/api/widget.py
from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get("/widget/{widget_id}", response_class=HTMLResponse)
async def widget_page(widget_id: str, request: Request):
    """Serve the widget HTML page for iframe embedding."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>A4 Chat Widget</title>
      <style>
        html, body {{ margin: 0; padding: 0; height: 100%; overflow: hidden; }}
      </style>
    </head>
    <body>
      <script type="module" src="https://cdn.a4-ai.com/widget.js"></script>
      <script>
        window.addEventListener('message', (event) => {{
          if (event.data.type === 'INIT') {{
            const widget = document.createElement('ai-chat-widget');
            widget.apiKey = event.data.config.apiKey;
            widget.widgetId = event.data.config.widgetId;
            widget.apiUrl = event.data.config.apiUrl;
            document.body.appendChild(widget);
          }}
        }});
      </script>
    </body>
    </html>
    """
```

**Verification:**
- `/widget/{widget_id}` returns iframe-ready HTML
- Widget JavaScript loads correctly
- INIT message received and processed

**Must-Haves:**
- [ ] Widget page serves without errors
- [ ] JavaScript module loads from CDN
- [ ] Configuration passed via postMessage

### 01.08: Configure CORS for Widget Origins

```python
# chatbot-backend/app/core/config.py
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

**Verification:**
- Widget can POST to `/api/v1/chat` from any origin
- Preflight OPTIONS requests succeed
- CORS headers present in response

**Must-Haves:**
- [ ] Widget requests not blocked by CORS
- [ ] Proper headers on all responses

## Wave 04: Testing + Documentation

<plan_check:complete>

### 01.09: Create Test Suite

```typescript
// chatbot-widget/src/chat-widget.test.ts
import { fixture, assert, expect } from '@open-wc/testing';
import { html } from 'lit';
import './chat-widget';

describe('Chat Widget', () => {
  it('is defined', () => {
    const el = document.createElement('ai-chat-widget');
    assert.instanceOf(el, customElements.get('ai-chat-widget'));
  });

  it('renders with default attributes', async () => {
    const el = await fixture(html`
      <ai-chat-widget api-key="test" widget-id="test"></ai-chat-widget>
    `);
    expect(el.shadowRoot?.querySelector('.a4w-bubble')).to.exist;
  });

  it('toggles chat window on bubble click', async () => {
    const el = await fixture(html`
      <ai-chat-widget api-key="test" widget-id="test"></ai-chat-widget>
    `);
    const bubble = el.shadowRoot?.querySelector('.a4w-bubble') as HTMLElement;
    bubble.click();
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.a4w-window')?.classList.contains('open')).to.be.true;
  });
});
```

```python
# chatbot-backend/tests/test_chat.py
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_docs_available(client):
    response = client.get("/docs")
    assert response.status_code == 200

def test_chat_requires_api_key(client):
    response = client.post("/api/v1/chat", json={"message": "hello"})
    assert response.status_code == 401
```

**Verification:**
- `npm test` runs widget tests
- `pytest` runs backend tests
- All tests pass

**Must-Haves:**
- [ ] Widget component tests pass
- [ ] API endpoint tests pass
- [ ] CORS configuration tested

### 01.10: Create Embed Documentation

```markdown
<!-- chatbot-widget/README.md -->
# A4 AI Chat Widget

## Quick Start

Add the widget to your website with a single script tag:

```html
<script
  src="https://cdn.a4-ai.com/widget.js"
  data-api-key="YOUR_API_KEY"
  data-widget-id="YOUR_WIDGET_ID"
></script>
```

## Configuration

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-api-key` | Yes | Your unique API key |
| `data-widget-id` | Yes | Your widget identifier |
| `data-api-url` | No | Custom API URL (defaults to https://api.a4-ai.com) |

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Customization

Coming in Phase 3: colors, position, welcome message.
```

**Verification:**
- Documentation covers all required attributes
- Examples are accurate
- README renders correctly on npm/pypi

**Must-Haves:**
- [ ] Copy-paste embed code works
- [ ] Documentation covers all attributes
- [ ] Browser support clearly stated

## Phase Verification Summary

| Requirement | Status | Verification Method |
|------------|--------|---------------------|
| EMBED-01 | ✅ | Script tag with data attributes creates widget |
| EMBED-02 | ✅ | Shadow DOM isolates widget styles |
| CORE-01 | ✅ | FastAPI + OpenAPI at /docs |
| CORE-02 | ✅ | SSE streaming on POST /api/v1/chat |

**Functional Tests:**
1. Single-script embed works on test page
2. Widget styles don't leak to host page
3. Host styles don't affect widget
4. Streaming response completes within 3 seconds
5. OpenAPI docs load correctly

---
