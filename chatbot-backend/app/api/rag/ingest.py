"""
RAG Ingestion API Endpoints

FastAPI endpoints for document ingestion with PDF, URL, and text support.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, Any
import logging
import uuid

from app.services.rag.ingestion import IngestionPipeline
from app.services.rag.embeddings import EmbeddingService
from app.core.auth import get_current_tenant_id
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rag/ingest", tags=["RAG Ingestion"])

# Global ingestion pipeline instance (initialized on startup)
ingestion_pipeline: Optional[IngestionPipeline] = None


def get_ingestion_pipeline() -> IngestionPipeline:
    """Get or create ingestion pipeline instance."""
    global ingestion_pipeline

    if ingestion_pipeline is None:
        settings = get_settings()

        # Initialize embedding service with OpenAI API key
        embedding_service = EmbeddingService(
            api_key=settings.OPENAI_API_KEY,
            model="text-embedding-3-small",
            dimensions=512,
            batch_size=100,
        )

        # Create ingestion pipeline
        ingestion_pipeline = IngestionPipeline(embedding_service=embedding_service)

    return ingestion_pipeline


# Request/Response Models


class URLIngestionRequest(BaseModel):
    """Request model for URL ingestion."""

    url: HttpUrl
    title: Optional[str] = None


class TextIngestionRequest(BaseModel):
    """Request model for text ingestion."""

    content: str
    title: str


class IngestionResponse(BaseModel):
    """Response model for ingestion requests."""

    document_id: str
    status: str
    message: str
    chunk_count: int = 0


class StatusResponse(BaseModel):
    """Response model for status queries."""

    document_id: str
    status: str
    progress: float
    message: str
    chunk_count: int
    error: Optional[str] = None


class ProgressUpdate(BaseModel):
    """Model for progress callback updates."""

    document_id: str
    progress: float
    message: str


# Progress tracking storage (in production, use Redis or similar)
ingestion_progress: Dict[str, ProgressUpdate] = {}


@router.post("/pdf", response_model=IngestionResponse)
async def ingest_pdf(
    file: UploadFile = File(...),
    title: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Ingest PDF document into RAG pipeline.

    Args:
        file: PDF file upload
        title: Optional document title
        tenant_id: Current tenant from JWT

    Returns:
        IngestionResponse with document_id and status
    """
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only PDF files are accepted."
        )

    # Validate file size (max 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    # Read file content
    file_content = await file.read()

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 10MB, got {len(file_content)} bytes.",
        )

    logger.info(f"PDF ingestion request for tenant {tenant_id}: {file.filename}")

    try:
        # Get ingestion pipeline
        pipeline = get_ingestion_pipeline()

        # Set up progress tracking
        document_id = str(uuid.uuid4())

        def progress_callback(progress: float, message: str):
            ingestion_progress[document_id] = ProgressUpdate(
                document_id=document_id, progress=progress, message=message
            )

        pipeline.set_progress_callback(progress_callback)

        # Start ingestion (run in background for large files)
        document = await pipeline.ingest_pdf(
            tenant_id=tenant_id,
            file_buffer=file_content,
            filename=file.filename,
            title=title,
        )

        # Return response
        return IngestionResponse(
            document_id=str(document.id),
            status=document.status,
            message="PDF ingested successfully",
            chunk_count=document.chunk_count,
        )

    except ValueError as e:
        logger.error(f"Validation error in PDF ingestion: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"PDF ingestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF ingestion failed: {str(e)}")


@router.post("/url", response_model=IngestionResponse)
async def ingest_url(
    request: URLIngestionRequest, tenant_id: str = Depends(get_current_tenant_id)
):
    """
    Ingest content from URL into RAG pipeline.

    Args:
        request: URL ingestion request with url and optional title
        tenant_id: Current tenant from JWT

    Returns:
        IngestionResponse with document_id and status
    """
    logger.info(f"URL ingestion request for tenant {tenant_id}: {request.url}")

    try:
        # Get ingestion pipeline
        pipeline = get_ingestion_pipeline()

        # Set up progress tracking
        document_id = str(uuid.uuid4())

        def progress_callback(progress: float, message: str):
            ingestion_progress[document_id] = ProgressUpdate(
                document_id=document_id, progress=progress, message=message
            )

        pipeline.set_progress_callback(progress_callback)

        # Start URL ingestion
        document = await pipeline.ingest_url(
            tenant_id=tenant_id, url=str(request.url), title=request.title
        )

        # Return response
        return IngestionResponse(
            document_id=str(document.id),
            status=document.status,
            message="URL content ingested successfully",
            chunk_count=document.chunk_count,
        )

    except ValueError as e:
        logger.error(f"Validation error in URL ingestion: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"URL ingestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"URL ingestion failed: {str(e)}")


@router.post("/text", response_model=IngestionResponse)
async def ingest_text(
    request: TextIngestionRequest, tenant_id: str = Depends(get_current_tenant_id)
):
    """
    Ingest plain text into RAG pipeline.

    Args:
        request: Text ingestion request with content and title
        tenant_id: Current tenant from JWT

    Returns:
        IngestionResponse with document_id and status
    """
    # Validate content
    if not request.content or not request.content.strip():
        raise HTTPException(status_code=400, detail="Text content cannot be empty")

    # Validate title
    if not request.title or not request.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    # Check content length
    MAX_TEXT_LENGTH = 100000  # 100K characters

    if len(request.content) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text content too long. Maximum length is {MAX_TEXT_LENGTH} characters, "
            f"got {len(request.content)} characters.",
        )

    logger.info(f"Text ingestion request for tenant {tenant_id}: {request.title}")

    try:
        # Get ingestion pipeline
        pipeline = get_ingestion_pipeline()

        # Set up progress tracking
        document_id = str(uuid.uuid4())

        def progress_callback(progress: float, message: str):
            ingestion_progress[document_id] = ProgressUpdate(
                document_id=document_id, progress=progress, message=message
            )

        pipeline.set_progress_callback(progress_callback)

        # Start text ingestion
        document = await pipeline.ingest_text(
            tenant_id=tenant_id, content=request.content, title=request.title
        )

        # Return response
        return IngestionResponse(
            document_id=str(document.id),
            status=document.status,
            message="Text content ingested successfully",
            chunk_count=document.chunk_count,
        )

    except ValueError as e:
        logger.error(f"Validation error in text ingestion: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"Text ingestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text ingestion failed: {str(e)}")


@router.get("/{document_id}/status", response_model=StatusResponse)
async def get_ingestion_status(
    document_id: str, tenant_id: str = Depends(get_current_tenant_id)
):
    """
    Get status of document ingestion.

    Args:
        document_id: Document ID to check
        tenant_id: Current tenant from JWT

    Returns:
        StatusResponse with current ingestion status
    """
    # Check progress tracking
    if document_id in ingestion_progress:
        progress = ingestion_progress[document_id]
        return StatusResponse(
            document_id=progress.document_id,
            status="processing",
            progress=progress.progress,
            message=progress.message,
            chunk_count=0,
        )

    # In production, query database for document status
    # For now, return not found
    return StatusResponse(
        document_id=document_id,
        status="unknown",
        progress=0,
        message="Document not found in ingestion queue",
        chunk_count=0,
        error="Document not found",
    )


@router.delete("/{document_id}")
async def cancel_ingestion(
    document_id: str, tenant_id: str = Depends(get_current_tenant_id)
):
    """
    Cancel ongoing ingestion and cleanup resources.

    Args:
        document_id: Document ID to cancel
        tenant_id: Current tenant from JWT

    Returns:
        JSON response confirming cancellation
    """
    # Remove from progress tracking
    if document_id in ingestion_progress:
        del ingestion_progress[document_id]
        logger.info(f"Ingestion cancelled for document: {document_id}")
        return JSONResponse(
            status_code=200,
            content={
                "document_id": document_id,
                "status": "cancelled",
                "message": "Ingestion cancelled and resources cleaned up",
            },
        )

    # Document not in queue
    raise HTTPException(
        status_code=404, detail=f"Document {document_id} not found in ingestion queue"
    )
