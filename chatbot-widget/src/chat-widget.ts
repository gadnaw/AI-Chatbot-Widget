// chatbot-widget/src/chat-widget.ts
import { LitElement, html, css } from 'lit';
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
