"""
RAG Search API Endpoints
Phase 2 Wave 3: Retrieval API Endpoints

FastAPI endpoints for RAG retrieval with similarity search,
tenant isolation, rate limiting, and comprehensive validation.
"""

import time
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from app.core.auth import get_current_user_tenant
from app.models.rag import (
    DocumentChunkResponse,
    RetrievedChunk,
    SimilaritySearchRequest,
    SimilaritySearchResult,
)
from app.services.rag.citations import CitationGenerator
from app.services.rag.embeddings import EmbeddingService
from app.services.rag.retrieval import SimilaritySearchService


# =============================================================================
# Rate Limiting Implementation
# =============================================================================


class RateLimiter:
    """
    Simple in-memory rate limiter for API endpoints.

    Tracks request counts per tenant with automatic expiration.
    In production, use Redis for distributed rate limiting.
    """

    def __init__(self, requests_per_minute: int = 100):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, List[float]] = {}

    def is_rate_limited(self, tenant_id: str) -> tuple[bool, int]:
        """
        Check if tenant is rate limited.

        Args:
            tenant_id: Tenant identifier

        Returns:
            Tuple of (is_limited, retry_after_seconds)
        """
        current_time = time.time()
        minute_ago = current_time - 60

        # Clean old requests
        if tenant_id in self.requests:
            self.requests[tenant_id] = [
                t for t in self.requests[tenant_id] if t > minute_ago
            ]
        else:
            self.requests[tenant_id] = []

        # Check rate limit
        if len(self.requests[tenant_id]) >= self.requests_per_minute:
            # Find oldest request to calculate retry-after
            oldest = min(self.requests[tenant_id])
            retry_after = int(60 - (current_time - oldest)) + 1
            return True, max(1, retry_after)

        # Record this request
        self.requests[tenant_id].append(current_time)
        return False, 0

    def get_remaining(self, tenant_id: str) -> int:
        """Get remaining requests for tenant in current window."""
        current_time = time.time()
        minute_ago = current_time - 60

        if tenant_id not in self.requests:
            return self.requests_per_minute

        recent_requests = len([t for t in self.requests[tenant_id] if t > minute_ago])
        return max(0, self.requests_per_minute - recent_requests)


# Global rate limiter instance
rate_limiter = RateLimiter(requests_per_minute=100)


# =============================================================================
# API Request/Response Models
# =============================================================================


class SearchRequest(BaseModel):
    """
    Request model for similarity search endpoint.

    Provides comprehensive validation for all search parameters.
    """

    query: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="Search query text (10-10000 characters)",
        examples=["How do I reset my password?"],
    )
    similarity_threshold: float = Field(
        default=0.7,
        ge=0.1,
        le=1.0,
        description="Minimum similarity threshold (0.1-1.0, default 0.7)",
    )
    max_results: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum results to return (1-20, default 5)",
    )
    filters: Optional[Dict[str, List[str]]] = Field(
        default=None, description="Optional filters for document_ids and source_types"
    )
    citation_style: str = Field(
        default="numbered",
        pattern="^(numbered|inline|none)$",
        description="Citation style: numbered, inline, or none",
    )

    @field_validator("filters")
    @classmethod
    def validate_filters(
        cls, v: Optional[Dict[str, List[str]]]
    ) -> Optional[Dict[str, List[str]]]:
        """Validate filter parameters."""
        if v is None:
            return v

        # Validate document_ids are valid UUIDs
        if "document_ids" in v:
            for doc_id in v["document_ids"]:
                try:
                    UUID(doc_id)
                except ValueError:
                    raise ValueError(f"Invalid document_id: {doc_id}")

        # Validate source_types
        if "source_types" in v:
            valid_types = {"pdf", "html", "text"}
            for source_type in v["source_types"]:
                if source_type not in valid_types:
                    raise ValueError(
                        f"Invalid source_type: {source_type}. Must be one of {valid_types}"
                    )

        return v


class SearchResponse(BaseModel):
    """
    Response model for similarity search results.

    Includes chunks with similarity scores, source attribution,
    and performance metadata.
    """

    chunks: List[DocumentChunkResponse]
    total_found: int
    query: str
    similarity_threshold: float
    avg_similarity: float
    search_time_ms: int
    citations: Optional[List[str]] = None
    context: Optional[str] = None

    class Config:
        from_attributes = True


class HealthResponse(BaseModel):
    """Response model for search service health check."""

    status: str
    tenant_id: str
    rate_limit_remaining: int
    database_connection: str


# =============================================================================
# API Router
# =============================================================================

router = APIRouter(
    prefix="/api/rag",
    tags=["RAG Search"],
    responses={
        400: {"description": "Invalid request parameters"},
        401: {"description": "Missing or invalid authentication"},
        429: {"description": "Rate limit exceeded"},
        500: {"description": "Internal server error"},
    },
)


# =============================================================================
# Dependency Injection
# =============================================================================


def get_search_service(request: Request) -> SimilaritySearchService:
    """
    Get similarity search service from app state.

    Enables service sharing across endpoint calls.
    """
    return request.state.search_service


def get_citation_generator(request: Request) -> CitationGenerator:
    """Get citation generator from app state."""
    return request.state.citation_generator


# =============================================================================
# API Endpoints
# =============================================================================


@router.post("/search", response_model=SearchResponse)
async def search_documents(
    request: Request,
    search_request: SearchRequest,
    x_tenant_id: str = Header(..., description="Tenant ID from JWT token"),
    current_user_id: str = Depends(get_current_user_tenant),
) -> SearchResponse:
    """
    Perform similarity search across tenant documents.

    **Authentication**: Requires valid JWT token with tenant_id in app_metadata.

    **Rate Limiting**: 100 requests per minute (basic tier).

    **Request Body**:
    - query: Search query text (10-10000 characters)
    - similarity_threshold: Minimum similarity score (0.1-1.0, default 0.7)
    - max_results: Maximum chunks to return (1-20, default 5)
    - filters: Optional filters for document_ids and source_types
    - citation_style: Format for citations (numbered, inline, none)

    **Response**:
    - chunks: Retrieved document chunks with similarity scores
    - total_found: Number of chunks matching threshold
    - avg_similarity: Average similarity of returned chunks
    - search_time_ms: Time taken for search execution
    - citations: Formatted citation strings (if citation_style != none)
    - context: Built context string for LLM consumption (if requested)

    **Example**:
    ```json
    {
        "query": "How do I reset my password?",
        "similarity_threshold": 0.7,
        "max_results": 5,
        "filters": {
            "document_ids": ["uuid1", "uuid2"],
            "source_types": ["pdf", "html"]
        }
    }
    ```
    """
    # Validate tenant_id matches JWT claim
    if x_tenant_id != current_user_id.get("tenant_id"):
        raise HTTPException(
            status_code=401, detail="Tenant ID mismatch between header and token"
        )

    tenant_id = current_user_id.get("tenant_id")

    # Check rate limit
    is_limited, retry_after = rate_limiter.is_rate_limited(tenant_id)
    if is_limited:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Retry after {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    try:
        # Get services from app state
        search_service = get_search_service(request)
        citation_generator = get_citation_generator(request)

        # Convert request to internal model
        internal_request = SimilaritySearchRequest(
            query=search_request.query,
            similarity_threshold=search_request.similarity_threshold,
            max_results=search_request.max_results,
            filters=search_request.filters,
        )

        # Perform search
        start_time = time.time()
        result = await search_service.search(
            tenant_id=tenant_id,
            query=internal_request.query,
            similarity_threshold=internal_request.similarity_threshold,
            max_results=internal_request.max_results,
            filters=internal_request.filters,
        )
        search_time_ms = int((time.time() - start_time) * 1000)

        # Generate citations if requested
        citations = None
        context = None

        if search_request.citation_style != "none" and result.chunks:
            # Convert chunks to RetrievedChunk format for citation generator
            retrieved_chunks = [
                RetrievedChunk(
                    id=chunk.id,
                    document_id=chunk.document_id,
                    document_title=getattr(chunk, "document_title", "Unknown"),
                    content=chunk.content,
                    similarity=chunk.similarity or 0.0,
                    source_type=chunk.source_type,
                    source_page_ref=chunk.source_page_ref,
                    source_url=chunk.source_url,
                    hierarchy_path=chunk.hierarchy_path or [],
                    metadata={},
                )
                for chunk in result.chunks
            ]

            citations = [
                citation_generator.generate_citation(chunk)
                for chunk in retrieved_chunks
            ]

            # Build context with citations if requested
            if search_request.citation_style in ["numbered", "inline"]:
                context, _ = citation_generator.build_context_with_citations(
                    retrieved_chunks,
                    max_chunks=search_request.max_results,
                    max_chars_per_chunk=500,
                )

        return SearchResponse(
            chunks=result.chunks,
            total_found=result.total_found,
            query=result.query,
            similarity_threshold=result.similarity_threshold,
            avg_similarity=result.avg_similarity,
            search_time_ms=search_time_ms,
            citations=citations,
            context=context,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log the error with tenant context for debugging
        # In production, use proper logging
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/search/health")
async def search_health_check(
    request: Request,
    x_tenant_id: str = Header(..., description="Tenant ID from JWT token"),
    current_user_id: Dict = Depends(get_current_user_tenant),
) -> HealthResponse:
    """
    Check search service health for a tenant.

    Verifies database connectivity and returns rate limit status.

    **Response**:
    - status: Service health status (healthy/unhealthy)
    - tenant_id: Current tenant ID
    - rate_limit_remaining: Remaining requests in current window
    - database_connection: Database connection status
    """
    tenant_id = current_user_id.get("tenant_id")

    try:
        # Get services from app state
        search_service = get_search_service(request)

        # Check database health
        health = await search_service.health_check(tenant_id)

        return HealthResponse(
            status=health["status"],
            tenant_id=tenant_id,
            rate_limit_remaining=rate_limiter.get_remaining(tenant_id),
            database_connection=health.get("database_connection", "unknown"),
        )

    except Exception as e:
        return HealthResponse(
            status="unhealthy",
            tenant_id=tenant_id,
            rate_limit_remaining=0,
            database_connection=f"error: {str(e)}",
        )


@router.get("/search/rate-limit")
async def get_rate_limit_status(
    x_tenant_id: str = Header(..., description="Tenant ID from JWT token"),
    current_user_id: Dict = Depends(get_current_user_tenant),
) -> Dict:
    """
    Get current rate limit status for tenant.

    Returns remaining requests in current window and limits.
    """
    tenant_id = current_user_id.get("tenant_id")

    return {
        "tenant_id": tenant_id,
        "requests_per_minute": rate_limiter.requests_per_minute,
        "remaining": rate_limiter.get_remaining(tenant_id),
        "basic_tier": {
            "requests_per_minute": 100,
            "max_results_per_query": 20,
            "similarity_range": "0.1-1.0",
        },
        "enterprise_tier": {
            "requests_per_minute": 1000,
            "max_results_per_query": 50,
            "similarity_range": "0.1-1.0",
        },
    }
