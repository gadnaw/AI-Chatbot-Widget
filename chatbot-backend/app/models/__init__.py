"""
Models package for chatbot backend.
"""

from app.models.chat import ChatMessage, ChatRequest, ChatResponse
from app.models.rag import (
    DocumentChunkResponse,
    DocumentCreate,
    DocumentResponse,
    DocumentStatus,
    DocumentUpdate,
    IngestionStatus,
    SimilaritySearchRequest,
    SimilaritySearchResult,
    ValidationResult,
)

__all__ = [
    # Chat models
    "ChatMessage",
    "ChatRequest",
    "ChatResponse",
    # RAG models
    "DocumentChunkResponse",
    "DocumentCreate",
    "DocumentResponse",
    "DocumentStatus",
    "DocumentUpdate",
    "IngestionStatus",
    "SimilaritySearchRequest",
    "SimilaritySearchResult",
    "ValidationResult",
]
