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
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.setAttribute('loading', 'lazy');

  document.body.appendChild(iframe);

  window.addEventListener('message', handleWidgetMessage);

  iframe.onload = () => {
    const targetOrigin = config.apiUrl || '*';
    iframe.contentWindow?.postMessage({
      type: 'INIT',
      config
    }, targetOrigin);
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
