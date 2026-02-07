"""
RAG Database Models
Phase 2 Wave 1: Database Schema and RLS Policies Setup

This module defines SQLAlchemy models for documents and document chunks
used in the RAG pipeline with multi-tenant isolation via Row Level Security.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID, VECTOR
from sqlalchemy.orm import relationship

from app.core.database import Base


# ============================================================================
# SQLAlchemy ORM Models (for database operations)
# ============================================================================


class Document(Base):
    """
    SQLAlchemy model for documents table.
    
    Stores document metadata and content references for RAG pipeline.
    Each document belongs to a tenant and can be of type pdf, html, or text.
    """
    
    __tablename__ = "documents"
    __table_args__ = {"schema": "app_private"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: None)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String, nullable=False)
    source_type = Column(String, nullable=False)  # 'pdf', 'html', 'text'
    source_url = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    status = Column(
        String,
        nullable=False,
        default="pending",
        server_default="pending"
    )  # 'pending', 'processing', 'ready', 'error'
    chunk_count = Column(Integer, default=0, server_default="0")
    metadata = Column(JSONB, default={}, server_default="{}")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to chunks
    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Document(id={self.id}, title='{self.title}', status='{self.status}')>"


class DocumentChunk(Base):
    """
    SQLAlchemy model for document_chunks table.
    
    Stores chunked document content with vector embeddings for similarity search.
    Each chunk belongs to a document and tenant for multi-tenant isolation.
    Embeddings use VECTOR(512) for text-embedding-3-small compatibility.
    """
    
    __tablename__ = "document_chunks"
    __table_args__ = {"schema": "app_private"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: None)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("app_private.documents.id", ondelete="CASCADE"),
        nullable=False
    )
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(VECTOR(512), nullable=True)  # 512 dimensions for text-embedding-3-small
    metadata = Column(JSONB, default={}, server_default="{}")
    source_type = Column(String, nullable=False)  # 'pdf', 'html', 'text'
    source_page_ref = Column(String, nullable=True)  # Page number for PDF
    source_url = Column(Text, nullable=True)  # Original URL for HTML
    hierarchy_path = Column(String, nullable=True)  # Array as JSON for hierarchy context
    word_count = Column(Integer, nullable=True)
    char_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to document
    document = relationship("Document", back_populates="chunks")
    
    def __repr__(self) -> str:
        return f"<DocumentChunk(id={self.id}, document_id={self.document_id}, index={self.chunk_index})>"


class Tenant(Base):
    """
    SQLAlchemy model for tenants table.
    
    Represents tenant organizations that own documents in the RAG pipeline.
    Used for multi-tenant isolation via RLS policies.
    """
    
    __tablename__ = "tenants"
    __table_args__ = {"schema": "app_private"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: None)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to tenant members
    members = relationship("TenantMember", back_populates="tenant", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Tenant(id={self.id}, name='{self.name}')>"


class TenantMember(Base):
    """
    SQLAlchemy model for tenant_members table.
    
    Links Supabase auth.users to tenants for RLS policy evaluation.
    Maps user IDs to tenant organizations with role-based access.
    """
    
    __tablename__ = "tenant_members"
    __table_args__ = {"schema": "app_private"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: None)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("app_private.tenants.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id = Column(UUID(as_uuid=True), nullable=False)
    role = Column(
        String,
        nullable=False,
        default="member",
        server_default="member"
    )  # 'owner', 'admin', 'member'
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationship to tenant
    tenant = relationship("Tenant", back_populates="members")
    
    def __repr__(self) -> str:
        return f"<TenantMember(tenant_id={self.tenant_id}, user_id={self.user_id}, role='{self.role}')>"


# ============================================================================
# Pydantic Models (for API request/response)
# ============================================================================


# Document models
class DocumentCreate(BaseModel):
    """Request model for creating a new document."""
    
    title: str = Field(..., min_length=1, max_length=500, description="Document title")
    source_type: str = Field(..., description="Document type: pdf, html, or text")
    source_url: Optional[str] = Field(None, description="Source URL for HTML documents")
    metadata: Optional[dict] = Field(default={}, description="Additional metadata")


class DocumentUpdate(BaseModel):
    """Request model for updating a document."""
    
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    status: Optional[str] = Field(None, pattern="^(pending|processing|ready|error)$")
    metadata: Optional[dict] = None


class DocumentStatus(BaseModel):
    """Response model for document processing status."""
    
    id: UUID
    title: str
    source_type: str
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    """Full response model for document with metadata."""
    
    id: UUID
    tenant_id: UUID
    title: str
    source_type: str
    source_url: Optional[str]
    status: str
    chunk_count: int
    metadata: dict
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Document chunk models
class DocumentChunkResponse(BaseModel):
    """Response model for a document chunk."""
    
    id: UUID
    document_id: UUID
    chunk_index: int
    content: str
    source_type: str
    source_page_ref: Optional[str]
    source_url: Optional[str]
    hierarchy_path: Optional[List[str]]
    word_count: Optional[int]
    char_count: Optional[int]
    similarity: Optional[float] = None  # Only populated in search results
    
    class Config:
        from_attributes = True


class DocumentChunkCreate(BaseModel):
    """Request model for creating a document chunk (internal use)."""
    
    document_id: UUID
    chunk_index: int
    content: str
    source_type: str
    source_page_ref: Optional[str] = None
    source_url: Optional[str] = None
    hierarchy_path: Optional[List[str]] = None
    word_count: Optional[int] = None
    char_count: Optional[int] = None


# Search models
class SimilaritySearchRequest(BaseModel):
    """Request model for similarity search."""
    
    query: str = Field(..., min_length=1, max_length=10000, description="Search query text")
    similarity_threshold: float = Field(
        default=0.7,
        ge=0.1,
        le=1.0,
        description="Minimum similarity threshold (0.1-1.0)"
    )
    max_results: int = Field(default=5, ge=1, le=20, description="Maximum results to return")
    filters: Optional[dict] = Field(None, description="Optional filters for document_ids, source_types")


class SimilaritySearchResult(BaseModel):
    """Response model for similarity search results."""
    
    chunks: List[DocumentChunkResponse]
    total_found: int
    query: str
    similarity_threshold: float
    avg_similarity: float
    search_time_ms: int
    
    class Config:
        from_attributes = True


class RetrievedChunk(BaseModel):
    """Enhanced chunk model for search results with source attribution."""
    
    id: UUID
    document_id: UUID
    document_title: str
    content: str
    similarity: float
    source_type: str
    source_page_ref: Optional[str]
    source_url: Optional[str]
    hierarchy_path: Optional[List[str]]
    metadata: dict


# Ingestion models
class IngestRequest(BaseModel):
    """Base request model for document ingestion."""
    
    title: str = Field(..., min_length=1, max_length=500)
    source_type: str = Field(..., pattern="^(pdf|url|text)$")
    metadata: Optional[dict] = default={}


class IngestPDFRequest(IngestRequest):
    """Request model for PDF document ingestion."""
    
    pass  # File upload handled separately


class IngestURLRequest(IngestRequest):
    """Request model for URL/HTML document ingestion."""
    
    url: str = Field(..., description="URL to ingest")


class IngestTextRequest(IngestRequest):
    """Request model for text document ingestion."""
    
    content: str = Field(..., min_length=1, description="Text content to ingest")


class IngestionStatus(BaseModel):
    """Response model for ingestion progress tracking."""
    
    document_id: UUID
    status: str
    progress: int  # 0-100 percentage
    message: str
    estimated_time_remaining: Optional[int] = None  # seconds


# Validation models
class DocumentTypeDetection(BaseModel):
    """Response model for document type detection."""
    
    detected_type: str  # 'pdf', 'html', 'text'
    confidence: float  # 0.0-1.0
    mime_type: Optional[str]
    file_extension: Optional[str]


class ValidationResult(BaseModel):
    """Response model for content validation."""
    
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    metadata: dict
