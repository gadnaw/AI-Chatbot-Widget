"""
RAG Services Package

This package contains services for the Retrieval-Augmented Generation pipeline:
- document_detector: Detects document types (PDF, HTML, text)
- validators: Validates document content for security and quality
- loaders: LangChain document loaders for different source types
- embeddings: OpenAI embedding generation with batching and caching
- chunking: Semantic chunking with type-specific strategies
- retrieval: Similarity search with pgvector cosine distance
- citations: Source attribution and citation generation
"""

from app.services.rag.document_detector import DocumentDetector
from app.services.rag.validators import (
    ContentSizeValidator,
    MaliciousContentValidator,
    TextEncodingValidator,
    URLAccessibilityValidator,
    ValidationResult,
)
from app.services.rag.loaders import (
    HTMLLoader,
    LoaderFactory,
    PDFLoader,
    TextLoader,
)
from app.services.rag.embeddings import EmbeddingService
from app.services.rag.retrieval import SimilaritySearchService, SearchResult
from app.services.rag.citations import (
    CitationGenerator,
    ContextBuilder,
    RetrievedChunk,
    Citation,
)

__all__ = [
    # Document detection
    "DocumentDetector",
    # Validators
    "ContentSizeValidator",
    "URLAccessibilityValidator",
    "TextEncodingValidator",
    "MaliciousContentValidator",
    "ValidationResult",
    # Loaders
    "PDFLoader",
    "HTMLLoader",
    "TextLoader",
    "LoaderFactory",
    # Embeddings
    "EmbeddingService",
    # Retrieval
    "SimilaritySearchService",
    "SearchResult",
    # Citations
    "CitationGenerator",
    "ContextBuilder",
    "RetrievedChunk",
    "Citation",
]
