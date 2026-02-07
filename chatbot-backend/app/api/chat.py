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
            {
                "role": "system",
                "content": "You are a helpful customer support assistant.",
            },
            {"role": "user", "content": message},
        ],
        stream=True,
    ):
        content = chunk.choices[0].delta.content
        if content:
            yield {"data": json.dumps({"chunk": content})}


@router.post("/chat")
async def chat_endpoint(
    request: Request,
    x_api_key: str = Header(..., alias="X-API-Key"),
    chat_request: ChatRequest = None,
):
    if chat_request is None:
        raise HTTPException(status_code=400, detail="Invalid request body")

    tenant_id = await validate_api_key(x_api_key)
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return EventSourceResponse(
        generate_stream(tenant_id, chat_request.message), media_type="text/event-stream"
    )


async def validate_api_key(api_key: str) -> str | None:
    # Placeholder: Replace with actual database lookup in Phase 2
    if api_key.startswith("test_"):
        return "test_tenant"
    return None
