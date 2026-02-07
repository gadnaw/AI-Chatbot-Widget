"""
Ingestion Pipeline Orchestration for RAG

Implements end-to-end document ingestion pipeline with progress tracking,
error handling, and status management.
"""

from typing import List, Optional, Callable, Dict, Any
from langchain.schema import Document
import logging
import uuid
from datetime import datetime

from app.services.rag.loaders import get_loader
from app.services.rag.chunking import ChunkingEngine
from app.services.rag.embeddings import EmbeddingService
from app.models.rag import (
    Document as DocumentModel,
    DocumentChunk as DocumentChunkModel,
)
from app.core.database import get_db_session

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """
    End-to-end ingestion pipeline for RAG documents.

    Pipeline stages:
    1. Document Creation - Create document record in database
    2. Content Loading - Extract raw text from source
    3. Chunking - Apply type-specific chunking strategy
    4. Embedding - Generate embeddings for all chunks
    5. Storage - Store chunks with embeddings in pgvector
    6. Completion - Update document status
    """

    def __init__(
        self,
        embedding_service: EmbeddingService,
        chunking_engine: Optional[ChunkingEngine] = None,
    ):
        """
        Initialize ingestion pipeline.

        Args:
            embedding_service: Service for generating embeddings
            chunking_engine: Optional chunking engine (created if not provided)
        """
        self.embedding_service = embedding_service
        self.chunking_engine = chunking_engine or ChunkingEngine()

        # Progress callback for status updates
        self._progress_callback: Optional[Callable[[float, str], None]] = None

    def set_progress_callback(self, callback: Callable[[float, str], None]) -> None:
        """
        Set callback for progress updates.

        Args:
            callback: Function called with (progress_percentage, status_message)
        """
        self._progress_callback = callback

    def _update_progress(self, progress: float, message: str) -> None:
        """
        Update progress and call callback if set.

        Args:
            progress: Progress percentage (0-100)
            message: Status message
        """
        logger.info(f"Ingestion progress: {progress:.1f}% - {message}")

        if self._progress_callback:
            try:
                self._progress_callback(progress, message)
            except Exception as e:
                logger.warning(f"Progress callback failed: {str(e)}")

    async def ingest_pdf(
        self,
        tenant_id: str,
        file_buffer: bytes,
        filename: str,
        title: Optional[str] = None,
    ) -> DocumentModel:
        """
        Ingest PDF document into RAG pipeline.

        Args:
            tenant_id: Tenant identifier for isolation
            file_buffer: PDF file content as bytes
            filename: Original filename
            title: Optional document title

        Returns:
            Document model with status and metadata
        """
        self._update_progress(5, "Starting PDF ingestion")

        # Create document record
        document = await self._create_document_record(
            tenant_id=tenant_id,
            title=title or filename,
            source_type="pdf",
            source_url=None,
            status="processing",
        )

        try:
            # Stage 1: Load content (10% → 30%)
            self._update_progress(10, "Loading PDF content")

            # Get loader for PDF
            loader = get_loader(file_buffer, "pdf")

            # Load document
            docs = loader.load()

            # Add filename to metadata
            for doc in docs:
                doc.metadata["source_path"] = filename

            self._update_progress(30, "PDF content loaded successfully")

            # Stage 2: Chunking (30% → 60%)
            self._update_progress(35, "Chunking PDF document")

            chunks = []
            for doc in docs:
                doc_chunks = await self.chunking_engine.chunk_pdf(doc)
                chunks.extend(doc_chunks)

            self._update_progress(60, f"PDF chunked into {len(chunks)} chunks")

            # Stage 3: Generate embeddings (60% → 90%)
            self._update_progress(65, "Generating embeddings")

            chunks_with_embeddings = await self.embedding_service.batch_embed(chunks)

            self._update_progress(90, "Embeddings generated")

            # Stage 4: Store chunks (90% → 100%)
            self._update_progress(95, "Storing chunks in database")

            await self._store_chunks(document.id, tenant_id, chunks_with_embeddings)

            # Update document status
            document.status = "ready"
            document.chunk_count = len(chunks)
            document.updated_at = datetime.utcnow()

            self._update_progress(100, "PDF ingestion complete")

            return document

        except Exception as e:
            logger.error(f"PDF ingestion failed: {str(e)}")

            # Update document status to error
            document.status = "error"
            document.metadata["error_message"] = str(e)
            document.updated_at = datetime.utcnow()

            # Cleanup: delete document on complete failure
            await self._cleanup_failed_document(document)

            raise

    async def ingest_url(
        self, tenant_id: str, url: str, title: Optional[str] = None
    ) -> DocumentModel:
        """
        Ingest URL content into RAG pipeline.

        Args:
            tenant_id: Tenant identifier for isolation
            url: URL to ingest
            title: Optional document title

        Returns:
            Document model with status and metadata
        """
        self._update_progress(5, "Starting URL ingestion")

        # Create document record
        document = await self._create_document_record(
            tenant_id=tenant_id,
            title=title or url,
            source_type="html",
            source_url=url,
            status="processing",
        )

        try:
            # Stage 1: Load content (10% → 30%)
            self._update_progress(10, f"Fetching content from {url}")

            # Get loader for URL
            loader = get_loader(url, "html")

            # Load document
            docs = loader.load()

            if not docs:
                raise ValueError(f"Failed to load content from URL: {url}")

            # Add URL to metadata
            for doc in docs:
                doc.metadata["source_url"] = url

            self._update_progress(30, "URL content loaded successfully")

            # Stage 2: Chunking (30% → 60%)
            self._update_progress(35, "Chunking HTML content")

            chunks = []
            for doc in docs:
                doc_chunks = await self.chunking_engine.chunk_html(doc)
                chunks.extend(doc_chunks)

            self._update_progress(60, f"Content chunked into {len(chunks)} chunks")

            # Stage 3: Generate embeddings (60% → 90%)
            self._update_progress(65, "Generating embeddings")

            chunks_with_embeddings = await self.embedding_service.batch_embed(chunks)

            self._update_progress(90, "Embeddings generated")

            # Stage 4: Store chunks (90% → 100%)
            self._update_progress(95, "Storing chunks in database")

            await self._store_chunks(document.id, tenant_id, chunks_with_embeddings)

            # Update document status
            document.status = "ready"
            document.chunk_count = len(chunks)
            document.updated_at = datetime.utcnow()

            self._update_progress(100, "URL ingestion complete")

            return document

        except Exception as e:
            logger.error(f"URL ingestion failed: {str(e)}")

            # Update document status to error
            document.status = "error"
            document.metadata["error_message"] = str(e)
            document.updated_at = datetime.utcnow()

            # Cleanup
            await self._cleanup_failed_document(document)

            raise

    async def ingest_text(
        self, tenant_id: str, content: str, title: str
    ) -> DocumentModel:
        """
        Ingest plain text into RAG pipeline.

        Args:
            tenant_id: Tenant identifier for isolation
            content: Text content to ingest
            title: Document title

        Returns:
            Document model with status and metadata
        """
        self._update_progress(5, "Starting text ingestion")

        # Create document record
        document = await self._create_document_record(
            tenant_id=tenant_id,
            title=title,
            source_type="text",
            source_url=None,
            status="processing",
        )

        try:
            # Stage 1: Prepare content (10% → 30%)
            self._update_progress(10, "Preparing text content")

            # Create LangChain Document
            doc = Document(
                page_content=content, metadata={"title": title, "source_type": "text"}
            )

            self._update_progress(30, "Text content prepared")

            # Stage 2: Chunking (30% → 60%)
            self._update_progress(35, "Chunking text content")

            chunks = await self.chunking_engine.chunk_text(doc)

            self._update_progress(60, f"Text chunked into {len(chunks)} chunks")

            # Stage 3: Generate embeddings (60% → 90%)
            self._update_progress(65, "Generating embeddings")

            chunks_with_embeddings = await self.embedding_service.batch_embed(chunks)

            self._update_progress(90, "Embeddings generated")

            # Stage 4: Store chunks (90% → 100%)
            self._update_progress(95, "Storing chunks in database")

            await self._store_chunks(document.id, tenant_id, chunks_with_embeddings)

            # Update document status
            document.status = "ready"
            document.chunk_count = len(chunks)
            document.updated_at = datetime.utcnow()

            self._update_progress(100, "Text ingestion complete")

            return document

        except Exception as e:
            logger.error(f"Text ingestion failed: {str(e)}")

            # Update document status to error
            document.status = "error"
            document.metadata["error_message"] = str(e)
            document.updated_at = datetime.utcnow()

            # Cleanup
            await self._cleanup_failed_document(document)

            raise

    async def _create_document_record(
        self,
        tenant_id: str,
        title: str,
        source_type: str,
        source_url: Optional[str],
        status: str,
    ) -> DocumentModel:
        """
        Create document record in database.

        Args:
            tenant_id: Tenant identifier
            title: Document title
            source_type: Type of source (pdf, html, text)
            source_url: URL if applicable
            status: Initial status

        Returns:
            Created Document model
        """
        # For now, create in-memory document
        # In production, this would create in database
        document = DocumentModel(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            title=title,
            source_type=source_type,
            source_url=source_url,
            content=None,  # Will be set when chunks are stored
            status=status,
            chunk_count=0,
            metadata={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        logger.info(f"Created document record: {document.id} for tenant {tenant_id}")

        return document

    async def _store_chunks(
        self, document_id: str, tenant_id: str, chunks_with_embeddings: List[tuple]
    ) -> None:
        """
        Store document chunks with embeddings in database.

        Args:
            document_id: Parent document ID
            tenant_id: Tenant identifier
            chunks_with_embeddings: List of (Document, embedding) tuples
        """
        chunks_to_store = []

        for idx, (chunk, embedding) in enumerate(chunks_with_embeddings):
            chunk_model = DocumentChunkModel(
                id=uuid.uuid4(),
                document_id=document_id,
                tenant_id=tenant_id,
                chunk_index=idx,
                content=chunk.page_content,
                embedding=embedding,
                metadata=chunk.metadata,
                source_type=chunk.metadata.get("source_type", "unknown"),
                source_page_ref=chunk.metadata.get("source_page_ref"),
                hierarchy_path=chunk.metadata.get("hierarchy_path", []),
                word_count=chunk.metadata.get("word_count", 0),
                char_count=chunk.metadata.get("char_count", 0),
                created_at=datetime.utcnow(),
            )
            chunks_to_store.append(chunk_model)

        logger.info(f"Prepared {len(chunks_to_store)} chunks for storage")

        # In production, batch insert to database
        # For now, just log the storage operation
        for chunk in chunks_to_store:
            logger.debug(f"Chunk {chunk.chunk_index}: {len(chunk.content)} chars")

    async def _cleanup_failed_document(self, document: DocumentModel) -> None:
        """
        Cleanup document on ingestion failure.

        Args:
            document: Failed document to cleanup
        """
        logger.info(f"Cleaning up failed document: {document.id}")

        # In production:
        # 1. Delete any created chunks
        # 2. Update or delete document record
        # 3. Log for monitoring

        # For now, just log the cleanup
        logger.warning(f"Document {document.id} failed with status: {document.status}")

    async def get_ingestion_status(self, document_id: str) -> Dict[str, Any]:
        """
        Get status of ongoing or completed ingestion.

        Args:
            document_id: Document to check

        Returns:
            Status dictionary with current state
        """
        # In production, query database for document status
        return {
            "document_id": document_id,
            "status": "unknown",
            "progress": 0,
            "message": "Status lookup not yet implemented",
            "chunk_count": 0,
            "error": None,
        }
