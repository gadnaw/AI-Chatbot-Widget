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

## How It Works

1. **Script Loading**: The widget.js script loads and initializes automatically
2. **Iframe Creation**: Creates an isolated iframe for the chat widget
3. **Configuration**: Receives API key and widget ID via data attributes
4. **Chat Interface**: Renders the chat bubble and window inside the iframe
5. **API Communication**: Sends/receives messages via your configured backend

## Customization

Coming in Phase 3:
- Color customization
- Position adjustment (bottom-left, top-right, etc.)
- Welcome message configuration
- Custom branding

## Security

- Widget runs in isolated iframe with Shadow DOM
- All API requests include your API key in X-API-Key header
- CORS configured to allow requests from your domain
- No external dependencies loaded besides CDN

## Support

- Documentation: https://docs.a4-ai.com
- Email: support@a4-ai.com
