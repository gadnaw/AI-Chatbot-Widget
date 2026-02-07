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
