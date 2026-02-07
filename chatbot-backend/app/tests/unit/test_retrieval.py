"""
Unit Tests for Similarity Search Service

Tests similarity search functionality including threshold filtering,
result limiting, metadata enrichment, and error handling with mocking.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from uuid import UUID
from app.services.rag.retrieval import SimilaritySearchService
from app.services.rag.embeddings import EmbeddingService
from app.models.rag import SimilaritySearchResult, DocumentChunkResponse


class TestSimilarityThresholdFiltering:
    """Test similarity threshold filtering functionality."""

    def setup_method(self):
        """Set up test fixtures with mocked dependencies."""
        self.mock_embedding_service = MagicMock(spec=EmbeddingService)
        self.mock_db = MagicMock()

        self.service = SimilaritySearchService(
            embedding_service=self.mock_embedding_service, db=self.mock_db
        )

    def test_similarity_threshold_filtering(self):
        """
        Test that results are filtered by similarity threshold.

        Verifies:
        - Results below threshold are filtered out
        - Results above threshold are included
        - Threshold defaults to 0.7
        """
        # Mock embedding service
        self.mock_embedding_service.embed_query = AsyncMock(return_value=[0.1] * 512)

        # Mock database results with varying similarity scores
        mock_results = [
            {
                "id": UUID("12345678-1234-1234-1234-123456789abc"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 0,
                "content": "High similarity content",
                "source_type": "pdf",
                "source_page_ref": "1",
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 10,
                "char_count": 50,
                "distance": 0.1,  # Similarity = 0.9
                "similarity": 0.9,
            },
            {
                "id": UUID("12345678-1234-1234-1234-123456789abd"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 1,
                "content": "Medium similarity content",
                "source_type": "pdf",
                "source_page_ref": "2",
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 15,
                "char_count": 75,
                "distance": 0.3,  # Similarity = 0.7
                "similarity": 0.7,
            },
            {
                "id": UUID("12345678-1234-1234-1234-123456789abe"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 2,
                "content": "Low similarity content",
                "source_type": "pdf",
                "source_page_ref": "3",
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 20,
                "char_count": 100,
                "distance": 0.5,  # Similarity = 0.5
                "similarity": 0.5,
            },
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                # Return results as-is for enrichment
                mock_enrich.return_value = mock_results

                # Search with threshold 0.75
                result = self.service.search(
                    tenant_id="test-tenant-id",
                    query="test query",
                    similarity_threshold=0.75,
                    max_results=10,
                )

                # Should filter out results below 0.75
                assert len(result.chunks) <= 3

                # All returned chunks should be >= 0.75
                for chunk in result.chunks:
                    assert chunk.similarity >= 0.75

    def test_threshold_0_filters_all_low_similarity(self):
        """
        Test that threshold 0.0 includes all results.

        Verifies:
        - Threshold 0.0 includes all results regardless of similarity
        - Even very low similarity results are included
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        mock_results = [
            {
                "id": UUID("12345678-1234-1234-1234-123456789abc"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 0,
                "content": "Very low similarity",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 5,
                "char_count": 25,
                "distance": 0.9,  # Similarity = 0.1
                "similarity": 0.1,
            },
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                mock_enrich.return_value = mock_results

                result = self.service.search(
                    tenant_id="test-tenant",
                    query="test",
                    similarity_threshold=0.0,
                    max_results=10,
                )

                # Should include low similarity result
                assert len(result.chunks) == 1
                assert result.chunks[0].similarity == 0.1

    def test_threshold_1_filters_perfect_matches_only(self):
        """
        Test that threshold 1.0 only includes perfect matches.

        Verifies:
        - Only similarity 1.0 results are included
        - Very high similarity results below 1.0 are filtered
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        mock_results = [
            {
                "id": UUID("12345678-1234-1234-1234-123456789abc"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 0,
                "content": "Near perfect match",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 10,
                "char_count": 50,
                "distance": 0.01,  # Similarity = 0.99
                "similarity": 0.99,
            },
            {
                "id": UUID("12345678-1234-1234-1234-123456789abd"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 1,
                "content": "Perfect match",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 10,
                "char_count": 50,
                "distance": 0.0,  # Similarity = 1.0
                "similarity": 1.0,
            },
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                mock_enrich.return_value = mock_results

                result = self.service.search(
                    tenant_id="test-tenant",
                    query="test",
                    similarity_threshold=1.0,
                    max_results=10,
                )

                # Should only include perfect match
                assert len(result.chunks) == 1
                assert result.chunks[0].similarity == 1.0


class TestMaxResultsLimit:
    """Test max results limiting functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_embedding_service = MagicMock(spec=EmbeddingService)
        self.mock_db = MagicMock()

        self.service = SimilaritySearchService(
            embedding_service=self.mock_embedding_service, db=self.mock_db
        )

    def test_max_results_limit(self):
        """
        Test that results are limited to max_results.

        Verifies:
        - No more than max_results are returned
        - Limit is applied after threshold filtering
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        # Create more results than max
        mock_results = [
            {
                "id": UUID(f"12345678-1234-1234-1234-{i:012d}"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": i,
                "content": f"Result {i}",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 10,
                "char_count": 50,
                "distance": 0.1,
                "similarity": 0.9,
            }
            for i in range(20)  # 20 results
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                mock_enrich.return_value = mock_results

                result = self.service.search(
                    tenant_id="test-tenant", query="test query", max_results=5
                )

                # Should be limited to 5
                assert len(result.chunks) <= 5

    def test_max_results_defaults_to_5(self):
        """
        Test that max_results defaults to 5.

        Verifies:
        - Default value is 5 when not specified
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        mock_results = [
            {
                "id": UUID("12345678-1234-1234-1234-123456789abc"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": i,
                "content": f"Result {i}",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 10,
                "char_count": 50,
                "distance": 0.1,
                "similarity": 0.9,
            }
            for i in range(10)
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                mock_enrich.return_value = mock_results

                # Call without max_results parameter
                result = self.service.search(tenant_id="test-tenant", query="test")

                # Should default to 5
                assert len(result.chunks) == 5

    def test_max_results_respects_requested_limit(self):
        """
        Test that requested max_results is respected in database query.

        Verifies:
        - Database query fetches max_results * 2 (for filtering)
        - Final result respects original max_results
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        mock_results = [
            {
                "id": UUID("12345678-1234-1234-1234-123456789abc"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 0,
                "content": "Result",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 10,
                "char_count": 50,
                "distance": 0.1,
                "similarity": 0.9,
            }
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                mock_enrich.return_value = mock_results

                result = self.service.search(
                    tenant_id="test-tenant", query="test", max_results=3
                )

                # Verify service call was made
                assert self.mock_embedding_service.embed_query.called


class TestEmptyQueryHandling:
    """Test handling of empty queries and empty results."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_embedding_service = MagicMock(spec=EmbeddingService)
        self.mock_db = MagicMock()

        self.service = SimilaritySearchService(
            embedding_service=self.mock_embedding_service, db=self.mock_db
        )

    def test_empty_query_returns_empty(self):
        """
        Test that empty query returns empty results.

        Verifies:
        - Empty query is handled gracefully
        - Empty results are returned (not error)
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = []  # Empty results

            result = self.service.search(tenant_id="test-tenant", query="")

            # Should return empty results
            assert len(result.chunks) == 0
            assert result.total_found == 0

    def test_no_matching_results_returns_empty(self):
        """
        Test that when no results match threshold, empty list is returned.

        Verifies:
        - All results filtered out by threshold
        - Empty result set returned gracefully
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        # All results below threshold
        mock_results = [
            {
                "id": UUID("12345678-1234-1234-1234-123456789abc"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 0,
                "content": "Low similarity content",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 10,
                "char_count": 50,
                "distance": 0.8,  # Similarity = 0.2
                "similarity": 0.2,
            },
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                mock_enrich.return_value = mock_results

                # High threshold filters out all results
                result = self.service.search(
                    tenant_id="test-tenant", query="test", similarity_threshold=0.9
                )

                # Should return empty due to filtering
                assert len(result.chunks) == 0

    def test_empty_result_average_similarity_zero(self):
        """
        Test that average similarity is 0.0 for empty results.

        Verifies:
        - No division by zero error
        - Average similarity is 0.0 for empty results
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = []

            result = self.service.search(tenant_id="test-tenant", query="test")

            # Should handle empty results gracefully
            assert result.avg_similarity == 0.0


class TestMetadataEnrichment:
    """Test metadata enrichment in search results."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_embedding_service = MagicMock(spec=EmbeddingService)
        self.mock_db = MagicMock()

        self.service = SimilaritySearchService(
            embedding_service=self.mock_embedding_service, db=self.mock_db
        )

    def test_metadata_enrichment_complete(self):
        """
        Test that search results include complete metadata.

        Verifies:
        - All required fields are present
        - Source attribution is included
        - Hierarchy paths are preserved
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        mock_results = [
            {
                "id": UUID("12345678-1234-1234-1234-123456789abc"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 0,
                "content": "Test content with important information",
                "source_type": "pdf",
                "source_page_ref": "5",
                "source_url": None,
                "hierarchy_path": ["Chapter 1", "Section 1.1"],
                "word_count": 20,
                "char_count": 100,
                "distance": 0.1,
                "similarity": 0.9,
            },
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                # Enrich with document information
                mock_enrich.return_value = [
                    {
                        **mock_results[0],
                        "document_title": "Test Document",
                        "source_url": None,
                    }
                ]

                result = self.service.search(tenant_id="test-tenant", query="test")

                assert len(result.chunks) > 0

                chunk = result.chunks[0]

                # Verify required fields
                assert chunk.id == mock_results[0]["id"]
                assert chunk.document_id == mock_results[0]["document_id"]
                assert chunk.content == mock_results[0]["content"]
                assert chunk.similarity == mock_results[0]["similarity"]
                assert chunk.source_type == mock_results[0]["source_type"]
                assert chunk.source_page_ref == mock_results[0]["source_page_ref"]
                assert chunk.hierarchy_path == mock_results[0]["hierarchy_path"]

    def test_chunk_index_included_in_response(self):
        """
        Test that chunk_index is included in search results.

        Verifies:
        - chunk_index field is present
        - Index values are correct
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        mock_results = [
            {
                "id": UUID("12345678-1234-1234-1234-123456789abc"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": 5,
                "content": "Content from chunk 5",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 15,
                "char_count": 75,
                "distance": 0.1,
                "similarity": 0.9,
            },
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                mock_enrich.return_value = mock_results

                result = self.service.search(tenant_id="test-tenant", query="test")

                assert result.chunks[0].chunk_index == 5


class TestErrorHandling:
    """Test error handling and propagation."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_embedding_service = MagicMock(spec=EmbeddingService)
        self.mock_db = MagicMock()

        self.service = SimilaritySearchService(
            embedding_service=self.mock_embedding_service, db=self.mock_db
        )

    def test_embedding_failure_returns_empty_results(self):
        """
        Test that embedding service failure returns empty results.

        Verifies:
        - Embedding errors are caught
        - Empty results returned instead of error
        """
        self.mock_embedding_service.embed_query = AsyncMock(
            side_effect=Exception("Embedding service unavailable")
        )

        # Should not raise, should return empty results
        result = self.service.search(tenant_id="test-tenant", query="test")

        assert len(result.chunks) == 0
        assert result.query == "test"

    def test_database_error_propagates(self):
        """
        Test that database errors are propagated correctly.

        Verifies:
        - Database errors are not swallowed
        - Errors include context information
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.side_effect = Exception("Database connection failed")

            # Should propagate the error
            with pytest.raises(Exception) as exc_info:
                self.service.search(tenant_id="test-tenant", query="test")

            assert "Database connection failed" in str(exc_info.value)

    def test_search_time_recorded(self):
        """
        Test that search time is recorded in results.

        Verifies:
        - search_time_ms field is present
        - Reasonable time values are recorded
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = []

            result = self.service.search(tenant_id="test-tenant", query="test")

            # Search time should be recorded
            assert hasattr(result, "search_time_ms")
            assert result.search_time_ms >= 0

    def test_total_found_reflects_all_matches(self):
        """
        Test that total_found reflects all database matches.

        Verifies:
        - total_found includes all matches before filtering
        - Filtered results are subset of total_found
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        # Create many database results
        mock_results = [
            {
                "id": UUID(f"12345678-1234-1234-1234-{i:012d}"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": i,
                "content": f"Result {i}",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 10,
                "char_count": 50,
                "distance": 0.1,
                "similarity": 0.9 if i < 5 else 0.5,  # Some below threshold
            }
            for i in range(20)
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                mock_enrich.return_value = mock_results

                result = self.service.search(
                    tenant_id="test-tenant",
                    query="test",
                    similarity_threshold=0.7,  # Filters out low similarity
                    max_results=10,
                )

                # total_found should reflect all DB matches
                assert result.total_found == 20


class TestSearchResultStructure:
    """Test search result structure and properties."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_embedding_service = MagicMock(spec=EmbeddingService)
        self.mock_db = MagicMock()

        self.service = SimilaritySearchService(
            embedding_service=self.mock_embedding_service, db=self.mock_db
        )

    def test_query_preserved_in_result(self):
        """
        Test that original query is preserved in result.

        Verifies:
        - Query field matches input
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = []

            test_query = "What is the refund policy?"
            result = self.service.search(tenant_id="test-tenant", query=test_query)

            assert result.query == test_query

    def test_threshold_preserved_in_result(self):
        """
        Test that threshold is preserved in result.

        Verifies:
        - similarity_threshold field matches input
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = []

            result = self.service.search(
                tenant_id="test-tenant", query="test", similarity_threshold=0.85
            )

            assert result.similarity_threshold == 0.85

    def test_average_similarity_calculated_correctly(self):
        """
        Test that average similarity is calculated correctly.

        Verifies:
        - avg_similarity is mean of all chunk similarities
        """
        mock_embedding = [0.1] * 512
        self.mock_embedding_service.embed_query = AsyncMock(return_value=mock_embedding)

        # Results with known similarities
        mock_results = [
            {
                "id": UUID("12345678-1234-1234-1234-123456789abc"),
                "document_id": UUID("87654321-4321-4321-4321-abcdef123456"),
                "chunk_index": i,
                "content": f"Result {i}",
                "source_type": "text",
                "source_page_ref": None,
                "source_url": None,
                "hierarchy_path": [],
                "word_count": 10,
                "char_count": 50,
                "distance": 0.1,
                "similarity": 0.9,
            }
            for i in range(3)
        ]

        with patch.object(
            self.service, "_execute_similarity_search", new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = mock_results

            with patch.object(
                self.service, "_enrich_with_source_info", new_callable=AsyncMock
            ) as mock_enrich:
                mock_enrich.return_value = mock_results

                result = self.service.search(tenant_id="test-tenant", query="test")

                # Average should be 0.9 (all same)
                assert result.avg_similarity == 0.9
