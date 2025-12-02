"""
Protein-aware Query Engine for RAG with metadata filtering.

This module provides a query engine that can filter FAISS results by
GenAge proteins and aging theories, and synthesize responses with citations.
"""

import json
import faiss
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
from openai import OpenAI


@dataclass
class ChunkResult:
    """Represents a single retrieved chunk with metadata."""
    chunk_id: str
    text: str
    score: float
    metadata: Dict[str, Any]
    
    @property
    def pmcid(self) -> str:
        """Get PMCID from metadata."""
        return self.metadata.get("pmcid", "")
    
    @property
    def pmid(self) -> str:
        """Get PMID from metadata."""
        return self.metadata.get("pmid", "")
    
    @property
    def title(self) -> str:
        """Get paper title from metadata."""
        return self.metadata.get("title", "")
    
    @property
    def year(self) -> int:
        """Get publication year from metadata."""
        year = self.metadata.get("year", 0)
        return int(year) if year else 0
    
    @property
    def proteins_mentioned(self) -> List[str]:
        """Get list of proteins mentioned in this chunk."""
        proteins = self.metadata.get("proteins_mentioned", "")
        if isinstance(proteins, str):
            try:
                return json.loads(proteins) if proteins else []
            except:
                return []
        return proteins if isinstance(proteins, list) else []
    
    @property
    def aging_theories(self) -> List[str]:
        """Get list of aging theories for this chunk."""
        theories = self.metadata.get("aging_theories", "")
        if isinstance(theories, str):
            try:
                return json.loads(theories) if theories else []
            except:
                return []
        return theories if isinstance(theories, list) else []


@dataclass
class QueryResult:
    """Structured result from a RAG query."""
    query: str
    answer: str
    chunks: List[ChunkResult]
    citations: List[Dict[str, Any]]
    confidence: float
    proteins_mentioned: List[str]
    theories_identified: List[str]
    query_time_ms: float
    filters_applied: Dict[str, Any]


class ProteinQueryEngine:
    """
    Query engine with protein and theory filtering for RAG.
    
    Features:
    - FAISS similarity search
    - Metadata filtering by proteins and theories
    - LLM-based response synthesis
    - Citation extraction and formatting
    - Confidence scoring
    """
    
    def __init__(
        self,
        faiss_index_path: str = "backend/faiss_store/index.faiss",
        metadata_path: str = "backend/faiss_store/meta.jsonl",
        embed_model: str = "Qwen/Qwen3-Embedding-8B",
        llm_model: str = "Qwen/Qwen3-30B-A3B-Instruct-2507",
        openai_client: Optional[OpenAI] = None
    ):
        """
        Initialize query engine.
        
        Args:
            faiss_index_path: Path to FAISS index file
            metadata_path: Path to metadata JSONL file
            embed_model: Embedding model name
            llm_model: LLM model name for synthesis
            openai_client: Optional OpenAI client (will create if not provided)
        """
        # Handle paths relative to project root
        self.faiss_index_path = Path(faiss_index_path)
        if not self.faiss_index_path.exists():
            self.faiss_index_path = Path(__file__).parent.parent / faiss_index_path
        
        self.metadata_path = Path(metadata_path)
        if not self.metadata_path.exists():
            self.metadata_path = Path(__file__).parent.parent / metadata_path
        
        self.embed_model = embed_model
        self.llm_model = llm_model
        self.client = openai_client
        
        # Load FAISS index
        if not self.faiss_index_path.exists():
            raise FileNotFoundError(f"FAISS index not found: {faiss_index_path} or {self.faiss_index_path}")
        
        self.index = faiss.read_index(str(self.faiss_index_path))
        print(f"[QueryEngine] Loaded FAISS index: {self.index.ntotal} vectors")
        
        # Load metadata
        self.metadata = self._load_metadata()
        print(f"[QueryEngine] Loaded {len(self.metadata)} metadata entries")
    
    def _load_metadata(self) -> List[Dict[str, Any]]:
        """Load metadata from JSONL file."""
        if not self.metadata_path.exists():
            raise FileNotFoundError(f"Metadata file not found: {self.metadata_path}")
        
        metadata = []
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    metadata.append(json.loads(line))
        return metadata
    
    def _create_query_embedding(self, query: str) -> np.ndarray:
        """Create embedding for query text."""
        if self.client is None:
            raise ValueError("OpenAI client not initialized")
        
        response = self.client.embeddings.create(
            model=self.embed_model,
            input=[query]
        )
        
        embedding = np.array(response.data[0].embedding, dtype="float32").reshape(1, -1)
        faiss.normalize_L2(embedding)
        return embedding
    
    def _filter_chunks(
        self,
        chunks: List[ChunkResult],
        protein_filter: Optional[str] = None,
        theory_filters: Optional[List[str]] = None
    ) -> List[ChunkResult]:
        """
        Filter chunks by protein and/or theory.
        
        Args:
            chunks: List of chunk results
            protein_filter: Protein symbol to filter by (case-insensitive)
            theory_filters: List of theory names to filter by
        
        Returns:
            Filtered list of chunks
        """
        filtered = chunks
        
        # Filter by protein
        if protein_filter:
            protein_upper = protein_filter.upper()
            filtered = [
                chunk for chunk in filtered
                if protein_upper in [p.upper() for p in chunk.proteins_mentioned]
            ]
        
        # Filter by theories (chunk must have at least one of the specified theories)
        if theory_filters:
            theory_set = set(theory_filters)
            filtered = [
                chunk for chunk in filtered
                if any(theory in theory_set for theory in chunk.aging_theories)
            ]
        
        return filtered
    
    def query(
        self,
        query_text: str,
        top_k: int = 10,
        protein_filter: Optional[str] = None,
        theory_filters: Optional[List[str]] = None,
        synthesize: bool = True
    ) -> QueryResult:
        """
        Execute RAG query with optional filters.
        
        Args:
            query_text: Natural language query
            top_k: Number of chunks to retrieve
            protein_filter: Optional protein symbol to filter by
            theory_filters: Optional list of theories to filter by
            synthesize: Whether to synthesize LLM response
        
        Returns:
            QueryResult with answer, chunks, and citations
        """
        import time
        start_time = time.time()
        
        # Create query embedding
        query_embedding = self._create_query_embedding(query_text)
        
        # Search FAISS (retrieve more than top_k to account for filtering)
        search_k = top_k * 5 if (protein_filter or theory_filters) else top_k
        scores, indices = self.index.search(query_embedding, search_k)
        
        # Build chunk results
        chunks = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.metadata):
                meta_entry = self.metadata[idx]
                chunks.append(ChunkResult(
                    chunk_id=meta_entry.get("id", ""),
                    text=meta_entry.get("text", ""),
                    score=float(score),
                    metadata=meta_entry.get("meta", {})
                ))
        
        # Apply filters
        if protein_filter or theory_filters:
            chunks = self._filter_chunks(chunks, protein_filter, theory_filters)
        
        # Limit to top_k after filtering
        chunks = chunks[:top_k]
        
        # Extract citations
        citations = self._extract_citations(chunks)
        
        # Collect proteins and theories
        all_proteins = set()
        all_theories = set()
        for chunk in chunks:
            all_proteins.update(chunk.proteins_mentioned)
            all_theories.update(chunk.aging_theories)
        
        # Synthesize answer
        answer = ""
        if synthesize and chunks:
            answer = self._synthesize_answer(query_text, chunks, citations)
        
        # Calculate confidence
        confidence = self._calculate_confidence(chunks)
        
        query_time = (time.time() - start_time) * 1000  # Convert to ms
        
        return QueryResult(
            query=query_text,
            answer=answer,
            chunks=chunks,
            citations=citations,
            confidence=confidence,
            proteins_mentioned=sorted(all_proteins),
            theories_identified=sorted(all_theories),
            query_time_ms=query_time,
            filters_applied={
                "protein": protein_filter,
                "theories": theory_filters
            }
        )
    
    def _extract_citations(self, chunks: List[ChunkResult]) -> List[Dict[str, Any]]:
        """
        Extract and format citations from chunks.
        
        Args:
            chunks: List of chunk results
        
        Returns:
            List of citation dictionaries
        """
        citations_dict = {}
        
        for chunk in chunks:
            pmcid = chunk.pmcid
            if pmcid and pmcid not in citations_dict:
                citations_dict[pmcid] = {
                    "pmcid": pmcid,
                    "pmid": chunk.pmid,
                    "title": chunk.title,
                    "year": chunk.year,
                    "relevance_score": chunk.score
                }
        
        # Sort by relevance score
        citations = sorted(
            citations_dict.values(),
            key=lambda x: x["relevance_score"],
            reverse=True
        )
        
        return citations
    
    def _calculate_confidence(self, chunks: List[ChunkResult]) -> float:
        """
        Calculate confidence score based on chunk scores.
        
        Args:
            chunks: List of chunk results
        
        Returns:
            Confidence score between 0 and 1
        """
        if not chunks:
            return 0.0
        
        # Use average of top 3 scores
        top_scores = [chunk.score for chunk in chunks[:3]]
        avg_score = sum(top_scores) / len(top_scores)
        
        # Normalize to 0-1 range (cosine similarity is already 0-1 for normalized vectors)
        confidence = min(max(avg_score, 0.0), 1.0)
        
        return confidence
    
    def _synthesize_answer(
        self,
        query: str,
        chunks: List[ChunkResult],
        citations: List[Dict[str, Any]]
    ) -> str:
        """
        Synthesize answer using LLM with retrieved chunks.
        
        Args:
            query: User query
            chunks: Retrieved chunks
            citations: Extracted citations
        
        Returns:
            Synthesized answer with citations
        """
        if self.client is None:
            return "LLM client not initialized"
        
        # Build context from chunks
        context_parts = []
        for i, chunk in enumerate(chunks[:5], 1):  # Use top 5 chunks
            pmcid = chunk.pmcid or "Unknown"
            context_parts.append(f"[{i}] (PMCID: {pmcid})\n{chunk.text}\n")
        
        context = "\n".join(context_parts)
        
        # Build citation reference
        citation_refs = []
        for i, cite in enumerate(citations[:5], 1):
            pmcid = cite["pmcid"]
            title = cite["title"][:100] + "..." if len(cite["title"]) > 100 else cite["title"]
            year = cite["year"]
            citation_refs.append(f"[{i}] {title} ({year}) - PMCID: {pmcid}")
        
        citations_text = "\n".join(citation_refs)
        
        # Create prompt
        system_prompt = """You are an expert in aging biology and gerontology. 
Answer questions based on the provided scientific literature excerpts.
Always cite sources using [number] notation.
Be precise and scientific in your language.
If the context doesn't contain enough information, say so."""
        
        user_prompt = f"""Question: {query}

Context from scientific literature:
{context}

Available citations:
{citations_text}

Please provide a comprehensive answer based on the context above. 
Cite sources using [number] notation (e.g., [1], [2]).
Focus on aging-related mechanisms and proteins when relevant."""
        
        try:
            response = self.client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=400,  # Reduced for faster responses
                temperature=0.2  # Lower temp = faster, more deterministic
            )
            
            answer = response.choices[0].message.content
            return answer
        
        except Exception as e:
            print(f"[QueryEngine] Error synthesizing answer: {e}")
            return f"Error generating response: {str(e)}"


if __name__ == "__main__":
    print("ProteinQueryEngine module loaded successfully")
    print("Use this module by importing: from protein_query_engine import ProteinQueryEngine")
