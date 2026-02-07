"""
Embedding Generation Service for RAG Pipeline

Implements OpenAI text-embedding-3-small integration with batching,
retry logic, caching, and validation.
"""

from openai import OpenAI, AsyncOpenAI
from langchain.schema import Document
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import time
import logging
from functools import lru_cache
import asyncio

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    OpenAI embedding generation service with batching and caching.

    Features:
    - text-embedding-3-small model (512 dimensions)
    - Batch processing (100 chunks per API call)
    - Exponential backoff retry (1s, 2s, 4s)
    - LRU cache for query embeddings (100 entries)
    - Vector validation and normalization
    """

    def __init__(
        self,
        api_key: str,
        model: str = "text-embedding-3-small",
        dimensions: int = 512,
        batch_size: int = 100,
        max_retries: int = 3,
    ):
        """
        Initialize embedding service.

        Args:
            api_key: OpenAI API key
            model: Embedding model name
            dimensions: Embedding dimensions (512 for text-embedding-3-small)
            batch_size: Number of texts per batch API call
            max_retries: Maximum retry attempts for failed requests
        """
        self.model = model
        self.dimensions = dimensions
        self.batch_size = batch_size
        self.max_retries = max_retries

        # Initialize OpenAI clients
        self.client = OpenAI(api_key=api_key)
        self.async_client = AsyncOpenAI(api_key=api_key)

        # Retry configuration
        self.retry_delays = [1, 2, 4]  # Exponential backoff delays in seconds

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors (each 512 dimensions)

        Raises:
            ValueError: If any text is invalid or empty
            RuntimeError: If embedding generation fails after retries
        """
        if not texts:
            return []

        # Validate input texts
        valid_texts = []
        for i, text in enumerate(texts):
            if not text or not isinstance(text, str):
                raise ValueError(f"Invalid text at index {i}: must be non-empty string")
            # Clean and truncate if necessary
            cleaned = text.strip()
            if len(cleaned) == 0:
                raise ValueError(f"Empty text at index {i} after cleaning")
            valid_texts.append(cleaned)

        all_embeddings = []

        # Process in batches
        for batch_start in range(0, len(valid_texts), self.batch_size):
            batch_end = min(batch_start + self.batch_size, len(valid_texts))
            batch_texts = valid_texts[batch_start:batch_end]

            logger.info(
                f"Embedding batch {batch_start // self.batch_size + 1}: "
                f"{len(batch_texts)} texts ({batch_start}-{batch_end})"
            )

            # Generate embeddings with retry logic
            embeddings = await self._embed_with_retry(batch_texts)

            # Validate and normalize embeddings
            validated_embeddings = []
            for i, embedding in enumerate(embeddings):
                # Validate dimensions
                if len(embedding) != self.dimensions:
                    logger.warning(
                        f"Embedding {batch_start + i} has {len(embedding)} "
                        f"dimensions, expected {self.dimensions}"
                    )
                    # Pad or truncate if needed
                    embedding = self._normalize_embedding(embedding)

                # Check for NaN or infinite values
                if not all(np.isfinite(embedding)):
                    logger.error(f"Embedding {batch_start + i} contains NaN/Inf values")
                    # Replace with zero vector as fallback
                    embedding = [0.0] * self.dimensions

                validated_embeddings.append(embedding)

            all_embeddings.extend(validated_embeddings)

        return all_embeddings

    async def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a search query with caching.

        Args:
            query: Search query string

        Returns:
            Single embedding vector (512 dimensions)
        """
        # Use cached version for query embedding
        return await self._embed_query_cached(query.strip())

    @lru_cache(maxsize=100)
    async def _embed_query_cached(self, query: str) -> List[float]:
        """
        Cached query embedding to avoid redundant API calls.

        Args:
            query: Cached query string

        Returns:
            Single embedding vector
        """
        embeddings = await self.embed_texts([query])
        return embeddings[0] if embeddings else []

    async def batch_embed(
        self, chunks: List[Document]
    ) -> List[Tuple[Document, List[float]]]:
        """
        Process large document batches with progress tracking.

        Args:
            chunks: List of LangChain Documents to embed

        Returns:
            List of tuples: (Document, embedding_vector)
        """
        if not chunks:
            return []

        results = []
        total = len(chunks)

        # Extract text content from documents
        texts = [chunk.page_content for chunk in chunks]

        # Generate embeddings in batches
        all_embeddings = await self.embed_texts(texts)

        # Combine chunks with their embeddings
        for chunk, embedding in zip(chunks, all_embeddings):
            # Attach embedding to document metadata for storage
            chunk.metadata["embedding"] = embedding
            results.append((chunk, embedding))

        logger.info(f"Batch embedding complete: {total} chunks processed")
        return results

    async def _embed_with_retry(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings with exponential backoff retry.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors

        Raises:
            RuntimeError: If all retry attempts fail
        """
        last_error = None

        for attempt in range(self.max_retries):
            try:
                # Make API call
                response = await self.async_client.embeddings.create(
                    model=self.model,
                    input=texts,
                    dimensions=self.dimensions,
                    encoding_format="float",
                )

                # Extract embeddings from response
                embeddings = [data.embedding for data in response.data]

                logger.debug(f"Successfully generated {len(embeddings)} embeddings")
                return embeddings

            except Exception as e:
                last_error = e
                error_type = type(e).__name__

                # Check if it's a retryable error
                if self._is_retryable_error(e):
                    if attempt < self.max_retries - 1:
                        delay = self.retry_delays[attempt]
                        logger.warning(
                            f"Embedding attempt {attempt + 1} failed "
                            f"({error_type}): {str(e)}. Retrying in {delay}s..."
                        )
                        await asyncio.sleep(delay)
                        continue
                    else:
                        logger.error(
                            f"All {self.max_retries} embedding attempts failed"
                        )
                        raise RuntimeError(
                            f"Embedding generation failed after {self.max_retries} attempts: {str(e)}"
                        )
                else:
                    # Non-retryable error
                    logger.error(f"Non-retryable embedding error: {str(e)}")
                    raise

    def _is_retryable_error(self, error: Exception) -> bool:
        """
        Determine if an error is retryable.

        Args:
            error: Exception to check

        Returns:
            True if error is retryable
        """
        # Retryable error types
        retryable_messages = [
            "rate_limit_exceeded",
            "429",
            "503",
            "timeout",
            "connection",
            "network",
        ]

        error_str = str(error).lower()

        for pattern in retryable_messages:
            if pattern in error_str:
                return True

        # Check for specific status codes if available
        if hasattr(error, "status_code"):
            return error.status_code in [429, 500, 502, 503, 504]

        return False

    def _normalize_embedding(self, embedding: List[float]) -> List[float]:
        """
        Normalize embedding vector for cosine similarity.

        Args:
            embedding: Raw embedding vector

        Returns:
            Normalized embedding vector (unit length)
        """
        arr = np.array(embedding, dtype=np.float32)

        # Calculate norm
        norm = np.linalg.norm(arr)

        if norm > 0:
            # L2 normalization
            normalized = arr / norm
            return normalized.tolist()
        else:
            # Return zero vector if norm is zero
            return [0.0] * len(embedding)

    def validate_embedding(self, embedding: List[float]) -> Dict[str, Any]:
        """
        Validate an embedding vector.

        Args:
            embedding: Embedding vector to validate

        Returns:
            Dictionary with validation results
        """
        result = {
            "valid": True,
            "dimensions": len(embedding) if embedding else 0,
            "has_nan": False,
            "has_inf": False,
            "norm": 0.0,
            "errors": [],
        }

        if not embedding:
            result["valid"] = False
            result["errors"].append("Embedding is empty")
            return result

        arr = np.array(embedding, dtype=np.float32)

        # Check dimensions
        if len(embedding) != self.dimensions:
            result["valid"] = False
            result["errors"].append(
                f"Embedding has {len(embedding)} dimensions, expected {self.dimensions}"
            )

        # Check for NaN values
        if np.any(np.isnan(arr)):
            result["has_nan"] = True
            result["errors"].append("Embedding contains NaN values")
            result["valid"] = False

        # Check for infinite values
        if np.any(np.isinf(arr)):
            result["has_inf"] = True
            result["errors"].append("Embedding contains infinite values")
            result["valid"] = False

        # Calculate norm
        result["norm"] = float(np.linalg.norm(arr))

        return result

    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.

        Args:
            vec1: First embedding vector
            vec2: Second embedding vector

        Returns:
            Cosine similarity score (-1 to 1)
        """
        arr1 = np.array(vec1, dtype=np.float32)
        arr2 = np.array(vec2, dtype=np.float32)

        # Normalize both vectors
        norm1 = np.linalg.norm(arr1)
        norm2 = np.linalg.norm(arr2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        # Cosine similarity = (A . B) / (|A| * |B|)
        dot_product = np.dot(arr1, arr2)
        similarity = dot_product / (norm1 * norm2)

        return float(similarity)
