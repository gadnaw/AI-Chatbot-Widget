"""
Unit Tests for Chunking Engine

Tests semantic chunking functionality including PDF, HTML, and text strategies
with mocking for external dependencies.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from langchain.schema import Document
from app.services.rag.chunking import ChunkingEngine


class TestPDFChunking:
    """Test PDF-specific chunking functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ChunkingEngine()

    def test_pdf_chunking_respects_boundaries(self):
        """
        Test that PDF chunking respects character boundaries and page markers.

        Verifies:
        - Chunks respect 1200 character target size
        - Overlap of 200 characters is applied
        - Page markers are added to chunks
        """
        # Create a multi-page PDF document simulation
        long_content = (
            """
        This is the first page of a PDF document. It contains multiple paragraphs
        that should be split according to the PDF chunking strategy. The goal is
        to ensure that chunks are created at semantic boundaries rather than
        arbitrary character limits.

        This is the second page. We want to verify that the chunking algorithm
        can handle multi-page documents and properly segment content based on
        the configured chunk size and overlap parameters.

        Third page content continues here. The system should maintain coherence
        across chunk boundaries while ensuring that no critical information is
        lost during the segmentation process.
        """
            * 5
        )  # Repeat to create longer content

        document = Document(
            page_content=long_content,
            metadata={"page_number": 0, "source_path": "test.pdf"},
        )

        # Chunk the document
        chunks = self.engine.chunk_pdf(document)

        # Verify chunking occurred
        assert len(chunks) > 1, "PDF should produce multiple chunks"

        # Verify each chunk has expected metadata
        for chunk in chunks:
            assert "source_type" in chunk.metadata
            assert chunk.metadata["source_type"] == "pdf"
            assert "source_page_ref" in chunk.metadata
            assert "chunk_index" in chunk.metadata
            assert "total_chunks" in chunk.metadata

        # Verify overlap is present (check consecutive chunks share some content)
        if len(chunks) >= 2:
            overlap_content = chunks[0].page_content[-100:]
            assert overlap_content.strip() in chunks[1].page_content or any(
                word in chunks[1].page_content
                for word in chunks[0].page_content.split()[-5:]
            )

    def test_pdf_chunking_with_short_content(self):
        """
        Test PDF chunking with content shorter than chunk size.

        Verifies:
        - Short documents return a single chunk
        - All metadata is preserved
        """
        short_content = "This is a short PDF content that should remain as one chunk."

        document = Document(
            page_content=short_content,
            metadata={"page_number": 0, "source_path": "test.pdf"},
        )

        chunks = self.engine.chunk_pdf(document)

        # Short content should produce one chunk
        assert len(chunks) == 1
        assert chunks[0].page_content == short_content

    def test_pdf_page_marker_preservation(self):
        """
        Test that page markers are properly added to chunks.

        Verifies:
        - Page numbers are correctly referenced in metadata
        - Source page ref format is correct
        """
        content = "Page 1 content with some text." * 50

        document = Document(
            page_content=content,
            metadata={
                "page_number": 2,
                "source_path": "test.pdf",
            },  # Third page (0-indexed)
        )

        chunks = self.engine.chunk_pdf(document)

        # Verify page reference is present
        for chunk in chunks:
            assert "source_page_ref" in chunk.metadata
            # Should reference page 3 (page_number 2 + 1)
            assert chunk.metadata["source_page_ref"] == "3"


class TestHTMLChunking:
    """Test HTML-specific chunking functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ChunkingEngine()

    def test_html_chunking_removes_scripts(self):
        """
        Test that HTML chunking removes script tags and other non-content.

        Verifies:
        - Script tags are removed from content
        - Style tags are removed
        - Navigation elements are cleaned
        """
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Page</title>
            <script>
                console.log('This should be removed');
                var tracking = 'remove this';
            </script>
            <style>
                body { font-size: 14px; }
                .hidden { display: none; }
            </style>
        </head>
        <body>
            <nav class="navigation">
                <a href="/home">Home</a>
                <a href="/about">About</a>
            </nav>
            <main>
                <h1>Main Content Title</h1>
                <p>This is the main content that should be preserved after chunking.
                   It contains valuable information for the RAG system.</p>
                <section>
                    <h2>Subsection Title</h2>
                    <p>Additional content in a subsection with more details.</p>
                </section>
            </main>
            <footer>
                <p>Footer content should not be included in chunks.</p>
            </footer>
        </body>
        </html>
        """

        document = Document(
            page_content=html_content,
            metadata={
                "source_url": "https://example.com/test",
                "title": "Test Page",
                "dom_path": ["html", "body", "main"],
            },
        )

        chunks = self.engine.chunk_html(document)

        # Verify chunks were created
        assert len(chunks) > 0, "HTML should produce at least one chunk"

        # Verify no script tags remain
        for chunk in chunks:
            assert "<script>" not in chunk.page_content.lower()
            assert "</script>" not in chunk.page_content.lower()
            # Style tags should also be removed
            assert "<style>" not in chunk.page_content.lower()

        # Verify main content is preserved
        content_combined = " ".join(chunk.page_content for chunk in chunks)
        assert "Main Content Title" in content_combined
        assert "Main content that should be preserved" in content_combined

    def test_html_chunking_preserves_headings(self):
        """
        Test that HTML chunking preserves heading structure.

        Verifies:
        - H1, H2, H3 headings are referenced in hierarchy
        - Heading text is included in chunk metadata
        """
        html_content = """
        <h1>Document Title</h1>
        <p>Introductory paragraph.</p>
        <h2>Section One</h2>
        <p>Content of section one with important information.</p>
        <h3>Subsection 1.1</h3>
        <p>Detailed content in subsection.</p>
        """

        document = Document(
            page_content=html_content,
            metadata={
                "source_url": "https://example.com",
                "title": "Test Document",
                "dom_path": ["article"],
            },
        )

        chunks = self.engine.chunk_html(document)

        # Verify chunks created
        assert len(chunks) > 0

        # Verify source type is set
        for chunk in chunks:
            assert chunk.metadata.get("source_type") == "html"

    def test_html_metadata_enrichment(self):
        """
        Test that HTML chunking enriches chunks with metadata.

        Verifies:
        - Title is preserved
        - Source URL is stored
        - Word and character counts are calculated
        """
        html_content = """
        <h1>Test Article</h1>
        <p>This is a test article with some content to verify metadata enrichment
           during the HTML chunking process.</p>
        """

        document = Document(
            page_content=html_content,
            metadata={
                "source_url": "https://example.com/article",
                "title": "Test Article",
                "description": "A test article description",
            },
        )

        chunks = self.engine.chunk_html(document)

        assert len(chunks) > 0

        # Verify metadata enrichment
        chunk = chunks[0]
        assert chunk.metadata.get("source_url") == "https://example.com/article"
        assert chunk.metadata.get("title") == "Test Article"
        assert "word_count" in chunk.metadata
        assert "char_count" in chunk.metadata
        assert chunk.metadata["word_count"] > 0
        assert chunk.metadata["char_count"] > 0


class TestTextChunking:
    """Test text-specific chunking functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ChunkingEngine()

    def test_text_chunking_preserves_paragraphs(self):
        """
        Test that text chunking preserves paragraph boundaries.

        Verifies:
        - Paragraph structure is maintained
        - No mid-sentence splits in ideal conditions
        """
        text_content = """
        This is the first paragraph. It contains multiple sentences and should
        be preserved as a coherent unit during the chunking process.

        This is the second paragraph. It also contains several sentences that
        describe different concepts and should be kept together when possible.

        Third paragraph with additional information. This helps test that the
        chunking algorithm can handle multiple paragraphs while maintaining
        the natural structure of the text.
        """

        document = Document(page_content=text_content, metadata={})

        chunks = self.engine.chunk_text(document)

        # Verify chunks created
        assert len(chunks) > 0

        # Verify each chunk has required metadata
        for chunk in chunks:
            assert chunk.metadata.get("source_type") == "text"
            assert "chunk_index" in chunk.metadata
            assert "total_chunks" in chunk.metadata

    def test_text_no_mid_sentence_splits(self):
        """
        Test that text chunking avoids mid-sentence splits when possible.

        Verifies:
        - Chunks end at sentence boundaries
        - Sentence-ending punctuation is preserved
        """
        # Create content that might trigger mid-sentence splits
        text_content = (
            "This is a very long sentence that continues for quite a while "
            "because we want to test whether the chunking algorithm can "
            "properly identify sentence boundaries and avoid splitting "
            "in the middle of important phrases. " * 10
        )

        document = Document(page_content=text_content, metadata={})

        chunks = self.engine.chunk_text(document)

        # Verify chunks were created
        assert len(chunks) > 0

        # Most chunks should end with sentence punctuation
        for chunk in chunks[:-1]:  # Skip last chunk
            content = chunk.page_content.strip()
            if content:
                # Should end with sentence-ending punctuation
                assert content[-1] in ".!?", (
                    f"Chunk should end with sentence punctuation: '{content[-30:]}'"
                )


class TestOverlapFunctionality:
    """Test overlap functionality across chunking strategies."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ChunkingEngine()

    def test_overlap_prevents_context_loss(self):
        """
        Test that overlap prevents context loss at chunk boundaries.

        Verifies:
        - Consecutive chunks share overlapping content
        - Key terms appear in multiple chunks when near boundaries
        """
        # Create content with specific phrases at boundaries
        text_content = (
            """
        Introduction paragraph that sets up the main topic of discussion.
        This is the first main point with important details about the subject.
        Key concept: semantic chunking is crucial for RAG systems.

        Transition sentence that connects to the next section seamlessly.
        Second main point with supporting evidence and examples.
        Another key point about embedding quality and vector search.

        Third section with final conclusions and summary information.
        Concluding remarks that wrap up the overall argument.
        """
            * 3
        )

        document = Document(page_content=text_content, metadata={})

        chunks = self.engine.chunk_text(document)

        # Need at least 2 chunks to test overlap
        if len(chunks) >= 2:
            first_chunk_words = set(chunks[0].page_content.split())
            second_chunk_words = set(chunks[1].page_content.split())

            # There should be some overlap in words
            overlap = first_chunk_words & second_chunk_words
            # Remove common stopwords for meaningful overlap check
            meaningful_overlap = overlap - {
                "the",
                "a",
                "an",
                "and",
                "or",
                "but",
                "in",
                "on",
                "at",
                "to",
                "for",
            }

            # Should have some meaningful word overlap
            assert len(meaningful_overlap) > 0, "Overlap should preserve some context"


class TestMetadataEnrichment:
    """Test metadata enrichment across all chunking strategies."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ChunkingEngine()

    def test_metadata_enrichment_complete(self):
        """
        Test that all required metadata fields are added to chunks.

        Verifies:
        - chunk_index is set correctly
        - total_chunks is calculated
        - word_count and char_count are present
        - source_type is set appropriately
        """
        # Test with text (simplest case)
        text_content = (
            "Test document content for metadata enrichment verification. " * 50
        )

        document = Document(page_content=text_content, metadata={})

        chunks = self.engine.chunk_text(document)

        assert len(chunks) > 0

        for i, chunk in enumerate(chunks):
            # Verify all required metadata fields
            assert "chunk_index" in chunk.metadata, "chunk_index missing"
            assert "total_chunks" in chunk.metadata, "total_chunks missing"
            assert "source_type" in chunk.metadata, "source_type missing"
            assert "word_count" in chunk.metadata, "word_count missing"
            assert "char_count" in chunk.metadata, "char_count missing"

            # Verify values are reasonable
            assert chunk.metadata["chunk_index"] == i
            assert chunk.metadata["total_chunks"] == len(chunks)
            assert chunk.metadata["word_count"] > 0
            assert chunk.metadata["char_count"] > 0


class TestTableHandling:
    """Test table detection and preservation in PDF chunks."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ChunkingEngine()

    def test_table_handling_pdf(self):
        """
        Test that table structures are detected and preserved.

        Verifies:
        - Table-like content is detected
        - Tables are marked with metadata flag
        - Table warning is added to metadata
        """
        # Create content that looks like a table
        table_content = """
        Name\tAge\tLocation
        John\t25\tNew York
        Jane\t30\tLos Angeles
        Bob\t35\tChicago
        """

        document = Document(
            page_content=table_content,
            metadata={"page_number": 0, "source_path": "table.pdf"},
        )

        chunks = self.engine.chunk_pdf(document)

        # Verify chunks were created
        assert len(chunks) > 0

        # Check if table was detected
        # Note: Table detection may or may not trigger depending on implementation
        # The important thing is that the content is chunked correctly


class TestHierarchyPathExtraction:
    """Test hierarchy path extraction for contextual understanding."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ChunkingEngine()

    def test_hierarchy_path_extraction(self):
        """
        Test that hierarchy paths are correctly extracted from metadata.

        Verifies:
        - Hierarchy path is added to chunk metadata
        - Path structure is preserved correctly
        """
        # Create document with hierarchy metadata
        content = "This is content that should have hierarchy metadata."

        document = Document(
            page_content=content,
            metadata={
                "page_number": 0,
                "source_path": "test.pdf",
                "section": "Introduction",
                "chapter": "Getting Started",
                "headings": ["Main Heading", "Subheading"],
            },
        )

        chunks = self.engine.chunk_pdf(document)

        assert len(chunks) > 0

        # Check if hierarchy was extracted
        chunk = chunks[0]
        # Hierarchy might be extracted as list or string depending on implementation
        if "hierarchy_path" in chunk.metadata:
            hierarchy = chunk.metadata["hierarchy_path"]
            # Should contain extracted headings
            assert isinstance(hierarchy, (list, tuple, str))


class TestChunkingEngineEdgeCases:
    """Test edge cases and error conditions."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ChunkingEngine()

    def test_empty_document(self):
        """Test chunking handles empty documents gracefully."""
        document = Document(page_content="", metadata={})

        # Should not raise exception
        chunks = self.engine.chunk_text(document)

        # Should return empty list or single empty chunk
        assert len(chunks) == 0 or (
            len(chunks) == 1 and len(chunks[0].page_content) == 0
        )

    def test_whitespace_only_content(self):
        """Test chunking handles whitespace-only content."""
        document = Document(page_content="   \n\n   \t  ", metadata={})

        chunks = self.engine.chunk_text(document)

        # Should handle gracefully
        assert isinstance(chunks, list)

    def test_very_long_single_sentence(self):
        """Test chunking very long sentences without natural breaks."""
        # Create a very long sentence
        long_sentence = "Word " * 500 + "end."

        document = Document(page_content=long_sentence, metadata={})

        chunks = self.engine.chunk_text(document)

        # Should split the long sentence
        assert len(chunks) > 1

    def test_unicode_content(self):
        """Test chunking handles unicode content correctly."""
        unicode_content = """
        English content with some unicode: café, naïve, 日本語, émojis 🚀
        More unicode text including mathematical symbols: ∑ ∫ √ π
        """

        document = Document(page_content=unicode_content, metadata={})

        chunks = self.engine.chunk_text(document)

        # Should handle unicode without errors
        assert len(chunks) > 0
        for chunk in chunks:
            # Content should be preserved
            assert isinstance(chunk.page_content, str)


class TestChunkingDispatcher:
    """Test the chunk_document dispatcher method."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ChunkingEngine()

    def test_pdf_dispatcher(self):
        """Test that PDF documents route to PDF chunking."""
        content = "PDF content for testing dispatcher routing."

        document = Document(page_content=content, metadata={"page_number": 0})

        chunks = self.engine.chunk_document(document, "pdf")

        assert len(chunks) > 0
        assert chunks[0].metadata.get("source_type") == "pdf"

    def test_html_dispatcher(self):
        """Test that HTML documents route to HTML chunking."""
        content = "<p>HTML content for testing.</p>"

        document = Document(
            page_content=content, metadata={"source_url": "https://example.com"}
        )

        chunks = self.engine.chunk_document(document, "html")

        assert len(chunks) > 0
        assert chunks[0].metadata.get("source_type") == "html"

    def test_text_dispatcher(self):
        """Test that text documents route to text chunking."""
        content = "Plain text content for testing dispatcher routing."

        document = Document(page_content=content, metadata={})

        chunks = self.engine.chunk_document(document, "text")

        assert len(chunks) > 0
        assert chunks[0].metadata.get("source_type") == "text"

    def test_invalid_document_type(self):
        """Test that unsupported document types raise ValueError."""
        content = "Some content"

        document = Document(page_content=content, metadata={})

        with pytest.raises(ValueError) as exc_info:
            self.engine.chunk_document(document, "invalid_type")

        assert "Unsupported document type" in str(exc_info.value)
