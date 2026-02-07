"""
LangChain Document Loaders
Phase 2 Wave 1: Document Loader Service Implementation

This module implements document loading service with type-specific loaders
using LangChain for PDF, HTML, and text sources. Each loader is optimized
for the specific document type with appropriate preprocessing and metadata extraction.
"""

import io
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union

from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    WebBaseLoader,
)


# Type aliases for clarity
DocumentSource = Union[str, bytes, io.BytesIO]
DocumentType = str  # 'pdf', 'html', 'text'


class BaseDocumentLoader(ABC):
    """
    Abstract base class for document loaders.

    Defines the common interface that all document loaders must implement,
    ensuring consistent behavior across different document types.
    """

    @abstractmethod
    def load(self, source: DocumentSource) -> List[Document]:
        """
        Load and parse a document from the given source.

        Args:
            source: Document source (file path, URL, or content)

        Returns:
            List of Document objects with content and metadata
        """
        pass

    @abstractmethod
    def load_with_metadata(
        self,
        source: DocumentSource,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Document]:
        """
        Load document with additional metadata.

        Args:
            source: Document source
            metadata: Additional metadata to attach to documents

        Returns:
            List of Document objects with merged metadata
        """
        pass


class PDFLoader(BaseDocumentLoader):
    """
    Loader for PDF documents using PyPDFLoader.

    Extracts text from PDF files with page-level granularity.
    Adds page markers and metadata for proper chunking and citation.
    """

    def __init__(self, extraction_mode: str = "single"):
        """
        Initialize PDF loader.

        Args:
            extraction_mode: Text extraction mode - 'single' or 'page-by-page'
        """
        self.extraction_mode = extraction_mode

    def load(self, source: DocumentSource) -> List[Document]:
        """
        Load PDF document and extract text.

        Args:
            source: PDF file path (str) or bytes

        Returns:
            List of Document objects, one per page
        """
        if isinstance(source, bytes):
            # Convert bytes to BytesIO for PyPDFLoader
            source = io.BytesIO(source)

        # Use PyPDFLoader for PDF extraction
        loader = PyPDFLoader(str(source))
        documents = loader.load()

        # Add page markers and enrich metadata
        for i, doc in enumerate(documents):
            # Add page marker for chunking context
            page_num = doc.metadata.get("page", i) + 1  # 1-indexed
            doc.pageContent = f"[Page {page_num}]\n{doc.pageContent}"

            # Enrich metadata
            doc.metadata.update(
                {
                    "source_type": "pdf",
                    "page_number": page_num,
                    "total_pages": len(documents),
                }
            )

        return documents

    def load_with_metadata(
        self,
        source: DocumentSource,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Document]:
        """
        Load PDF with additional custom metadata.

        Args:
            source: PDF file path or bytes
            metadata: Additional metadata to merge

        Returns:
            List of Document objects with merged metadata
        """
        documents = self.load(source)

        if metadata:
            for doc in documents:
                doc.metadata.update(metadata)

        return documents


class HTMLLoader(BaseDocumentLoader):
    """
    Loader for HTML documents using WebBaseLoader.

    Extracts text from web pages with automatic HTML cleaning.
    Removes scripts, styles, navigation, and other non-content elements.
    """

    def __init__(
        self,
        remove_selectors: Optional[List[str]] = None,
        html_to_text: bool = True,
    ):
        """
        Initialize HTML loader with cleaning options.

        Args:
            remove_selectors: Additional CSS selectors to remove
            html_to_text: Whether to convert HTML to plain text
        """
        self.remove_selectors = remove_selectors or [
            "script",
            "style",
            "nav",
            "footer",
            "header",
            "aside",
            ".navigation",
            ".menu",
            ".sidebar",
            ".advertisement",
            ".ad",
        ]
        self.html_to_text = html_to_text

    def load(self, source: DocumentSource) -> List[Document]:
        """
        Load HTML document and extract clean text.

        Args:
            source: URL (str) or HTML content

        Returns:
            List of Document objects (usually single document)
        """
        if isinstance(source, str) and source.startswith(("http://", "https://")):
            # URL loading
            loader = WebBaseLoader(
                web_path=source,
                header_template={
                    "User-Agent": "A4-AI-Chatbot-RAG/1.0 (+https://a4-ai.com)",
                },
            )
        else:
            # HTML content loading
            if isinstance(source, bytes):
                source = source.decode("utf-8", errors="replace")

            # Create a temporary loader for raw HTML
            loader = WebBaseLoader(web_path=[], html_to_text=self.html_to_text)
            loader.web_path = source

        # Configure selector removal
        if hasattr(loader, "remove_selectors"):
            loader.remove_selectors = self.remove_selectors

        documents = loader.load()

        # Enrich metadata
        for doc in documents:
            doc.metadata.update(
                {
                    "source_type": "html",
                    "url": doc.metadata.get(
                        "source", source if isinstance(source, str) else ""
                    ),
                }
            )

        return documents

    def load_with_metadata(
        self,
        source: DocumentSource,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Document]:
        """
        Load HTML with additional custom metadata.

        Args:
            source: URL or HTML content
            metadata: Additional metadata to merge

        Returns:
            List of Document objects with merged metadata
        """
        documents = self.load(source)

        if metadata:
            for doc in documents:
                doc.metadata.update(metadata)

        return documents


class TextLoader(BaseDocumentLoader):
    """
    Loader for plain text documents.

    Handles various text encodings and line ending formats.
    Preserves paragraph structure for semantic chunking.
    """

    ENCODING_PRIORITY = ["utf-8", "utf-16", "latin-1", "cp1252"]

    def __init__(
        self,
        encoding: str = "auto",
        preserve_line_breaks: bool = True,
    ):
        """
        Initialize text loader.

        Args:
            encoding: Character encoding ('auto' for auto-detection)
            preserve_line_breaks: Whether to preserve original line breaks
        """
        self.encoding = encoding
        self.preserve_line_breaks = preserve_line_breaks

    def load(self, source: DocumentSource) -> List[Document]:
        """
        Load text document with auto-detection of encoding.

        Args:
            source: Text file path (str) or content (str/bytes)

        Returns:
            List of Document objects (single document)
        """
        if isinstance(source, str) and not source.startswith(("http://", "https://")):
            # File path - use LangChain's TextLoader
            loader = TextLoader(file_path=source, autodetect_encoding=True)
            documents = loader.load()
        else:
            # Direct content - create document manually
            if isinstance(source, bytes):
                # Auto-detect encoding
                content = self._decode_content(source)
            else:
                content = source

            # Create single document
            documents = [
                Document(
                    pageContent=content,
                    metadata={"source_type": "text"},
                )
            ]

        return documents

    def _decode_content(self, content: bytes) -> str:
        """
        Decode bytes content with encoding auto-detection.

        Args:
            content: Raw bytes content

        Returns:
            Decoded string content
        """
        if self.encoding != "auto":
            return content.decode(self.encoding, errors="replace")

        # Try each encoding in priority order
        for encoding in self.ENCODING_PRIORITY:
            try:
                return content.decode(encoding)
            except UnicodeDecodeError:
                continue

        # Fallback to UTF-8 with error replacement
        return content.decode("utf-8", errors="replace")

    def load_with_metadata(
        self,
        source: DocumentSource,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Document]:
        """
        Load text with additional custom metadata.

        Args:
            source: Text file path or content
            metadata: Additional metadata to merge

        Returns:
            List of Document objects with merged metadata
        """
        documents = self.load(source)

        if metadata:
            for doc in documents:
                doc.metadata.update(metadata)

        return documents


class LoaderFactory:
    """
    Factory for creating appropriate document loaders.

    Provides a simple interface for obtaining the correct loader
    for any document type, abstracting away the implementation details.
    """

    # Supported document types
    SUPPORTED_TYPES = ["pdf", "html", "text"]

    # Default configurations for each type
    LOADER_CONFIGS = {
        "pdf": {
            "class": PDFLoader,
            "kwargs": {},
        },
        "html": {
            "class": HTMLLoader,
            "kwargs": {
                "remove_selectors": [
                    "script",
                    "style",
                    "nav",
                    "footer",
                    "header",
                    "aside",
                    ".navigation",
                    ".menu",
                    ".sidebar",
                    ".advertisement",
                ],
                "html_to_text": True,
            },
        },
        "text": {
            "class": TextLoader,
            "kwargs": {
                "encoding": "auto",
                "preserve_line_breaks": True,
            },
        },
    }

    @classmethod
    def get_loader(cls, doc_type: str, **kwargs) -> BaseDocumentLoader:
        """
        Get the appropriate loader for a document type.

        Args:
            doc_type: Document type ('pdf', 'html', 'text')
            **kwargs: Additional configuration options

        Returns:
            Configured document loader instance

        Raises:
            ValueError: If document type is not supported
        """
        if doc_type not in cls.SUPPORTED_TYPES:
            raise ValueError(
                f"Unsupported document type: {doc_type}. "
                f"Supported types: {cls.SUPPORTED_TYPES}"
            )

        config = cls.LOADER_CONFIGS[doc_type]
        loader_class = config["class"]

        # Merge default kwargs with provided kwargs
        merged_kwargs = {**config["kwargs"], **kwargs}

        return loader_class(**merged_kwargs)

    @classmethod
    def create_loader(
        cls,
        source: DocumentSource,
        doc_type: str,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> List[Document]:
        """
        Convenience method to load a document directly.

        Args:
            source: Document source (path, URL, or content)
            doc_type: Document type
            metadata: Optional additional metadata
            **kwargs: Additional loader configuration

        Returns:
            List of loaded Document objects
        """
        loader = cls.get_loader(doc_type, **kwargs)

        if metadata:
            return loader.load_with_metadata(source, metadata)
        return loader.load(source)

    @classmethod
    def detect_and_load(
        cls,
        source: DocumentSource,
        mime_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Document]:
        """
        Auto-detect document type and load accordingly.

        Args:
            source: Document source (path, URL, or content)
            mime_type: Optional MIME type hint
            metadata: Optional additional metadata

        Returns:
            List of loaded Document objects

        Raises:
            ValueError: If document type cannot be determined
        """
        from app.services.rag.document_detector import DocumentDetector

        detector = DocumentDetector()

        # Detect type from content/mime_type
        doc_type, confidence = detector.detect_type(
            source if isinstance(source, (str, bytes)) else "",
            mime_type=mime_type,
        )

        if confidence < 0.5:
            raise ValueError(
                f"Could not reliably detect document type (confidence: {confidence:.2f}). "
                "Please specify the document type explicitly."
            )

        return cls.create_loader(source, doc_type.value, metadata=metadata)


# Backwards compatibility alias
DocumentLoader = LoaderFactory


# Convenience functions
def load_pdf(source: DocumentSource, **kwargs) -> List[Document]:
    """Load a PDF document."""
    return PDFLoader(**kwargs).load(source)


def load_html(source: DocumentSource, **kwargs) -> List[Document]:
    """Load an HTML document."""
    return HTMLLoader(**kwargs).load(source)


def load_text(source: DocumentSource, **kwargs) -> List[Document]:
    """Load a text document."""
    return TextLoader(**kwargs).load(source)
