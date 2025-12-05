"""
Protein-aware Query Engine for RAG with metadata filtering.

This module provides a query engine that can filter ChromaDB results by
GenAge proteins and aging theories, and synthesize responses with citations.
"""

import json
import chromadb
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
    - ChromaDB similarity search
    - Metadata filtering by proteins and theories
    - LLM-based response synthesis (Groq)
    - Embeddings via Nebius AI
    - Citation extraction and formatting
    - Confidence scoring
    """
    
    def __init__(
        self,
        chroma_path: str = "backend/chroma_store",
        collection_name: str = "longevity_papers",
        embed_model: str = "Qwen/Qwen3-Embedding-8B",
        llm_model: str = "llama-3.3-70b-versatile",
        llm_client: Optional[OpenAI] = None,
        embed_client: Optional[OpenAI] = None
    ):
        """
        Initialize query engine.
        
        Args:
            chroma_path: Path to ChromaDB storage directory
            collection_name: Name of the ChromaDB collection
            embed_model: Embedding model name (Nebius)
            llm_model: LLM model name for synthesis (Groq)
            llm_client: OpenAI-compatible client for LLM (Groq)
            embed_client: OpenAI-compatible client for embeddings (Nebius)
        """
        # Handle paths relative to project root
        self.chroma_path = Path(chroma_path)
        if not self.chroma_path.exists():
            self.chroma_path = Path(__file__).parent.parent / chroma_path
        
        self.collection_name = collection_name
        self.embed_model = embed_model
        self.llm_model = llm_model
        self.llm_client = llm_client
        self.embed_client = embed_client
        
        # Initialize ChromaDB client and collection
        if not self.chroma_path.exists():
            raise FileNotFoundError(f"ChromaDB store not found: {chroma_path} or {self.chroma_path}")
        
        self.chroma_client = chromadb.PersistentClient(path=str(self.chroma_path))
        self.collection = self.chroma_client.get_collection(name=collection_name)
        print(f"[QueryEngine] Loaded ChromaDB collection: {self.collection.count()} vectors")
    
    def _create_query_embedding(self, query: str) -> List[float]:
        """Create embedding for query text using Nebius."""
        if self.embed_client is None:
            raise ValueError("Embedding client not initialized")
        
        response = self.embed_client.embeddings.create(
            model=self.embed_model,
            input=[query]
        )
        
        return response.data[0].embedding
    
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
        
        # Search ChromaDB (retrieve more than top_k to account for filtering)
        search_k = top_k * 5 if (protein_filter or theory_filters) else top_k
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=search_k,
            include=["documents", "metadatas", "distances"]
        )
        
        # Build chunk results (ChromaDB returns distance, convert to similarity score)
        chunks = []
        if results and results['ids'] and results['ids'][0]:
            for i, chunk_id in enumerate(results['ids'][0]):
                # ChromaDB uses L2 distance by default, convert to similarity
                # Lower distance = more similar, so we use 1/(1+distance) for similarity
                distance = results['distances'][0][i] if results['distances'] else 0
                score = 1.0 / (1.0 + distance)  # Convert distance to similarity score
                
                text = results['documents'][0][i] if results['documents'] else ""
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                
                chunks.append(ChunkResult(
                    chunk_id=chunk_id,
                    text=text,
                    score=score,
                    metadata=metadata
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
        Synthesize answer using Groq LLM with retrieved chunks.
        
        Args:
            query: User query
            chunks: Retrieved chunks
            citations: Extracted citations
        
        Returns:
            Synthesized answer with citations
        """
        if self.llm_client is None:
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
            response = self.llm_client.chat.completions.create(
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
