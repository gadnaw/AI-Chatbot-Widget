"""
Content Validation Utilities
Phase 2 Wave 1: Document Type Detection and Content Validation

This module provides validation utilities for ensuring document content
meets security and quality requirements before processing. Includes
validators for content size, URL accessibility, text encoding, and
malicious content patterns.
"""

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Pattern
from urllib.parse import urlparse

import requests


class ValidationStatus(str, Enum):
    """Status of content validation."""

    VALID = "valid"
    INVALID = "invalid"
    WARNING = "warning"


@dataclass
class ValidationResult:
    """
    Result of content validation.

    Attributes:
        is_valid: True if content passes all validation checks
        status: Overall validation status
        errors: List of error messages for failed checks
        warnings: List of warning messages for concerning patterns
        metadata: Additional metadata from validation checks
    """

    is_valid: bool
    status: ValidationStatus
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def valid(cls, metadata: Optional[Dict[str, Any]] = None) -> "ValidationResult":
        """Create a valid result."""
        return cls(
            is_valid=True,
            status=ValidationStatus.VALID,
            metadata=metadata or {},
        )

    @classmethod
    def invalid(
        cls, errors: List[str], metadata: Optional[Dict[str, Any]] = None
    ) -> "ValidationResult":
        """Create an invalid result with errors."""
        return cls(
            is_valid=False,
            status=ValidationStatus.INVALID,
            errors=errors,
            metadata=metadata or {},
        )

    @classmethod
    def with_warnings(
        cls,
        warnings: List[str],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "ValidationResult":
        """Create a result with warnings but still valid."""
        return cls(
            is_valid=True,
            status=ValidationStatus.WARNING,
            warnings=warnings,
            metadata=metadata or {},
        )

    def merge(self, other: "ValidationResult") -> "ValidationResult":
        """Merge another result into this one."""
        return ValidationResult(
            is_valid=self.is_valid and other.is_valid,
            status=(
                ValidationStatus.INVALID
                if not self.is_valid or not other.is_valid
                else ValidationStatus.WARNING
                if self.warnings or other.warnings
                else ValidationStatus.VALID
            ),
            errors=self.errors + other.errors,
            warnings=self.warnings + other.warnings,
            metadata={**self.metadata, **other.metadata},
        )


class BaseValidator(ABC):
    """Abstract base class for content validators."""

    @abstractmethod
    def validate(self, content: Any) -> ValidationResult:
        """
        Validate the given content.

        Args:
            content: Content to validate

        Returns:
            ValidationResult with pass/fail status and messages
        """
        pass


class ContentSizeValidator(BaseValidator):
    """
    Validates content size against configured limits.

    Enforces maximum size constraints for different document types
    to prevent memory issues and resource exhaustion.
    """

    # Size limits by document type (in bytes)
    SIZE_LIMITS = {
        "pdf": 10 * 1024 * 1024,  # 10 MB
        "html": 5 * 1024 * 1024,  # 5 MB
        "text": 5 * 1024 * 1024,  # 5 MB
    }

    def __init__(self, limits: Optional[Dict[str, int]] = None):
        """
        Initialize validator with optional custom limits.

        Args:
            limits: Optional dict of document_type -> max_size_in_bytes
        """
        self.limits = limits or self.SIZE_LIMITS

    def validate(
        self,
        content: Any,
        doc_type: str = "text",
    ) -> ValidationResult:
        """
        Validate content size.

        Args:
            content: Content to validate (bytes or string)
            doc_type: Document type for limit selection

        Returns:
            ValidationResult indicating pass/fail
        """
        if doc_type not in self.limits:
            doc_type = "text"

        max_size = self.limits[doc_type]

        # Calculate content size
        if isinstance(content, bytes):
            size = len(content)
        elif isinstance(content, str):
            size = len(content.encode("utf-8"))
        else:
            return ValidationResult.invalid(
                ["Unknown content type"],
                {"content_type": type(content).__name__},
            )

        if size > max_size:
            max_size_mb = max_size / (1024 * 1024)
            actual_size_mb = size / (1024 * 1024)
            return ValidationResult.invalid(
                [
                    f"Content size ({actual_size_mb:.2f} MB) exceeds "
                    f"maximum allowed ({max_size_mb:.2f} MB) for {doc_type}"
                ],
                {
                    "size": size,
                    "max_size": max_size,
                    "document_type": doc_type,
                },
            )

        return ValidationResult.valid(
            {
                "size": size,
                "max_size": max_size,
                "document_type": doc_type,
            }
        )


class URLAccessibilityValidator(BaseValidator):
    """
    Validates URL accessibility and content availability.

    Performs HTTP HEAD/GET requests to verify URLs are accessible
    and return appropriate content types.
    """

    # Default timeout for URL requests
    DEFAULT_TIMEOUT = 30  # seconds

    # Allowed content types for document URLs
    ALLOWED_CONTENT_TYPES = {
        "pdf": ["application/pdf"],
        "html": ["text/html", "application/xhtml+xml"],
        "text": ["text/plain", "text/markdown", "text/csv"],
    }

    # Blocked content types (indicators of non-document content)
    BLOCKED_CONTENT_TYPES = [
        "application/javascript",
        "application/xml",
        "image/",
        "video/",
        "audio/",
        "application/zip",
        "application/gzip",
    ]

    def __init__(
        self,
        timeout: int = DEFAULT_TIMEOUT,
        allowed_content_types: Optional[Dict[str, List[str]]] = None,
    ):
        """
        Initialize validator with timeout and content type rules.

        Args:
            timeout: Request timeout in seconds
            allowed_content_types: Optional override of allowed types per doc type
        """
        self.timeout = timeout
        self.allowed_content_types = allowed_content_types or self.ALLOWED_CONTENT_TYPES

    def validate(self, url: str) -> ValidationResult:
        """
        Validate URL accessibility and content.

        Args:
            url: URL to validate

        Returns:
            ValidationResult with accessibility status
        """
        # Validate URL format
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return ValidationResult.invalid(
                    ["Invalid URL format - missing scheme or netloc"],
                    {"url": url},
                )
            if parsed.scheme not in ["http", "https"]:
                return ValidationResult.invalid(
                    [f"Unsupported URL scheme: {parsed.scheme}"],
                    {"scheme": parsed.scheme},
                )
        except Exception as e:
            return ValidationResult.invalid(
                [f"URL parsing error: {str(e)}"],
                {"url": url},
            )

        # Perform HTTP request
        try:
            response = requests.head(
                url,
                timeout=self.timeout,
                allow_redirects=True,
                headers={
                    "User-Agent": "A4-AI-Chatbot-RAG/1.0",
                },
            )

            # Check status code
            if response.status_code >= 400:
                return ValidationResult.invalid(
                    [f"URL returned HTTP {response.status_code}: {response.reason}"],
                    {
                        "status_code": response.status_code,
                        "reason": response.reason,
                    },
                )

            # Check content type
            content_type = (
                response.headers.get("Content-Type", "").split(";")[0].strip()
            )
            doc_type = self._infer_doc_type(url, content_type)

            if doc_type not in self.allowed_content_types:
                return ValidationResult.invalid(
                    [f"Unsupported document type for URL: {doc_type}"],
                    {"content_type": content_type, "document_type": doc_type},
                )

            if content_type not in self.allowed_content_types[doc_type]:
                return ValidationResult.with_warnings(
                    [
                        f"Content-Type '{content_type}' may not match expected "
                        f"type for {doc_type} documents"
                    ],
                    {"content_type": content_type, "document_type": doc_type},
                )

            return ValidationResult.valid(
                {
                    "url": url,
                    "status_code": response.status_code,
                    "content_type": content_type,
                    "document_type": doc_type,
                },
            )

        except requests.exceptions.Timeout:
            return ValidationResult.invalid(
                [f"URL request timed out after {self.timeout} seconds"],
                {"url": url, "timeout": self.timeout},
            )
        except requests.exceptions.RequestException as e:
            return ValidationResult.invalid(
                [f"URL request failed: {str(e)}"],
                {"url": url, "error": str(e)},
            )

    def _infer_doc_type(self, url: str, content_type: str) -> str:
        """Infer document type from URL and content type."""
        # Check content type first
        if "pdf" in content_type:
            return "pdf"
        if "html" in content_type or "xhtml" in content_type:
            return "html"
        if "text" in content_type:
            return "text"

        # Fall back to URL extension
        path = urlparse(url).path.lower()
        if path.endswith(".pdf"):
            return "pdf"
        if any(path.endswith(ext) for ext in [".html", ".htm", ".xhtml"]):
            return "html"
        return "text"


class TextEncodingValidator(BaseValidator):
    """
    Validates and normalizes text encoding.

    Detects text encoding (UTF-8, UTF-16, etc.) and converts to
    normalized UTF-8 for consistent processing.
    """

    # Encodings to attempt (in order of preference)
    ENCODING_ORDER = ["utf-8", "utf-16le", "utf-16be", "latin-1", "cp1252"]

    def __init__(self, max_length: int = 100000):
        """
        Initialize validator with maximum length.

        Args:
            max_length: Maximum allowed text length
        """
        self.max_length = max_length

    def validate(self, content: str) -> ValidationResult:
        """
        Validate and normalize text content.

        Args:
            content: Text content to validate

        Returns:
            ValidationResult with normalized content
        """
        if not content:
            return ValidationResult.invalid(["Empty content"])

        # Check length
        if len(content) > self.max_length:
            return ValidationResult.invalid(
                [
                    f"Text content length ({len(content)}) exceeds "
                    f"maximum allowed ({self.max_length})"
                ],
                {"length": len(content), "max_length": self.max_length},
            )

        # Validate UTF-8 encoding
        try:
            encoded = content.encode("utf-8")

            # Check for BOM (Byte Order Mark)
            bom = encoded[:3]
            if bom == b"\xef\xbb\xbf":
                return ValidationResult.with_warnings(
                    ["Content contains UTF-8 BOM - removed during processing"],
                    {
                        "has_bom": True,
                        "encoding": "utf-8",
                        "length": len(content),
                    },
                )

            return ValidationResult.valid(
                {
                    "encoding": "utf-8",
                    "length": len(content),
                    "byte_length": len(encoded),
                },
            )

        except UnicodeEncodeError as e:
            return ValidationResult.invalid(
                [f"Text encoding error: {str(e)}"],
                {"error": str(e)},
            )


class MaliciousContentValidator(BaseValidator):
    """
    Detects potentially malicious content patterns.

    Scans content for patterns that may indicate security risks
    including injection attempts, suspicious scripts, and other
    attack vectors.
    """

    # Patterns that may indicate malicious content
    MALICIOUS_PATTERNS: List[Dict[str, Any]] = [
        # Script injection patterns
        {
            "name": "script_tag",
            "pattern": re.compile(
                r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL
            ),
            "severity": "high",
            "message": "Embedded script tags detected - may pose security risk",
        },
        # JavaScript URL patterns
        {
            "name": "javascript_url",
            "pattern": re.compile(r"javascript\s*:", re.IGNORECASE),
            "severity": "high",
            "message": "JavaScript URL protocol detected",
        },
        # SQL injection patterns
        {
            "name": "sql_injection",
            "pattern": re.compile(
                r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*"
                r"\b(FROM|TABLE|DATABASE|INTO|VALUES)\b)",
                re.IGNORECASE | re.DOTALL,
            ),
            "severity": "high",
            "message": "Potential SQL injection pattern detected",
        },
        # HTML tag injection
        {
            "name": "html_tag_injection",
            "pattern": re.compile(r"<[a-z][^>]*>", re.IGNORECASE),
            "severity": "medium",
            "message": "Raw HTML tags detected in content",
        },
        # Iframe injection
        {
            "name": "iframe_tag",
            "pattern": re.compile(
                r"<iframe[^>]*>.*?</iframe>", re.IGNORECASE | re.DOTALL
            ),
            "severity": "high",
            "message": "Iframe elements detected - potential clickjacking risk",
        },
        # _eval and similar dangerous functions (for JavaScript context)
        {
            "name": "dangerous_js",
            "pattern": re.compile(
                r"\b(eval|setTimeout|setInterval)\s*\(", re.IGNORECASE
            ),
            "severity": "medium",
            "message": "Potentially dangerous JavaScript function detected",
        },
    ]

    def __init__(self, strict_mode: bool = False):
        """
        Initialize validator with strict mode option.

        Args:
            strict_mode: If True, more aggressive pattern matching
        """
        self.strict_mode = strict_mode

    def validate(self, content: str) -> ValidationResult:
        """
        Scan content for malicious patterns.

        Args:
            content: Text content to scan

        Returns:
            ValidationResult with any detected threats
        """
        if not content:
            return ValidationResult.valid()

        detected: List[str] = []
        metadata: Dict[str, Any] = {"patterns_checked": len(self.MALICIOUS_PATTERNS)}

        for pattern_info in self.MALICIOUS_PATTERNS:
            pattern: Pattern = pattern_info["pattern"]
            if pattern.search(content):
                detected.append(pattern_info["message"])

        if detected:
            if self.strict_mode:
                return ValidationResult.invalid(
                    detected,
                    {"threats": detected, "strict_mode": True},
                )
            else:
                return ValidationResult.with_warnings(
                    detected,
                    {"warnings": detected, "strict_mode": False},
                )

        return ValidationResult.valid(metadata)


# Composite validator for common use cases
class DocumentValidator:
    """
    Composite validator that applies multiple validation checks.

    Provides a convenient interface for validating documents before
    processing through the RAG pipeline.
    """

    def __init__(self):
        """Initialize with individual validators."""
        self.size_validator = ContentSizeValidator()
        self.encoding_validator = TextEncodingValidator()
        self.malicious_validator = MaliciousValidator()

    def validate_document(
        self,
        content: Any,
        doc_type: str,
        max_length: int = 100000,
    ) -> ValidationResult:
        """
        Validate a document with all applicable checks.

        Args:
            content: Document content
            doc_type: Document type (pdf, html, text)
            max_length: Maximum text length

        Returns:
            Combined ValidationResult
        """
        result = self.size_validator.validate(content, doc_type)

        if isinstance(content, str):
            result = result.merge(self.encoding_validator.validate(content))

        return result

    def validate_url(self, url: str) -> ValidationResult:
        """
        Validate a URL document.

        Args:
            url: URL to validate

        Returns:
            ValidationResult
        """
        return URLAccessibilityValidator().validate(url)


# Legacy alias for backward compatibility
class MaliciousContentValidator:
    """Alias for MaliciousContentValidator for backwards compatibility."""

    pass


# Convenience function
def validate_content(
    content: Any,
    doc_type: str = "text",
) -> ValidationResult:
    """
    Quick content validation function.

    Args:
        content: Content to validate
        doc_type: Document type for size limits

    Returns:
        ValidationResult
    """
    validator = DocumentValidator()
    return validator.validate_document(content, doc_type)
