"""
Production Query Engine using NeonDB with pgvector.

Drop-in replacement for ProteinQueryEngine that uses NeonDB instead of ChromaDB.
"""

import os
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from openai import OpenAI

from neon_vector_store import NeonVectorStore, SearchResult


@dataclass
class ChunkResult:
    """Represents a single retrieved chunk with metadata."""
    chunk_id: str
    text: str
    score: float
    metadata: Dict[str, Any]
    
    @property
    def pmcid(self) -> str:
        return self.metadata.get("pmcid", "")
    
    @property
    def pmid(self) -> str:
        return self.metadata.get("pmid", "")
    
    @property
    def title(self) -> str:
        return self.metadata.get("title", "")
    
    @property
    def year(self) -> int:
        year = self.metadata.get("year", 0)
        return int(year) if year else 0
    
    @property
    def proteins_mentioned(self) -> List[str]:
        proteins = self.metadata.get("proteins_mentioned", [])
        return proteins if isinstance(proteins, list) else []
    
    @property
    def aging_theories(self) -> List[str]:
        theories = self.metadata.get("aging_theories", [])
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


class NeonQueryEngine:
    """
    Query engine using NeonDB + pgvector for production.
    
    API-compatible with ProteinQueryEngine for easy switching.
    """
    
    def __init__(
        self,
        connection_string: Optional[str] = None,
        table_name: str = "paper_chunks",
        embed_model: str = "Qwen/Qwen3-Embedding-8B",
        llm_model: str = "llama-3.3-70b-versatile",
        llm_client: Optional[OpenAI] = None,
        embed_client: Optional[OpenAI] = None
    ):
        self.vector_store = NeonVectorStore(
            connection_string=connection_string,
            table_name=table_name
        )
        self.embed_model = embed_model
        self.llm_model = llm_model
        self.llm_client = llm_client
        self.embed_client = embed_client
        
        count = self.vector_store.count()
        print(f"[NeonQueryEngine] Connected to NeonDB: {count} vectors")
    
    def _create_query_embedding(self, query: str) -> List[float]:
        """Create embedding for query text using Nebius."""
        if self.embed_client is None:
            raise ValueError("Embedding client not initialized")
        
        response = self.embed_client.embeddings.create(
            model=self.embed_model,
            input=[query]
        )
        return response.data[0].embedding
    
    def query(
        self,
        query_text: str,
        top_k: int = 10,
        protein_filter: Optional[str] = None,
        theory_filters: Optional[List[str]] = None,
        synthesize: bool = True
    ) -> QueryResult:
        """Execute RAG query with optional filters."""
        start_time = time.time()
        
        # Create query embedding
        query_embedding = self._create_query_embedding(query_text)
        
        # Search NeonDB
        theory_filter = theory_filters[0] if theory_filters else None
        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            protein_filter=protein_filter,
            theory_filter=theory_filter
        )
        
        # Convert to ChunkResult
        chunks = [
            ChunkResult(
                chunk_id=r.id,
                text=r.text,
                score=r.score,
                metadata=r.metadata
            )
            for r in results
        ]
        
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
        
        query_time = (time.time() - start_time) * 1000
        
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
        """Extract and format citations from chunks."""
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
        return sorted(citations_dict.values(), key=lambda x: x["relevance_score"], reverse=True)
    
    def _calculate_confidence(self, chunks: List[ChunkResult]) -> float:
        """Calculate confidence score based on chunk scores."""
        if not chunks:
            return 0.0
        top_scores = [chunk.score for chunk in chunks[:3]]
        return min(max(sum(top_scores) / len(top_scores), 0.0), 1.0)
    
    def _synthesize_answer(
        self,
        query: str,
        chunks: List[ChunkResult],
        citations: List[Dict[str, Any]]
    ) -> str:
        """Synthesize answer using Groq LLM."""
        if self.llm_client is None:
            return "LLM client not initialized"
        
        context_parts = []
        for i, chunk in enumerate(chunks[:5], 1):
            pmcid = chunk.pmcid or "Unknown"
            context_parts.append(f"[{i}] (PMCID: {pmcid})\n{chunk.text}\n")
        context = "\n".join(context_parts)
        
        citation_refs = []
        for i, cite in enumerate(citations[:5], 1):
            title = cite["title"][:100] + "..." if len(cite["title"]) > 100 else cite["title"]
            citation_refs.append(f"[{i}] {title} ({cite['year']}) - PMCID: {cite['pmcid']}")
        citations_text = "\n".join(citation_refs)
        
        system_prompt = """You are an expert in aging biology and gerontology. 
Answer questions based on the provided scientific literature excerpts.
Always cite sources using [number] notation.
Be precise and scientific in your language."""
        
        user_prompt = f"""Question: {query}

Context from scientific literature:
{context}

Available citations:
{citations_text}

Provide a comprehensive answer based on the context. Cite sources using [number] notation."""
        
        try:
            response = self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=400,
                temperature=0.2
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[NeonQueryEngine] Error: {e}")
            return f"Error generating response: {str(e)}"
