"""
Source Attribution and Citation Generation
Phase 2 Wave 3: Source Attribution and Citation Generation

Utilities for generating citations and formatting retrieved chunks
for LLM context with comprehensive source attribution.
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple


@dataclass
class RetrievedChunk:
    """
    Retrieved chunk with full source attribution information.

    Used for citation generation and context building.
    """

    id: str
    document_id: str
    document_title: str
    content: str
    similarity: float
    source_type: str  # 'pdf', 'html', 'text'
    source_page_ref: Optional[str]  # Page number for PDF
    source_url: Optional[str]  # URL for HTML
    hierarchy_path: List[str]  # Section hierarchy
    metadata: dict


@dataclass
class Citation:
    """
    Citation with source attribution information.
    """

    chunk_id: str
    document_title: str
    source_type: str
    source_location: str  # Page number, URL, or "Document"
    hierarchy_path: str  # Formatted hierarchy string
    similarity: float

    def format(self, style: str = "numbered", index: Optional[int] = None) -> str:
        """
        Format citation in specified style.

        Args:
            style: Citation style ('numbered', 'inline', 'compact')
            index: Optional index number for numbered citations

        Returns:
            Formatted citation string
        """
        if style == "numbered":
            prefix = f"[{index}]" if index is not None else ""
            return f"{prefix} {self.document_title} ({self.source_type}, {self.source_location})"

        elif style == "inline":
            return f"{self.document_title}: {self.source_location}"

        elif style == "compact":
            if self.source_type == "pdf":
                return f"[{self.document_title}, p.{self.source_page_ref}]"
            elif self.source_type == "html":
                return f"[{self.document_title}]"
            else:
                return f"[{self.document_title}]"

        else:
            # Default to numbered
            prefix = f"[{index}]" if index is not None else ""
            return f"{prefix} {self.document_title} ({self.source_type}, {self.source_location})"


class CitationGenerator:
    """
    Generator for citations and formatted context from retrieved chunks.

    Provides utilities for:
    - Generating human-readable citations from chunk metadata
    - Formatting chunk content for LLM context
    - Building context strings with numbered citations
    - Formatting LLM responses with source attributions
    """

    def __init__(self, max_context_chars: int = 2000):
        """
        Initialize citation generator.

        Args:
            max_context_chars: Maximum characters for combined context (default 2000)
        """
        self.max_context_chars = max_context_chars

    def generate_citation(self, chunk: RetrievedChunk) -> str:
        """
        Generate human-readable citation from chunk metadata.

        Creates a citation string including:
        - Document title (bold)
        - Source type and location (page number, URL, or document)
        - Hierarchy path for context

        Args:
            chunk: Retrieved chunk with source attribution

        Returns:
            Formatted citation string
        """
        parts = []

        # Document title
        if chunk.document_title:
            parts.append(f"**{chunk.document_title}**")

        # Source type and location
        if chunk.source_type == "pdf":
            if chunk.source_page_ref:
                parts.append(f"(PDF, Page {chunk.source_page_ref})")
            else:
                parts.append("(PDF)")
        elif chunk.source_type == "html":
            if chunk.source_url:
                parts.append(f"([Source]({chunk.source_url}))")
            else:
                parts.append("(Web)")
        elif chunk.source_type == "text":
            parts.append("(Document)")

        # Hierarchy context
        if chunk.hierarchy_path and len(chunk.hierarchy_path) > 0:
            path_str = " → ".join(chunk.hierarchy_path)
            parts.append(f"_{path_str}_")

        # Similarity score (optional, for debugging/quality)
        # parts.append(f"[{chunk.similarity:.2f}]")

        return " ".join(parts)

    def format_chunk_for_context(
        self, chunk: RetrievedChunk, max_length: int = 500
    ) -> str:
        """
        Format chunk content for inclusion in LLM context.

        Truncates content to specified maximum length while preserving
        coherence. Adds ellipsis if content was truncated.

        Args:
            chunk: Retrieved chunk to format
            max_length: Maximum characters for content (default 500)

        Returns:
            Formatted content string
        """
        content = chunk.content

        # Truncate if necessary
        if len(content) > max_length:
            # Try to truncate at word boundary
            truncated = content[:max_length]
            last_space = truncated.rfind(" ")

            if (
                last_space > max_length * 0.8
            ):  # Only truncate at word if not too much waste
                content = truncated[:last_space]
            else:
                content = truncated

            content += "..."

        return content

    def build_context_with_citations(
        self,
        chunks: List[RetrievedChunk],
        max_chunks: int = 5,
        max_chars_per_chunk: int = 500,
    ) -> Tuple[str, List[Citation]]:
        """
        Build context string with numbered citations for LLM.

        Creates a context string suitable for LLM consumption with:
        - Numbered citations in brackets
        - Truncated chunk content
        - Full source attribution

        Args:
            chunks: List of retrieved chunks
            max_chunks: Maximum chunks to include (default 5)
            max_chars_per_chunk: Maximum characters per chunk content

        Returns:
            Tuple of (context_string, list_of_citations)
        """
        context_parts = []
        citations = []

        for i, chunk in enumerate(chunks[:max_chunks], 1):
            # Format content
            content = self.format_chunk_for_context(chunk, max_chars_per_chunk)

            # Generate citation
            citation = Citation(
                chunk_id=chunk.id,
                document_title=chunk.document_title,
                source_type=chunk.source_type,
                source_location=chunk.source_page_ref
                or ("URL" if chunk.source_url else "Document"),
                hierarchy_path=" → ".join(chunk.hierarchy_path)
                if chunk.hierarchy_path
                else "",
                similarity=chunk.similarity,
            )

            # Build numbered citation
            citation_text = self.generate_citation(chunk)
            citations.append(citation)

            # Create context entry
            context_parts.append(f"[{i}] {content}\nSource: {citation_text}")

        # Join with double newlines for clarity
        context = "\n\n".join(context_parts)

        return context, citations

    def build_context_with_inline_citations(
        self,
        chunks: List[RetrievedChunk],
        max_chunks: int = 5,
        max_chars_per_chunk: int = 500,
    ) -> str:
        """
        Build context with inline citations embedded in content.

        Useful for simpler LLM integration where numbered references
        aren't needed.

        Args:
            chunks: List of retrieved chunks
            max_chunks: Maximum chunks to include
            max_chars_per_chunk: Maximum characters per chunk

        Returns:
            Context string with inline citations
        """
        context_parts = []

        for chunk in chunks[:max_chunks]:
            content = self.format_chunk_for_context(chunk, max_chars_per_chunk)
            citation = self.generate_citation(chunk)

            context_parts.append(f"{content}\n— {citation}")

        return "\n\n".join(context_parts)

    def format_llm_response(
        self,
        answer: str,
        citations: List[Citation],
        citation_style: str = "numbered",
        include_similarity: bool = False,
    ) -> str:
        """
        Format LLM answer with citations.

        Appends a sources section with formatted citations.

        Args:
            answer: LLM generated answer
            citations: List of Citation objects
            citation_style: Style for citations ('numbered', 'inline', 'compact')
            include_similarity: Whether to include similarity scores

        Returns:
            Answer with formatted citations appended
        """
        if not citations:
            return answer

        if citation_style == "numbered":
            # Build numbered sources section
            sources_lines = ["\n\n**Sources:**"]
            for i, citation in enumerate(citations, 1):
                location = (
                    f"p.{citation.source_location}"
                    if citation.source_type == "pdf"
                    else citation.source_location
                )

                if include_similarity:
                    sources_lines.append(
                        f"[{i}] {citation.document_title} ({citation.source_type}, {location}) - {citation.similarity:.2f}"
                    )
                else:
                    sources_lines.append(
                        f"[{i}] {citation.document_title} ({citation.source_type}, {location})"
                    )

                # Add hierarchy if present
                if citation.hierarchy_path:
                    sources_lines[-1] += f" - {citation.hierarchy_path}"

            return answer + "\n".join(sources_lines)

        elif citation_style == "inline":
            # Inline citations within text (simplified)
            sources = ", ".join(c.document_title for c in citations)
            return f"{answer}\n\nSources: {sources}"

        elif citation_style == "compact":
            # Compact format with page refs
            sources = []
            for citation in citations:
                if citation.source_type == "pdf":
                    sources.append(
                        f"{citation.document_title}[p.{citation.source_location}]"
                    )
                else:
                    sources.append(citation.document_title)

            return f"{answer}\n\n" + " | ".join(sources)

        else:
            # Default: no citations
            return answer

    def format_citations_for_api(
        self, chunks: List[RetrievedChunk], style: str = "numbered"
    ) -> List[str]:
        """
        Format citations for API response.

        Generates citation strings suitable for direct API inclusion.

        Args:
            chunks: Retrieved chunks
            style: Citation style

        Returns:
            List of formatted citation strings
        """
        citations = []

        for i, chunk in enumerate(chunks, 1):
            citation = Citation(
                chunk_id=chunk.id,
                document_title=chunk.document_title,
                source_type=chunk.source_type,
                source_location=chunk.source_page_ref
                or ("URL" if chunk.source_url else "Document"),
                hierarchy_path=" → ".join(chunk.hierarchy_path)
                if chunk.hierarchy_path
                else "",
                similarity=chunk.similarity,
            )

            citations.append(citation.format(style, i if style == "numbered" else None))

        return citations

    def extract_key_sentences(
        self, chunk: RetrievedChunk, max_sentences: int = 3
    ) -> str:
        """
        Extract key sentences from chunk for focused context.

        Useful for reducing token count while preserving relevance.

        Args:
            chunk: Retrieved chunk
            max_sentences: Maximum sentences to extract

        Returns:
            String of key sentences
        """
        # Simple sentence extraction
        sentences = chunk.content.split(".")
        sentences = [s.strip() + "." for s in sentences if s.strip()]

        # Return first N sentences
        return " ".join(sentences[:max_sentences])

    def calculate_context_quality(
        self, chunks: List[RetrievedChunk], query: str
    ) -> dict:
        """
        Calculate quality metrics for retrieved context.

        Useful for debugging and optimization.

        Args:
            chunks: Retrieved chunks
            query: Original search query

        Returns:
            Dictionary with quality metrics
        """
        if not chunks:
            return {
                "chunk_count": 0,
                "avg_similarity": 0.0,
                "total_chars": 0,
                "source_diversity": 0,
                "quality_score": 0.0,
            }

        # Calculate metrics
        avg_similarity = sum(c.similarity for c in chunks) / len(chunks)
        total_chars = sum(len(c.content) for c in chunks)
        unique_docs = len(set(c.document_id for c in chunks))

        # Quality score based on similarity and diversity
        quality_score = (
            avg_similarity * 0.7
            + (unique_docs / len(chunks)) * 0.2
            + min(1.0, total_chars / 1500) * 0.1
        )

        return {
            "chunk_count": len(chunks),
            "avg_similarity": round(avg_similarity, 3),
            "total_chars": total_chars,
            "source_diversity": unique_docs,
            "quality_score": round(quality_score, 3),
            "query": query,
            "all_sources": list(set(c.document_title for c in chunks)),
        }


class ContextBuilder:
    """
    Builder class for constructing LLM context from retrieved chunks.

    Provides flexible context construction with various optimization
    strategies for different use cases.
    """

    def __init__(self, citation_generator: CitationGenerator):
        """
        Initialize context builder.

        Args:
            citation_generator: Citation generator instance
        """
        self.citation_generator = citation_generator

    def build_standard_context(
        self,
        chunks: List[RetrievedChunk],
        query: str,
        max_chunks: int = 5,
        include_quality_metrics: bool = False,
    ) -> dict:
        """
        Build standard context for LLM consumption.

        Args:
            chunks: Retrieved chunks
            query: Original search query
            max_chunks: Maximum chunks to include
            include_quality_metrics: Whether to include quality metrics

        Returns:
            Dictionary with context, citations, and metadata
        """
        context, citations = self.citation_generator.build_context_with_citations(
            chunks, max_chunks=max_chunks
        )

        result = {
            "context": context,
            "citation_count": len(citations),
            "chunk_count": len(chunks[:max_chunks]),
        }

        if include_quality_metrics:
            result["quality"] = self.citation_generator.calculate_context_quality(
                chunks, query
            )

        return result

    def build_compact_context(
        self, chunks: List[RetrievedChunk], max_chars: int = 1000
    ) -> str:
        """
        Build compact context with inline citations.

        Optimized for token-limited scenarios.

        Args:
            chunks: Retrieved chunks
            max_chars: Maximum characters for context

        Returns:
            Compact context string
        """
        # Select most relevant chunks
        relevant_chunks = []
        current_chars = 0

        for chunk in sorted(chunks, key=lambda c: c.similarity, reverse=True):
            chunk_size = len(chunk.content) + 100  # Account for citation

            if current_chars + chunk_size <= max_chars:
                relevant_chunks.append(chunk)
                current_chars += chunk_size
            else:
                break

        return self.citation_generator.build_context_with_inline_citations(
            relevant_chunks,
            max_chunks=len(relevant_chunks),
            max_chars_per_chunk=max_chars // len(relevant_chunks)
            if relevant_chunks
            else 500,
        )

    def build_detailed_context(
        self,
        chunks: List[RetrievedChunk],
        max_chunks: int = 10,
        include_full_content: bool = False,
    ) -> dict:
        """
        Build detailed context with full chunk information.

        Useful for debugging and verification.

        Args:
            chunks: Retrieved chunks
            max_chunks: Maximum chunks to include
            include_full_content: Whether to include full content

        Returns:
            Detailed context dictionary
        """
        detailed_chunks = []

        for chunk in chunks[:max_chunks]:
            detailed = {
                "id": chunk.id,
                "document_title": chunk.document_title,
                "source_type": chunk.source_type,
                "source_location": chunk.source_page_ref
                or ("URL" if chunk.source_url else "Document"),
                "hierarchy_path": chunk.hierarchy_path,
                "similarity": chunk.similarity,
                "content_preview": chunk.content[:200] + "..."
                if len(chunk.content) > 200
                else chunk.content,
            }

            if include_full_content:
                detailed["full_content"] = chunk.content

            detailed_chunks.append(detailed)

        return {
            "chunks": detailed_chunks,
            "total_retrieved": len(chunks),
            "context_length": sum(len(c.content) for c in chunks[:max_chunks]),
        }
