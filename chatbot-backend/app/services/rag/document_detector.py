"""
Document Type Detection Service
Phase 2 Wave 1: Document Type Detection and Content Validation

This module provides utilities for detecting document types (PDF, HTML, text)
from file content, MIME types, or source URLs. Uses magic number detection
and content analysis for accurate classification.
"""

import re
from enum import Enum
from typing import Optional, Tuple, Union


class DocumentType(str, Enum):
    """Supported document types for the RAG pipeline."""

    PDF = "pdf"
    HTML = "html"
    TEXT = "text"


class DocumentDetector:
    """
    Detects document types from various input sources.

    Supports detection from:
    - File content (magic numbers)
    - MIME type strings
    - File extensions
    - URLs (by analyzing extension and content-type hints)

    Uses a confidence-based approach with fallback logic for uncertain cases.
    """

    # Magic number signatures for file type detection
    PDF_SIGNATURE = b"%PDF-"
    HTML_SIGNATURES = [
        b"<!DOCTYPE html",
        b"<!doctype html",
        b"<html",
        b"<!DOCTYPE HTML",
        b"<!doctype HTML",
    ]

    # Common text encoding patterns
    UTF8_BOM = b"\xef\xbb\xbf"
    UTF16_LE_BOM = b"\xff\xfe"
    UTF16_BE_BOM = b"\xfe\xff"

    def __init__(self):
        """Initialize the document detector with detection thresholds."""
        # Confidence thresholds for different detection methods
        self._magic_number_confidence = 0.95
        self._mime_type_confidence = 0.90
        self._extension_confidence = 0.70
        self._content_analysis_confidence = 0.60

    def detect_type(
        self,
        source: Union[str, bytes],
        mime_type: Optional[str] = None,
        file_extension: Optional[str] = None,
    ) -> Tuple[DocumentType, float]:
        """
        Detect the document type from various input sources.

        Uses a multi-factor detection approach, combining:
        1. Magic number analysis (highest confidence)
        2. MIME type hints
        3. File extension analysis
        4. Content pattern analysis (fallback)

        Args:
            source: File content (bytes) or source identifier (str)
            mime_type: Optional MIME type hint
            file_extension: Optional file extension hint

        Returns:
            Tuple of (detected DocumentType, confidence_score)

        Examples:
            >>> detector = DocumentDetector()
            >>> detector.detect_type(b"%PDF-1.4", "application/pdf")
            (<DocumentType.PDF: 'pdf'>, 0.95)
            >>> detector.detect_type("<html></html>", "text/html")
            (<DocumentType.HTML: 'html'>, 0.90)
        """
        # Priority 1: Magic number detection (highest confidence)
        if isinstance(source, bytes):
            doc_type, confidence = self._detect_from_magic_number(source)
            if confidence >= self._magic_number_confidence:
                return doc_type, confidence

        # Priority 2: MIME type detection
        if mime_type:
            doc_type, confidence = self._detect_from_mime_type(mime_type)
            if confidence >= self._mime_type_confidence:
                return doc_type, confidence

        # Priority 3: File extension detection
        if file_extension:
            doc_type, confidence = self._detect_from_extension(file_extension)
            if confidence >= self._extension_confidence:
                return doc_type, confidence

        # Priority 4: Content pattern analysis (for strings)
        if isinstance(source, str):
            doc_type, confidence = self._detect_from_content(source)
            if confidence >= self._content_analysis_confidence:
                return doc_type, confidence

        # Fallback: Default to text
        return DocumentType.TEXT, 0.50

    def _detect_from_magic_number(self, content: bytes) -> Tuple[DocumentType, float]:
        """
        Detect document type from magic numbers (file signatures).

        Magic numbers provide the most reliable detection method as they
        are embedded in the file structure itself.
        """
        if len(content) < 10:
            return DocumentType.TEXT, 0.30

        # Check for PDF signature
        if content.startswith(self.PDF_SIGNATURE):
            return DocumentType.PDF, self._magic_number_confidence

        # Check for HTML signatures
        for signature in self.HTML_SIGNATURES:
            if content[: len(signature)].upper() == signature.upper():
                return DocumentType.HTML, self._magic_number_confidence

        # Check for text content (printable ASCII + common whitespace)
        try:
            content.decode("utf-8")
            # Check if it looks like HTML without DOCTYPE
            if b"<html" in content.lower() or b"<body" in content.lower():
                return DocumentType.HTML, 0.70
            return DocumentType.TEXT, 0.60
        except UnicodeDecodeError:
            # Binary content that's not PDF - likely corrupted or unsupported
            return DocumentType.TEXT, 0.20

    def _detect_from_mime_type(self, mime_type: str) -> Tuple[DocumentType, float]:
        """
        Detect document type from MIME type string.

        Maps standard MIME types to document types with associated confidence.
        """
        if not mime_type:
            return DocumentType.TEXT, 0.0

        mime_type = mime_type.lower().strip()

        # PDF MIME types
        if "pdf" in mime_type:
            return DocumentType.PDF, self._mime_type_confidence

        # HTML MIME types
        if any(ht in mime_type for ht in ["html", "xhtml", "htm"]):
            return DocumentType.HTML, self._mime_type_confidence

        # Text MIME types
        if mime_type.startswith("text/") and "html" not in mime_type:
            return DocumentType.TEXT, self._mime_type_confidence

        # Application types that might be text
        if "application" in mime_type:
            if "json" in mime_type or "xml" in mime_type:
                return DocumentType.TEXT, 0.70
            if "javascript" in mime_type or "typescript" in mime_type:
                return DocumentType.TEXT, 0.60

        # Unknown MIME type
        return DocumentType.TEXT, 0.30

    def _detect_from_extension(self, extension: str) -> Tuple[DocumentType, float]:
        """
        Detect document type from file extension.

        Uses file extension as a hint with moderate confidence,
        as extensions can be misleading.
        """
        if not extension:
            return DocumentType.TEXT, 0.0

        ext = extension.lower().strip().lstrip(".")

        # PDF extensions
        pdf_extensions = {"pdf", "pdfa"}
        if ext in pdf_extensions:
            return DocumentType.PDF, self._extension_confidence

        # HTML extensions
        html_extensions = {"html", "htm", "xhtml", "xhtm"}
        if ext in html_extensions:
            return DocumentType.HTML, self._extension_confidence

        # Text extensions
        text_extensions = {
            "txt",
            "md",
            "markdown",
            "rst",
            "text",
            "log",
            "json",
            "xml",
            "yaml",
            "yml",
            "csv",
            "tsv",
            "js",
            "ts",
            "py",
            "java",
            "c",
            "cpp",
            "h",
            "css",
            "scss",
            "less",
            "sql",
            "sh",
            "bash",
        }
        if ext in text_extensions:
            return DocumentType.TEXT, self._extension_confidence

        # Unknown extension - assume text with low confidence
        return DocumentType.TEXT, 0.40

    def _detect_from_content(self, content: str) -> Tuple[DocumentType, float]:
        """
        Detect document type from content analysis.

        Uses pattern matching to identify HTML-like structures
        when other detection methods are unavailable.
        """
        if not content:
            return DocumentType.TEXT, 0.30

        content_stripped = content.strip()

        # Check for HTML-like patterns
        html_patterns = [
            r"^\s*<!DOCTYPE\s+html",
            r"^\s*<!doctype\s+html",
            r"^\s*<html",
            r"^\s*<body",
            r"^\s*<head",
            r"^\s*<div",
            r"^\s*<span",
            r"^\s*<p>",
            r"^\s*<h[1-6]>",
        ]

        for pattern in html_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return DocumentType.HTML, self._content_analysis_confidence

        # Check for Markdown (common documentation format)
        md_patterns = [
            r"^#\s",
            r"^##\s",
            r"^###\s",
            r"^-{3,}\s*$",  # Horizontal rule
            r"^\*\s",  # Bullet list
            r"^\d+\.\s",  # Numbered list
        ]

        for pattern in md_patterns:
            if re.search(pattern, content, re.MULTILINE):
                return DocumentType.TEXT, 0.70

        # Default to text
        return DocumentType.TEXT, 0.50

    def validate_pdf_header(self, content: bytes) -> Tuple[bool, str]:
        """
        Validate that content appears to be a valid PDF.

        Checks for PDF header structure and basic integrity.

        Args:
            content: Raw file content bytes

        Returns:
            Tuple of (is_valid, error_message)
        """
        if len(content) < 5:
            return False, "File too small to be a valid PDF"

        if not content.startswith(self.PDF_SIGNATURE):
            return False, "Invalid PDF header - missing %PDF signature"

        # Check PDF version
        try:
            version = content[5:8].decode("utf-8")
            if not re.match(r"^\d\.\d$", version):
                return False, f"Invalid PDF version format: {version}"
        except UnicodeDecodeError:
            return False, "Cannot decode PDF version"

        return True, ""

    def extract_metadata_from_url(self, url: str) -> dict:
        """
        Extract document metadata from a URL.

        Analyzes URL structure to determine expected document type
        and any embedded metadata.

        Args:
            url: The URL to analyze

        Returns:
            Dictionary with metadata including expected type and confidence
        """
        from urllib.parse import urlparse

        if not url:
            return {"error": "Empty URL"}

        try:
            parsed = urlparse(url)
            path = parsed.path.lower()

            # Extract file extension from path
            if "." in path:
                extension = path.split(".")[-1].split("/")[-1]
            else:
                extension = None

            # Detect type from extension
            doc_type, confidence = self._detect_from_extension(extension or "")

            return {
                "url": url,
                "host": parsed.netloc,
                "path": parsed.path,
                "extension": extension,
                "detected_type": doc_type.value,
                "confidence": confidence,
                "scheme": parsed.scheme,
            }
        except Exception as e:
            return {"error": str(e)}


# Singleton instance for convenience
document_detector = DocumentDetector()


def detect_document_type(
    source: Union[str, bytes],
    mime_type: Optional[str] = None,
    file_extension: Optional[str] = None,
) -> Tuple[DocumentType, float]:
    """
    Convenience function for document type detection.

    Args:
        source: File content or source identifier
        mime_type: Optional MIME type hint
        file_extension: Optional file extension hint

    Returns:
        Tuple of (detected DocumentType, confidence_score)
    """
    return document_detector.detect_type(source, mime_type, file_extension)
