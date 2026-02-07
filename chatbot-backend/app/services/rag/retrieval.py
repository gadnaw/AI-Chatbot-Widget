"""
Similarity Search Service Implementation
Phase 2 Wave 3: Similarity Search Service Implementation

This module implements the similarity search service with pgvector cosine distance
for semantic retrieval of document chunks with tenant isolation.
"""

import time
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.models.rag import (
    DocumentChunkResponse,
    RetrievedChunk,
    SimilaritySearchRequest,
    SimilaritySearchResult,
)
from app.services.rag.embeddings import EmbeddingService
from sqlalchemy import text
from sqlalchemy.orm import Session


class SimilaritySearchService:
    """
    Service for performing semantic similarity search across document chunks.

    Uses pgvector cosine distance for finding semantically similar content
    with complete tenant isolation enforced via RLS policies.

    Attributes:
        embedding_service: Service for generating query embeddings
        db: Database session for executing pgvector queries
    """

    def __init__(self, embedding_service: EmbeddingService, db: Session):
        """
        Initialize the similarity search service.

        Args:
            embedding_service: Service for generating embeddings
            db: Database session for executing queries
        """
        self.embedding_service = embedding_service
        self.db = db

    async def search(
        self,
        tenant_id: str,
        query: str,
        similarity_threshold: float = 0.7,
        max_results: int = 5,
        filters: Optional[Dict[str, Any]] = None,
    ) -> SimilaritySearchResult:
        """
        Perform similarity search for document chunks.

        This method:
        1. Generates an embedding for the search query
        2. Executes pgvector similarity search with tenant filtering
        3. Filters results by similarity threshold
        4. Enriches results with source attribution metadata
        5. Calculates average similarity score

        Args:
            tenant_id: UUID of the tenant performing the search
            query: Search query text
            similarity_threshold: Minimum similarity score (0.1-1.0, default 0.7)
            max_results: Maximum number of results to return (1-20, default 5)
            filters: Optional filters for document_ids and source_types

        Returns:
            SimilaritySearchResult with enriched chunks and metadata
        """
        start_time = int(time.time() * 1000)

        # Step 1: Generate query embedding
        query_embedding = await self.embedding_service.embed_query(query)

        # Step 2: Execute pgvector similarity search
        results = await self._execute_similarity_search(
            tenant_id=tenant_id,
            query_embedding=query_embedding,
            similarity_threshold=similarity_threshold,
            max_results=max_results * 2,  # Get extra for filtering
            filters=filters,
        )

        # Step 3: Filter by similarity threshold and limit results
        filtered_results = [
            r for r in results if r.get("similarity", 0) >= similarity_threshold
        ][:max_results]

        # Step 4: Enrich with source attribution
        enriched_results = await self._enrich_with_source_info(
            tenant_id=tenant_id, chunks=filtered_results
        )

        # Step 5: Calculate average similarity
        avg_similarity = (
            sum(r["similarity"] for r in enriched_results) / len(enriched_results)
            if enriched_results
            else 0.0
        )

        end_time = int(time.time() * 1000)
        search_time_ms = end_time - start_time

        return SimilaritySearchResult(
            chunks=[
                DocumentChunkResponse(
                    id=chunk["id"],
                    document_id=chunk["document_id"],
                    chunk_index=chunk.get("chunk_index", 0),
                    content=chunk["content"],
                    source_type=chunk.get("source_type", "text"),
                    source_page_ref=chunk.get("source_page_ref"),
                    source_url=chunk.get("source_url"),
                    hierarchy_path=chunk.get("hierarchy_path"),
                    word_count=chunk.get("word_count"),
                    char_count=chunk.get("char_count"),
                    similarity=chunk["similarity"],
                )
                for chunk in enriched_results
            ],
            total_found=len(results),
            query=query,
            similarity_threshold=similarity_threshold,
            avg_similarity=avg_similarity,
            search_time_ms=search_time_ms,
        )

    async def _execute_similarity_search(
        self,
        tenant_id: str,
        query_embedding: List[float],
        similarity_threshold: float,
        max_results: int,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Execute pgvector similarity search RPC with tenant filtering.

        Uses the similarity_search RPC function with cosine distance (<=>).
        RLS policies ensure tenant isolation at the database level.

        Args:
            tenant_id: Tenant UUID for filtering
            query_embedding: Query embedding vector
            similarity_threshold: Minimum similarity score
            max_results: Maximum results to fetch
            filters: Optional document_ids and source_types filters

        Returns:
            List of chunk dictionaries with distance and metadata
        """
        # pgvector uses distance, so we invert the threshold
        distance_threshold = 1 - similarity_threshold

        # Build filter conditions
        filter_conditions = ""
        filter_params = {
            "query_embedding": query_embedding,
            "match_threshold": distance_threshold,
            "match_count": max_results,
            "tenant_filter": tenant_id,
        }

        if filters:
            if filters.get("document_ids"):
                doc_ids = [str(doc_id) for doc_id in filters["document_ids"]]
                filter_conditions += f" AND document_id::text = ANY(:document_ids)"
                filter_params["document_ids"] = doc_ids

            if filters.get("source_types"):
                source_types = filters["source_types"]
                if source_types:
                    filter_conditions += f" AND source_type = ANY(:source_types)"
                    filter_params["source_types"] = source_types

        # Execute similarity search RPC
        # The RPC function handles cosine distance calculation and tenant filtering
        sql = text(f"""
            SELECT 
                id,
                document_id,
                chunk_index,
                content,
                source_type,
                source_page_ref,
                source_url,
                hierarchy_path,
                word_count,
                char_count,
                embedding <=> :query_embedding as distance
            FROM app_private.document_chunks
            WHERE tenant_id = :tenant_filter
                AND embedding IS NOT NULL
                AND (embedding <=> :query_embedding) < :match_threshold
                {filter_conditions}
            ORDER BY embedding <=> :query_embedding
            LIMIT :match_count
        """)

        result = self.db.execute(sql, filter_params)
        rows = result.fetchall()

        # Convert to dictionaries with similarity calculated from distance
        return [
            {
                "id": row[0],
                "document_id": row[1],
                "chunk_index": row[2],
                "content": row[3],
                "source_type": row[4],
                "source_page_ref": row[5],
                "source_url": row[6],
                "hierarchy_path": row[7] if row[7] else None,
                "word_count": row[8],
                "char_count": row[9],
                "distance": row[10],
                "similarity": 1 - row[10],  # Convert distance to similarity
            }
            for row in rows
        ]

    async def _enrich_with_source_info(
        self, tenant_id: str, chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Enrich chunk results with document source attribution information.

        Fetches document details (title, URL) and adds hierarchy context
        to provide complete source attribution for citations.

        Args:
            tenant_id: Tenant UUID for database access
            chunks: List of chunk dictionaries from similarity search

        Returns:
            List of enriched chunk dictionaries with document metadata
        """
        if not chunks:
            return []

        # Get unique document IDs
        document_ids = list(set(chunk["document_id"] for chunk in chunks))

        # Fetch document details
        documents_sql = text("""
            SELECT id, title, source_url
            FROM app_private.documents
            WHERE id = ANY(:document_ids)
                AND tenant_id = :tenant_id
        """)

        result = self.db.execute(
            documents_sql, {"document_ids": document_ids, "tenant_id": tenant_id}
        )
        document_rows = result.fetchall()

        # Build document lookup
        document_lookup = {
            str(row[0]): {"title": row[1], "source_url": row[2]}
            for row in document_rows
        }

        # Enrich each chunk with document information
        enriched_chunks = []
        for chunk in chunks:
            doc_info = document_lookup.get(str(chunk["document_id"]), {})

            enriched_chunk = {
                **chunk,
                "document_title": doc_info.get("title", "Unknown Document"),
                "source_url": chunk.get("source_url") or doc_info.get("source_url"),
                "hierarchy_path": chunk.get("hierarchy_path") or [],
            }

            enriched_chunks.append(enriched_chunk)

        return enriched_chunks

    async def get_relevant_chunks(
        self, tenant_id: str, query: str, max_chunks: int = 5
    ) -> List[RetrievedChunk]:
        """
        Get relevant chunks for LLM context with default threshold.

        Convenience method for chatbot integration with sensible defaults.

        Args:
            tenant_id: Tenant UUID
            query: Search query
            max_chunks: Maximum chunks to retrieve (default 5)

        Returns:
            List of RetrievedChunk objects with source attribution
        """
        result = await self.search(
            tenant_id=tenant_id,
            query=query,
            similarity_threshold=0.7,
            max_results=max_chunks,
        )

        return [
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

    async def health_check(self, tenant_id: str) -> Dict[str, Any]:
        """
        Check similarity search service health for a tenant.

        Verifies database connectivity and returns service status.

        Args:
            tenant_id: Tenant UUID to check access for

        Returns:
            Health status dictionary
        """
        try:
            # Test database connection with tenant context
            test_sql = text("""
                SELECT COUNT(*) 
                FROM app_private.document_chunks 
                WHERE tenant_id = :tenant_id 
                LIMIT 1
            """)

            result = self.db.execute(test_sql, {"tenant_id": tenant_id})
            count = result.scalar()

            return {
                "status": "healthy",
                "tenant_id": tenant_id,
                "chunks_accessible": True,
                "database_connection": "active",
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "tenant_id": tenant_id,
                "error": str(e),
                "database_connection": "failed",
            }


class SearchResult:
    """
    Internal data class for search results.

    Used during search processing before conversion to API response.
    """

    def __init__(
        self,
        chunks: List[Dict[str, Any]],
        total_found: int,
        query: str,
        similarity_threshold: float,
        avg_similarity: float,
        search_time_ms: int,
    ):
        self.chunks = chunks
        self.total_found = total_found
        self.query = query
        self.similarity_threshold = similarity_threshold
        self.avg_similarity = avg_similarity
        self.search_time_ms = search_time_ms

    def to_api_response(self) -> SimilaritySearchResult:
        """Convert to API response model."""
        return SimilaritySearchResult(
            chunks=[
                DocumentChunkResponse(
                    id=chunk["id"],
                    document_id=chunk["document_id"],
                    chunk_index=chunk.get("chunk_index", 0),
                    content=chunk["content"],
                    source_type=chunk.get("source_type", "text"),
                    source_page_ref=chunk.get("source_page_ref"),
                    source_url=chunk.get("source_url"),
                    hierarchy_path=chunk.get("hierarchy_path"),
                    word_count=chunk.get("word_count"),
                    char_count=chunk.get("char_count"),
                    similarity=chunk.get("similarity", 0.0),
                )
                for chunk in self.chunks
            ],
            total_found=self.total_found,
            query=self.query,
            similarity_threshold=self.similarity_threshold,
            avg_similarity=self.avg_similarity,
            search_time_ms=self.search_time_ms,
        )
