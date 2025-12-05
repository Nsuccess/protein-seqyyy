import httpx
import os, json, shutil
import re
import xml.etree.ElementTree as ET
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
from typing import List, Optional, Dict, Any
from llama_index.core import Document
from llama_index.core.node_parser import SentenceSplitter
from openai import OpenAI
import chromadb
import numpy as np

# Import GenAge loader, entity recognizer, theory classifier, stats tracker, query engine, UniProt client, statistics service, theory loader, and aging relevance analyzer
from genage_loader import get_global_registry, GenAgeRegistry, GenAgeProtein
from protein_entity_recognizer import get_global_recognizer, ProteinEntityRecognizer
from aging_theory_classifier import get_global_classifier, AgingTheoryClassifier
from indexing_stats import get_global_tracker, IndexingStatsTracker
from aging_relevance_analyzer import AgingRelevanceAnalyzer
from protein_query_engine import ProteinQueryEngine
from uniprot_client import get_global_client as get_uniprot_client, UniProtClient
from statistics_service import get_global_service as get_statistics_service, StatisticsService
from theory_loader import get_global_registry as get_theory_registry, TheoryRegistry, AgingTheory


class Settings(BaseSettings):
    groq_api_key: str
    nebius_api_key: str  # Keep Nebius for embeddings
    neon_database_url: Optional[str] = None  # NeonDB connection string
    vector_store_mode: str = "chroma"  # "chroma" (local) or "neon" (production)
    
    class Config:
        env_file = ".env"

settings = Settings()

app = FastAPI(title="Felix Spike", version="0.0.1")

# Configure CORS to allow frontend requests
# CORS - allow frontend origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Local dev
    "https://*.vercel.app",   # Vercel preview deployments
    os.getenv("FRONTEND_URL", ""),  # Production frontend URL
]
# Filter out empty strings
ALLOWED_ORIGINS = [o for o in ALLOWED_ORIGINS if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------- Public, non-secret config (hard-coded) -------
PAPERS_DIR = "../data/corpus"
CHROMA_PATH = "./chroma_db"            # local on-disk store
CHROMA_COLLECTION = "longevity_s2f"    # name of the vector collection
# Separate test DB (for debugging Chroma without touching the main DB)
CHROMA_TEST_PATH = "./chroma_db_test"
CHROMA_TEST_COLLECTION = "test_basic"
# ChromaDB storage directory for main index
CHROMA_STORE_PATH = "./chroma_store"
CHROMA_STORE_COLLECTION = "longevity_papers"
# ------- API Configuration -------
# Groq API for LLM (chat completions) - fast inference
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Best reasoning, 128k context

# Nebius for embeddings (keep existing)
NEBIUS_BASE_URL = "https://api.studio.nebius.com/v1/"
NEBIUS_EMBED_MODEL = "Qwen/Qwen3-Embedding-8B"

os.environ["OPENAI_API_KEY"] = settings.groq_api_key
os.environ["OPENAI_BASE_URL"] = GROQ_BASE_URL


def get_query_engine():
    """
    Factory function to get the appropriate query engine based on VECTOR_STORE_MODE.
    
    Returns:
        ProteinQueryEngine (ChromaDB) or NeonQueryEngine (NeonDB/pgvector)
    """
    llm_client = OpenAI(
        api_key=settings.groq_api_key,
        base_url=GROQ_BASE_URL
    )
    embed_client = OpenAI(
        api_key=settings.nebius_api_key,
        base_url=NEBIUS_BASE_URL
    )
    
    if settings.vector_store_mode == "neon" and settings.neon_database_url:
        # Use NeonDB for production
        from neon_query_engine import NeonQueryEngine
        return NeonQueryEngine(
            connection_string=settings.neon_database_url,
            llm_client=llm_client,
            embed_client=embed_client
        )
    else:
        # Use ChromaDB for local development
        return ProteinQueryEngine(
            llm_client=llm_client,
            embed_client=embed_client
        )

# Initialize GenAge registry, theory registry, entity recognizer, and theory classifier on startup
print("[STARTUP] Loading GenAge protein registry...")
genage_registry = get_global_registry()

print("[STARTUP] Loading aging theory registry...")
theory_registry = get_theory_registry()
print(f"[STARTUP] Loaded {genage_registry.count()} aging-related proteins from GenAge")

print("[STARTUP] Initializing protein entity recognizer...")
protein_recognizer = get_global_recognizer()

print("[STARTUP] Initializing aging theory classifier...")
theory_classifier = get_global_classifier()

# Initialize Mol-Instructions dataset (optional - only if data is available)
print("[STARTUP] Initializing Mol-Instructions dataset...")
try:
    from mol_instructions_loader import initialize_mol_instructions
    # Try default path - loader will search multiple locations
    mol_registry = initialize_mol_instructions()
    print(f"[STARTUP] Mol-Instructions loaded: {mol_registry.total_count} instructions")
except FileNotFoundError:
    print("[STARTUP] Mol-Instructions data not found - few-shot learning will be unavailable")
    print("[STARTUP] To enable: Download dataset to data/raw/mol_instructions/Protein-oriented_Instructions/")
except Exception as e:
    print(f"[STARTUP] Warning: Could not load Mol-Instructions: {e}")
theory_classifier = get_global_classifier()

print("[STARTUP] Initializing indexing statistics tracker...")
stats_tracker = get_global_tracker()

print("[STARTUP] Initializing UniProt client...")
uniprot_client = get_uniprot_client()

print("[STARTUP] Initializing statistics service...")
statistics_service = get_statistics_service()
print(f"[STARTUP] Loaded {genage_registry.count()} aging-related proteins from GenAge")

print("[STARTUP] Initializing protein entity recognizer...")
protein_recognizer = get_global_recognizer()
print("[STARTUP] Entity recognizer ready")


def load_pmcid_to_text(papers_dir: str = PAPERS_DIR) -> Dict[str, str]:
    """
    Build a mapping {pmcid -> plain_text} from all JSON files under 'papers/'.
    Uses the 'pmcid' and 'plain_text' fields from harvest JSONs.
    Skips entries without a PMCID or without plain text, and swallows I/O/JSON errors.
    """
    mapping: Dict[str, str] = {}
    try:
        if not os.path.isdir(papers_dir):
            return mapping
        for fn in os.listdir(papers_dir):
            if not fn.endswith(".json"):
                continue
            path = os.path.join(papers_dir, fn)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    paper = json.load(f)
                pmcid = (paper.get("pmcid") or "").strip()
                text = (paper.get("plain_text") or "").strip()
                if pmcid and text and pmcid not in mapping:
                    mapping[pmcid] = text
            except Exception:
                # Skip unreadable or malformed entries to keep the scan robust
                pass
    except Exception:
        pass
    return mapping

@app.get("/nebius-embed-hello")
def nebius_embed_hello():
    from openai import OpenAI
    client = OpenAI(api_key=settings.nebius_api_key, base_url=NEBIUS_BASE_URL)
    r = client.embeddings.create(model=NEBIUS_EMBED_MODEL, input=["hello", "protein longevity"])
    print("[EMBED HELLO] dims:", len(r.data[0].embedding), len(r.data[1].embedding))
    return {"status": "ok"}



@app.get("/groq-hello")
def groq_hello():
    """
    Tiny test against Groq Chat Completions.
    - Reads ONLY the API key from .env (no other secrets).
    - Sends a very short prompt.
    - Prints raw response to the server terminal for inspection.
    - Returns only {"status": "ok"} to the client (no extra payload).
    """
    api_key = settings.groq_api_key

    url = f"{GROQ_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Short, harmless test prompt
    prompt = (
        "Return a JSON object with fields 'name', 'url', 'notes' for 3 public databases "
        "that provide free APIs for human proteins that are related to longevity. No markdown, JSON only."
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are a concise scientific assistant."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 500,
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }

    print("[Groq HELLO] POST", url, "model=", GROQ_MODEL)
    with httpx.Client(timeout=60) as client:
        resp = client.post(url, json=payload, headers=headers)

    print("[Groq HELLO] HTTP:", resp.status_code)
    try:
        data = resp.json()
        print("[Groq HELLO] JSON:", data)
        
        if "choices" in data and len(data["choices"]) > 0:
            msg = data["choices"][0]["message"]["content"]
            print("[Groq HELLO] Model response:", msg)
            
            try:
                parsed_response = json.loads(msg)
                print("[Groq HELLO] Parsed JSON:", parsed_response)
            except json.JSONDecodeError as e:
                print("[Groq HELLO] JSON parse error:", e)
                
    except Exception:
        print("[Groq HELLO] TEXT:", resp.text[:1000])

    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/vector-store/status")
def get_vector_store_status():
    """
    Get current vector store configuration and status.
    
    Returns:
        Vector store mode, connection status, and statistics
    """
    mode = settings.vector_store_mode
    
    if mode == "neon" and settings.neon_database_url:
        try:
            from neon_vector_store import NeonVectorStore
            store = NeonVectorStore(connection_string=settings.neon_database_url)
            stats = store.get_stats()
            return {
                "mode": "neon",
                "status": "connected",
                "database": "NeonDB (PostgreSQL + pgvector)",
                "stats": stats
            }
        except Exception as e:
            return {
                "mode": "neon",
                "status": "error",
                "error": str(e)
            }
    else:
        try:
            client = chromadb.PersistentClient(path=CHROMA_STORE_PATH)
            collection = client.get_collection(name=CHROMA_STORE_COLLECTION)
            count = collection.count()
            return {
                "mode": "chroma",
                "status": "connected",
                "database": "ChromaDB (local SQLite)",
                "stats": {
                    "total_chunks": count,
                    "path": CHROMA_STORE_PATH
                }
            }
        except Exception as e:
            return {
                "mode": "chroma",
                "status": "error",
                "error": str(e)
            }


# ------- GenAge Protein Endpoints -------

@app.get("/proteins/genage")
def list_genage_proteins(
    category: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0
):
    """
    List all GenAge aging-related proteins.
    
    Query params:
    - category: Filter by 'why' category (e.g., 'mammal', 'model', 'human_link')
    - limit: Maximum number of proteins to return
    - offset: Number of proteins to skip (for pagination)
    
    Returns:
        List of protein objects with gene symbol, name, UniProt ID, and categories
    """
    if category:
        proteins = genage_registry.filter_by_category(category)
    else:
        proteins = genage_registry.get_all_proteins()
    
    # Apply pagination
    total = len(proteins)
    if limit:
        proteins = proteins[offset:offset + limit]
    else:
        proteins = proteins[offset:]
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "count": len(proteins),
        "proteins": [
            {
                "genage_id": p.genage_id,
                "symbol": p.symbol,
                "name": p.name,
                "uniprot": p.uniprot,
                "entrez_gene_id": p.entrez_gene_id,
                "categories": p.why_categories
            }
            for p in proteins
        ]
    }


@app.get("/protein/{gene_symbol}")
def get_protein_by_symbol(gene_symbol: str):
    """
    Get detailed information for a specific protein by gene symbol.
    
    Args:
        gene_symbol: Gene symbol (e.g., 'APOE', 'SIRT6')
    
    Returns:
        Protein details from GenAge registry
    """
    protein = genage_registry.get_by_symbol(gene_symbol)
    if not protein:
        raise HTTPException(
            status_code=404,
            detail=f"Protein '{gene_symbol}' not found in GenAge database"
        )
    
    return {
        "genage_id": protein.genage_id,
        "symbol": protein.symbol,
        "name": protein.name,
        "uniprot": protein.uniprot,
        "entrez_gene_id": protein.entrez_gene_id,
        "why": protein.why,
        "categories": protein.why_categories
    }


@app.get("/protein/{gene_symbol}/uniprot")
def get_protein_uniprot(gene_symbol: str):
    """
    Get detailed UniProt data for a specific protein.
    
    This endpoint fetches comprehensive protein information from UniProt including
    sequence, structure (PDB IDs), domains, PTMs, GO terms, and functional annotations.
    
    Args:
        gene_symbol: Gene symbol (e.g., 'APOE', 'SIRT6')
    
    Returns:
        Detailed UniProt protein data with caching
    """
    # Verify protein exists in GenAge
    protein = genage_registry.get_by_symbol(gene_symbol)
    if not protein:
        raise HTTPException(
            status_code=404,
            detail=f"Protein '{gene_symbol}' not found in GenAge database"
        )
    
    # Fetch from UniProt
    try:
        uniprot_data = uniprot_client.get_protein(gene_symbol)
        
        if not uniprot_data:
            raise HTTPException(
                status_code=404,
                detail=f"UniProt data not found for '{gene_symbol}'"
            )
        
        return {
            "gene_symbol": uniprot_data.gene_symbol,
            "uniprot_id": uniprot_data.uniprot_id,
            "protein_name": uniprot_data.protein_name,
            "organism": uniprot_data.organism,
            "sequence": {
                "value": uniprot_data.sequence,
                "length": uniprot_data.length
            },
            "function": uniprot_data.function,
            "structure": {
                "pdb_ids": uniprot_data.pdb_ids,
                "pdb_count": len(uniprot_data.pdb_ids)
            },
            "domains": uniprot_data.domains,
            "ptms": uniprot_data.ptms,
            "keywords": uniprot_data.keywords,
            "go_terms": uniprot_data.go_terms[:10],  # Limit to first 10
            "subcellular_location": uniprot_data.subcellular_location,
            "genage_info": {
                "genage_id": protein.genage_id,
                "why": protein.why,
                "categories": protein.why_categories
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[UniProt] Error fetching {gene_symbol}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch UniProt data: {str(e)}"
        )


@app.get("/stats/genage")
def get_genage_statistics():
    """
    Get summary statistics about the GenAge dataset.
    
    Returns:
        Statistics including total proteins, category distribution, etc.
    """
    stats = genage_registry.get_statistics()
    return {
        "total_proteins": stats["total_proteins"],
        "proteins_with_uniprot": stats["proteins_with_uniprot"],
        "category_distribution": stats["category_distribution"],
        "all_symbols": stats["symbols"]
    }


@app.get("/stats/indexing")
def get_indexing_statistics():
    """
    Get cumulative indexing statistics across all batches.
    
    Returns:
        Comprehensive statistics about indexed documents, proteins, and theories
    """
    return {
        "summary": stats_tracker.get_summary(),
        "proteins": stats_tracker.get_protein_stats(),
        "theories": stats_tracker.get_theory_stats(),
        "documents": stats_tracker.stats["documents"],
        "recent_batches": stats_tracker.stats["batches"][-10:]  # Last 10 batches
    }


@app.post("/stats/indexing/reset")
def reset_indexing_statistics():
    """
    Reset all indexing statistics.
    
    Use with caution - this will clear all cumulative statistics.
    """
    stats_tracker.reset()
    return {
        "status": "success",
        "message": "Indexing statistics have been reset"
    }


@app.get("/stats/coverage")
def get_coverage_statistics():
    """
    Get protein coverage statistics.
    
    Returns visualization-ready data about:
    - How many GenAge proteins have papers
    - Coverage percentage
    - Top proteins by paper count
    - Distribution of papers per protein
    
    Perfect for pie charts, bar charts, and coverage visualizations.
    """
    return statistics_service.compute_coverage_statistics()


@app.get("/stats/theories")
def get_theory_statistics():
    """
    Get aging theory distribution statistics.
    
    Returns visualization-ready data about:
    - Papers per aging theory
    - Theory coverage across corpus
    - Top theories by paper count
    - Theory percentages
    
    Perfect for bar charts, pie charts, and theory distribution visualizations.
    """
    return statistics_service.compute_theory_statistics()


@app.get("/stats/quality")
def get_quality_metrics():
    """
    Get data quality metrics.
    
    Returns visualization-ready data about:
    - Publication year distribution
    - Papers by decade
    - Recent vs older papers
    - Data completeness (PMCID, DOI, titles)
    
    Perfect for histograms, timeline charts, and quality dashboards.
    """
    return statistics_service.compute_quality_metrics()


@app.get("/stats/comprehensive")
def get_comprehensive_statistics():
    """
    Get all statistics in one call.
    
    Returns combined coverage, theory, and quality statistics.
    Useful for dashboard initialization.
    """
    return statistics_service.get_comprehensive_stats()


# ------- Mol-Instructions Endpoints -------

@app.get("/mol-instructions/stats")
def get_mol_instructions_stats():
    """
    Get statistics about loaded Mol-Instructions dataset.
    
    Returns:
        Statistics including total instructions and breakdown by task
    """
    from mol_instructions_loader import get_global_registry
    
    registry = get_global_registry()
    stats = registry.get_statistics()
    
    return {
        "total_instructions": registry.total_count,
        "by_task": stats,
        "available_tasks": registry.get_all_tasks(),
        "loaded": registry.total_count > 0
    }


@app.post("/mol-instructions/few-shot-prompt")
def create_few_shot_prompt(
    task: str,
    query: str,
    n_examples: int = 3,
    include_context: bool = False,
    context: Optional[str] = None
):
    """
    Create a few-shot prompt using Mol-Instructions examples.
    
    Args:
        task: Task type (protein_function, catalytic_activity, etc.)
        query: User's query or instruction
        n_examples: Number of examples to include (default: 3, max: 5)
        include_context: Whether to include additional context
        context: Optional context string (e.g., protein sequence)
    
    Returns:
        Generated prompt and metadata
    """
    from mol_instructions_loader import get_global_registry
    from few_shot_prompt_builder import FewShotPromptBuilder
    
    registry = get_global_registry()
    
    if not registry.is_task_loaded(task):
        raise HTTPException(
            status_code=404,
            detail=f"Task '{task}' not loaded. Available tasks: {registry.get_all_tasks()}"
        )
    
    builder = FewShotPromptBuilder(registry)
    
    if include_context and context:
        prompt = builder.build_prompt_with_context(
            task=task,
            query=query,
            context=context,
            n_examples=n_examples
        )
    else:
        prompt = builder.build_prompt(
            task=task,
            query=query,
            n_examples=n_examples
        )
    
    examples = registry.get_examples(task, n=n_examples)
    stats = builder.get_prompt_stats(prompt)
    
    return {
        "prompt": prompt,
        "task": task,
        "n_examples": len(examples),
        "examples_used": [
            {
                "instruction": ex.instruction[:100] + "..." if len(ex.instruction) > 100 else ex.instruction,
                "task": ex.task
            }
            for ex in examples
        ],
        "stats": stats
    }


@app.get("/mol-instructions/tasks")
def get_available_tasks():
    """
    Get list of available Mol-Instructions tasks.
    
    Returns:
        List of task names and their status
    """
    from mol_instructions_loader import get_global_registry
    
    registry = get_global_registry()
    stats = registry.get_statistics()
    
    return {
        "tasks": [
            {
                "name": task,
                "loaded": count > 0,
                "instruction_count": count
            }
            for task, count in stats.items()
        ]
    }


@app.get("/mol-instructions/examples/{task}")
def get_task_examples(task: str, n: int = 5):
    """
    Get sample examples for a specific task.
    
    Args:
        task: Task name
        n: Number of examples to return (default: 5)
    
    Returns:
        Sample examples from the task
    """
    from mol_instructions_loader import get_global_registry
    
    registry = get_global_registry()
    
    if not registry.is_task_loaded(task):
        raise HTTPException(
            status_code=404,
            detail=f"Task '{task}' not loaded"
        )
    
    examples = registry.get_examples(task, n=n)
    
    return {
        "task": task,
        "examples": [
            {
                "instruction": ex.instruction,
                "input": ex.input,
                "output": ex.output
            }
            for ex in examples
        ]
    }


@app.post("/proteins/{symbol}/predict-function")
def predict_protein_function_enhanced(
    symbol: str,
    use_few_shot: bool = True,
    n_examples: int = 3
):
    """
    Enhanced protein function prediction using Mol-Instructions few-shot learning.
    
    Args:
        symbol: Protein gene symbol (e.g., 'APOE')
        use_few_shot: Whether to use few-shot prompting (default: True)
        n_examples: Number of few-shot examples to use (default: 3)
    
    Returns:
        Prediction prompt and metadata
    """
    from mol_instructions_loader import get_global_registry
    from few_shot_prompt_builder import create_protein_function_prompt
    
    # Get protein from GenAge
    protein = genage_registry.get_by_symbol(symbol)
    if not protein:
        raise HTTPException(
            status_code=404,
            detail=f"Protein '{symbol}' not found in GenAge database"
        )
    
    # Get UniProt sequence if available
    sequence = None
    try:
        uniprot_data = uniprot_client.get_protein(symbol)
        if uniprot_data:
            sequence = uniprot_data.sequence
    except:
        pass
    
    if use_few_shot:
        registry = get_global_registry()
        
        if not registry.is_task_loaded("protein_function"):
            raise HTTPException(
                status_code=503,
                detail="Mol-Instructions dataset not loaded. Few-shot learning unavailable."
            )
        
        prompt = create_protein_function_prompt(
            registry=registry,
            protein_symbol=symbol,
            protein_name=protein.name,
            sequence=sequence,
            n_examples=n_examples
        )
        
        examples = registry.get_examples("protein_function", n=n_examples)
        
        return {
            "protein": symbol,
            "name": protein.name,
            "prompt": prompt,
            "few_shot_enabled": True,
            "n_examples": len(examples),
            "sequence_included": sequence is not None,
            "note": "Send this prompt to your LLM for enhanced prediction"
        }
    else:
        # Simple query without few-shot
        query = f"Predict the biological function and role in aging for the protein {symbol} ({protein.name})."
        
        return {
            "protein": symbol,
            "name": protein.name,
            "prompt": query,
            "few_shot_enabled": False,
            "n_examples": 0,
            "sequence_included": False
        }


# ------- RAG Query Endpoints -------

@app.post("/query/rag")
def rag_query(
    query: str,
    top_k: int = 5,  # Reduced from 10 for faster responses
    protein: Optional[str] = None,
    theories: Optional[List[str]] = None,
    synthesize: bool = True
):
    """
    Execute RAG query with optional protein and theory filters.
    
    This endpoint performs semantic search over the indexed corpus with optional
    filtering by GenAge proteins and aging theories, then synthesizes a response
    using an LLM with proper citations.
    
    Args:
        query: Natural language question about aging proteins
        top_k: Number of relevant chunks to retrieve (default: 10)
        protein: Optional protein symbol to filter by (e.g., "APOE", "SIRT6")
        theories: Optional list of aging theories to filter by
        synthesize: Whether to generate LLM response (default: True)
    
    Returns:
        QueryResult with answer, retrieved chunks, citations, and metadata
    
    Example:
        POST /query/rag
        {
            "query": "What is the role of APOE in aging?",
            "top_k": 10,
            "protein": "APOE",
            "theories": ["mitochondrial_dysfunction", "chronic_inflammation"]
        }
    """
    try:
        # Get query engine (ChromaDB or NeonDB based on config)
        query_engine = get_query_engine()
        
        # Execute query
        result = query_engine.query(
            query_text=query,
            top_k=top_k,
            protein_filter=protein,
            theory_filters=theories,
            synthesize=synthesize
        )
        
        # Extract proteins from the LLM answer text (in addition to chunk proteins)
        answer_proteins = list(protein_recognizer.extract_unique_proteins(result.answer))
        
        # Combine proteins from chunks and answer, removing duplicates
        all_proteins = list(set(result.proteins_mentioned + answer_proteins))
        all_proteins.sort()  # Sort for consistent ordering
        
        # Format response
        return {
            "status": "success",
            "query": result.query,
            "answer": result.answer,
            "chunks": [
                {
                    "id": chunk.chunk_id,
                    "text": chunk.text[:500] + "..." if len(chunk.text) > 500 else chunk.text,
                    "score": chunk.score,
                    "pmcid": chunk.pmcid,
                    "pmid": chunk.pmid,
                    "title": chunk.title,
                    "year": chunk.year,
                    "proteins": chunk.proteins_mentioned,
                    "theories": chunk.aging_theories
                }
                for chunk in result.chunks
            ],
            "citations": result.citations,
            "metadata": {
                "confidence": result.confidence,
                "proteins_mentioned": all_proteins,  # Now includes proteins from answer
                "theories_identified": result.theories_identified,
                "query_time_ms": result.query_time_ms,
                "filters_applied": result.filters_applied,
                "chunks_retrieved": len(result.chunks)
            }
        }
    
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Index not found: {str(e)}. Please run indexing first."
        )
    except Exception as e:
        print(f"[RAG Query] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Query failed: {str(e)}"
        )


@app.post("/query/rag-general")
def rag_query_general(
    query: str,
    top_k: int = 5,  # Reduced from 10 for faster responses
    synthesize: bool = True
):
    """
    Execute general RAG query that answers ANY protein question and identifies aging connections.
    
    This endpoint allows users to ask any question about proteins, not just aging-specific ones.
    It automatically analyzes the query and response to identify connections to aging and longevity.
    
    Args:
        query: Any natural language question about proteins or biology
        top_k: Number of relevant chunks to retrieve (default: 10)
        synthesize: Whether to generate LLM response (default: True)
    
    Returns:
        QueryResult with answer, aging relevance analysis, retrieved chunks, and metadata
    
    Example:
        POST /query/rag-general
        {
            "query": "What is the function of p53?",
            "top_k": 10
        }
    """
    try:
        # Initialize aging relevance analyzer
        analyzer = AgingRelevanceAnalyzer()
        
        # Analyze query for aging relevance
        query_analysis = analyzer.analyze_query(query)
        
        # Get query engine (ChromaDB or NeonDB based on config)
        query_engine = get_query_engine()
        
        # Execute query without filters (general search)
        result = query_engine.query(
            query_text=query,
            top_k=top_k,
            protein_filter=None,
            theory_filters=None,
            synthesize=synthesize
        )
        
        # Extract proteins from the LLM answer text (in addition to chunk proteins)
        answer_proteins = list(protein_recognizer.extract_unique_proteins(result.answer))
        
        # Combine proteins from chunks and answer, removing duplicates
        all_proteins = list(set(result.proteins_mentioned + answer_proteins))
        all_proteins.sort()  # Sort for consistent ordering
        
        # Analyze response for aging connections
        full_text = result.answer + " " + " ".join(chunk.text for chunk in result.chunks[:3])
        aging_connections = analyzer.find_aging_connections(
            text=full_text,
            proteins=all_proteins
        )
        
        # Format response
        return {
            "status": "success",
            "query": result.query,
            "answer": result.answer,
            "chunks": [
                {
                    "id": chunk.chunk_id,
                    "text": chunk.text[:500] + "..." if len(chunk.text) > 500 else chunk.text,
                    "score": chunk.score,
                    "pmcid": chunk.pmcid,
                    "pmid": chunk.pmid,
                    "title": chunk.title,
                    "year": chunk.year,
                    "proteins": chunk.proteins_mentioned,
                    "theories": chunk.aging_theories
                }
                for chunk in result.chunks
            ],
            "citations": result.citations,
            "metadata": {
                "confidence": result.confidence,
                "proteins_mentioned": all_proteins,  # Now includes proteins from answer
                "theories_identified": result.theories_identified,
                "query_time_ms": result.query_time_ms,
                "filters_applied": result.filters_applied,
                "chunks_retrieved": len(result.chunks)
            },
            "query_analysis": query_analysis,
            "aging_relevance": aging_connections,
            "is_general_query": not query_analysis['is_aging_query']
        }
    
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Index not found: {str(e)}. Please run indexing first."
        )
    except Exception as e:
        print(f"[General RAG Query] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Query failed: {str(e)}"
        )


@app.get("/protein/{gene_symbol}/papers")
def get_protein_papers(
    gene_symbol: str,
    limit: int = 50
):
    """
    Get papers mentioning a specific GenAge protein.
    
    This endpoint searches the indexed corpus for papers that mention
    the specified protein and returns them ranked by relevance.
    
    Args:
        gene_symbol: Gene symbol (e.g., "APOE", "SIRT6")
        limit: Maximum number of papers to return
    
    Returns:
        List of papers with metadata and relevance scores
    """
    # Verify protein exists in GenAge
    protein = genage_registry.get_by_symbol(gene_symbol)
    if not protein:
        raise HTTPException(
            status_code=404,
            detail=f"Protein '{gene_symbol}' not found in GenAge database"
        )
    
    try:
        # Get query engine (ChromaDB or NeonDB based on config)
        query_engine = get_query_engine()
        
        # Query for the protein
        query_text = f"{gene_symbol} protein function aging longevity"
        result = query_engine.query(
            query_text=query_text,
            top_k=limit,
            protein_filter=gene_symbol,
            synthesize=False  # Don't need LLM synthesis for paper list
        )
        
        # Group chunks by paper
        papers_dict = {}
        for chunk in result.chunks:
            pmcid = chunk.pmcid
            if pmcid and pmcid not in papers_dict:
                papers_dict[pmcid] = {
                    "pmcid": pmcid,
                    "pmid": chunk.pmid,
                    "title": chunk.title,
                    "year": chunk.year,
                    "relevance_score": chunk.score,
                    "chunk_count": 0,
                    "theories": set()
                }
            
            if pmcid:
                papers_dict[pmcid]["chunk_count"] += 1
                papers_dict[pmcid]["theories"].update(chunk.aging_theories)
        
        # Convert to list and sort by relevance
        papers = [
            {
                **paper,
                "theories": sorted(paper["theories"])
            }
            for paper in papers_dict.values()
        ]
        papers.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return {
            "protein": {
                "symbol": protein.symbol,
                "name": protein.name,
                "uniprot": protein.uniprot,
                "genage_id": protein.genage_id
            },
            "papers_found": len(papers),
            "papers": papers[:limit]
        }
    
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Index not found: {str(e)}. Please run indexing first."
        )
    except Exception as e:
        print(f"[Protein Papers] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve papers: {str(e)}"
        )


# --- Europe PMC spike endpoints ---
# NOTE: Hard-coded protein/ID for first smoke tests. We'll parameterize later.

EPMC_SEARCH_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
EPMC_FULLTEXT_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest"

@app.get("/europepmc-search")
def europepmc_search():
    """
    Smoke-test Europe PMC SEARCH for a single protein, Open Access only.
    - Hard-coded 'PROTEIN' for now (no query params).
    - Prints a compact table to server terminal so you can inspect results.
    - Returns only {"status":"ok"} to the client.
    """
    PROTEIN = "SIRT6"  # <-- change this to the protein you want to test

    # Build a conservative, high-recall query:
    # - OPEN_ACCESS:Y restricts to OA
    # - synonym=Y lets Europe PMC expand common gene synonyms
    params = {
        "query": f'(TEXT:"{PROTEIN}") AND OPEN_ACCESS:Y',
        "resultType": "core",     # return the standard metadata fields (title, abstract, authors, IDs, OA flag, etc.)
        "format": "json",         # response format: could also be 'xml', but JSON is easiest for Python
        "pageSize": "25",         # number of results per page (max 1000)
        "sort": "CITED desc",     # sort by number of citations, descending (most cited papers first)
        "synonym": "Y",           # expand gene/protein synonyms automatically (Europe PMC has a built-in synonym dictionary)
    }

    print(f"[EPMC SEARCH] GET {EPMC_SEARCH_URL} q={params['query']}")
    with httpx.Client(timeout=60) as client:
        r = client.get(EPMC_SEARCH_URL, params=params)
    print("[EPMC SEARCH] HTTP:", r.status_code)

    try:
        data = r.json()
    except Exception:
        print("[EPMC SEARCH] Non-JSON response head:", r.text[:500])
        return {"status": "ok"}

    results = (data.get("resultList") or {}).get("result") or []
    print(f"[EPMC SEARCH] hits={len(results)}  (showing up to 10)")
    for i, rec in enumerate(results[:10], start=1):
        title = rec.get("title") or ""
        year = rec.get("pubYear")
        doi = rec.get("doi")
        pmcid = rec.get("pmcid")
        pmid = rec.get("pmid")
        is_oa = rec.get("isOpenAccess")
        journal = rec.get("journalTitle")
        print(f"  {i:02d}. {year} | OA={is_oa} | DOI={doi} | PMCID={pmcid} | PMID={pmid} | {journal}")
        print(f"      {title}")

    # Tip for your next manual step:
    # - Pick one PMCID from the list above and paste it into the fulltext endpoint below.
    return {"status": "ok"}


@app.get("/chroma-test-basic")
def chroma_test_basic():
    """
    Minimal Chroma smoke test:
    - Creates/opens a SEPARATE test DB folder (CHROMA_TEST_PATH).
    - Creates/opens collection CHROMA_TEST_COLLECTION.
    - Adds two tiny 2D vectors with simple metadata.
    - Returns count and sample query results.
    """
    try:
        # Ensure a fresh test directory
        if os.path.exists(CHROMA_TEST_PATH):
            print(f"[TEST] Removing test DB dir: {CHROMA_TEST_PATH}")
            shutil.rmtree(CHROMA_TEST_PATH, ignore_errors=True)
        os.makedirs(CHROMA_TEST_PATH, exist_ok=True)
        print("[TEST] Fresh test DB dir ready")

        # Open test client and collection
        client = chromadb.PersistentClient(path=CHROMA_TEST_PATH)
        coll = client.get_or_create_collection(CHROMA_TEST_COLLECTION)
        print(f"[TEST] Opened collection '{CHROMA_TEST_COLLECTION}'")

        # Prepare tiny demo data
        ids = ["v1", "v2"]
        docs = ["alpha", "beta"]
        metas = [{"label": "A"}, {"label": "B"}]
        vecs = [[0.1, 0.2], [0.2, 0.3]]

        # Add to Chroma
        print("[TEST] Adding 2 vectors to test collection...")
        coll.add(ids=ids, documents=docs, metadatas=metas, embeddings=vecs)
        print("[TEST] Add completed")

        # Count
        count = coll.count()
        print(f"[TEST] Count after add: {count}")

        # Simple query
        print("[TEST] Running query for 'alpha'...")
        q = coll.query(query_texts=["alpha"], n_results=2)
        print("[TEST] Query result:", q)

        return {
            "status": "ok",
            "count": count,
            "query": q,
        }
    except Exception as e:
        print(f"[TEST][error] {e}")
        raise HTTPException(status_code=500, detail=f"chroma-test-basic failed: {str(e)}")

@app.get("/europe-pmc-fulltext-xml")
def europe_pmc_fulltext_xml():
    """
    Smoke-test Europe PMC FULLTEXT (XML) download for a single OA article.
    - Hard-coded 'EPMC_ID' (e.g., 'PMC1234567') for now.
    - Prints a short header + first 1000 chars of XML to the terminal for inspection.
    - Returns only {"status":"ok"} to the client.
    """
    EPMC_ID = "PMC3439153"  # <-- replace with a real PMCID from the search above, e.g. 'PMC1234567'
    if EPMC_ID == "PMC0000000":
        print("[EPMC FULLTEXT] Please set EPMC_ID to a real PMCID (e.g., 'PMC1234567').")
        return {"status": "ok"}

    url = f"{EPMC_FULLTEXT_BASE}/{EPMC_ID}/fullTextXML"
    print(f"[EPMC FULLTEXT] GET {url}")
    with httpx.Client(timeout=60) as client:
        r = client.get(url)
    print("[EPMC FULLTEXT] HTTP:", r.status_code)

    if r.status_code != 200:
        print("[EPMC FULLTEXT] Response head:", r.text[:500])
        return {"status": "ok"}

    xml_text = r.text or ""
    # Lightweight visibility: show total size + snippet so you can see structure (JATS tags).
    print(f"[EPMC FULLTEXT] XML bytes: {len(xml_text.encode('utf-8'))}")
    print("[EPMC FULLTEXT] XML snippet (first 1000 chars):")
    print(xml_text[:10000])

    # (Later) You'll parse JATS here: drop <ref-list>, keep body <sec> text, create clean chunks.
    return {"status": "ok"}


@app.post("/index/batch")
def index_batch(limit: int = 200, offset: int = 0):
# call e.g.: POST http://localhost:8000/index/batch?limit=300&offset=600

    """
    One-step indexing:
    - Load ALL JSON files from 'papers/' (no filtering), sliced by offset/limit.
    - Convert to LlamaIndex Documents.
    - Split into ~800-token chunks (with overlap).
    - Create embeddings via Nebius AI.
    - Persist vectors+metadata into ChromaDB under CHROMA_STORE_PATH.
    Prints detailed stats to the terminal; returns only {"status": "ok"}.
    """

    # --- Gather JSON files (no filtering) ---
    # We slice by offset/limit so you can index in small, safe batches and keep RAM steady.
    if not os.path.isdir(PAPERS_DIR):
        print(f"[INDEX] Folder '{PAPERS_DIR}' does not exist. Create it and drop JSON files inside.")
        return {"status": "ok"}

    all_files = [os.path.join(PAPERS_DIR, fn) for fn in os.listdir(PAPERS_DIR) if fn.endswith(".json")]
    all_files.sort()
    files = all_files[offset: offset + limit]

    print(f"[INDEX] files_seen_total={len(all_files)} | batch_offset={offset} | batch_limit={limit} | batch_files={len(files)}")
    if not files:
        print("[INDEX] Nothing to do for this batch.")
        return {"status": "ok"}

    # --- Build Documents (we only require 'plain_text'; everything else is metadata and may be null) ---
    docs: List[Document] = []
    skipped_empty = 0
    protein_stats = {"total_papers": 0, "papers_with_proteins": 0, "total_proteins_found": 0}
    theory_stats = {theory: 0 for theory in theory_classifier.get_theory_names()}
    
    for path in files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                paper: Dict[str, Any] = json.load(f)
            text = (paper.get("plain_text") or "").strip()
            if not text:
                skipped_empty += 1
                continue
            
            # Extract protein mentions from paper text
            proteins_mentioned = list(protein_recognizer.extract_unique_proteins(text))
            protein_stats["total_papers"] += 1
            if proteins_mentioned:
                protein_stats["papers_with_proteins"] += 1
                protein_stats["total_proteins_found"] += len(proteins_mentioned)
            
            # Classify paper by aging theories
            aging_theories = theory_classifier.classify(text)
            for theory in aging_theories:
                theory_stats[theory] += 1
            
            metadata = {
                "pmcid": paper.get("pmcid"),
                "doi": paper.get("doi"),
                "title": paper.get("title"),
                "year": paper.get("year"),
                "journal": paper.get("journal"),
                "protein_hits": paper.get("protein_hits"),
                "source_url": paper.get("source_url"),
                "proteins_mentioned": proteins_mentioned,  # GenAge proteins found in text
                "aging_theories": aging_theories,  # Aging hallmarks identified in text
            }
            # Stable doc_id: pmcid or filename (without .json extension)
            pmcid = paper.get("pmcid")
            if pmcid and isinstance(pmcid, str) and pmcid.strip():
                doc_id = pmcid.strip()
            else:
                base = os.path.basename(path)
                doc_id = os.path.splitext(base)[0]
            
            docs.append(Document(text=text, metadata=metadata, doc_id=doc_id))
        except Exception as e:
            print(f"[INDEX][skip broken] {os.path.basename(path)}: {e}")

    print(f"[INDEX] docs_used={len(docs)} | docs_skipped_empty={skipped_empty}")
    print(f"[INDEX] Protein extraction: {protein_stats['papers_with_proteins']}/{protein_stats['total_papers']} papers have GenAge proteins")
    print(f"[INDEX] Total unique proteins found: {protein_stats['total_proteins_found']}")
    
    # Print theory classification statistics
    theories_with_papers = {k: v for k, v in theory_stats.items() if v > 0}
    print(f"[INDEX] Theory classification: {len(theories_with_papers)} theories found across papers")
    if theories_with_papers:
        top_theories = sorted(theories_with_papers.items(), key=lambda x: -x[1])[:5]
        print(f"[INDEX] Top theories: {', '.join([f'{t}({c})' for t, c in top_theories])}")
    
    if not docs:
        print("[INDEX] No usable documents in this batch (all had empty 'plain_text' or failed to load).")
        return {"status": "ok"}

    # Verbose dump of Documents for full transparency
    # print("[INDEX][DEBUG] Dumping Documents...")
    # for d in docs:
    #     try:
    #         print(f"--- Document doc_id={d.doc_id}")
    #         print(f"metadata={json.dumps(d.metadata, ensure_ascii=False)}")
    #         print("text:")
    #         print(d.text)
    #     except Exception as e:
    #         print(f"[INDEX][DEBUG][doc dump error] {e}")

    # --- Chunking (no embeddings yet) ---
    # Explanation:
    # - chunk_size ~800 tokens is a common sweet spot for scientific text.
    # - chunk_overlap retains context and helps retrieval across chunk boundaries.
    splitter = SentenceSplitter(chunk_size=800, chunk_overlap=120)
    nodes = splitter.get_nodes_from_documents(docs)
    print(f"[INDEX] chunks_created={len(nodes)}")

    # Verbose dump of Nodes (post-splitting)
    # print("[INDEX][DEBUG] Dumping Nodes...")
    # for i, n in enumerate(nodes):
    #     try:
    #         print(f"--- Node {i} id={n.id_} ref_doc_id={n.ref_doc_id}")
    #         print(f"metadata={json.dumps(n.metadata or {}, ensure_ascii=False)}")
    #         content = n.get_content(metadata_mode="none")
    #         print("content:")
    #         print(content)
    #     except Exception as e:
    #         print(f"[INDEX][DEBUG][node dump error] {e}")


    if not nodes:
        print("[INDEX] No chunks created (unexpected if plain_text had content).")
        return {"status": "ok"}

    # --- Embeddings via Nebius and upsert to Chroma ---
    print("[INDEX][DEBUG] Creating Nebius client for embeddings...")
    embed_client = OpenAI(api_key=settings.nebius_api_key, base_url=NEBIUS_BASE_URL)
    # Also create Groq client for any LLM calls
    llm_client = OpenAI(api_key=settings.groq_api_key, base_url=GROQ_BASE_URL)

    # Prepare texts for embedding (one embedding per node)
    print("[INDEX][DEBUG] Preparing node IDs and texts...")
    node_ids = [n.id_ for n in nodes]
    node_texts = [n.get_content(metadata_mode="none") for n in nodes]   # extract text content only
    print(f"[INDEX][DEBUG] Prepared {len(node_ids)} node IDs and {len(node_texts)} texts")
    
    # Clean metadata for Chroma (convert lists to JSON strings, keep only simple types)
    def clean_metadata_for_chroma(meta: Dict[str, Any]) -> Dict[str, Any]:
        """Convert metadata to Chroma-compatible format (str, int, float, bool only - NO None!)."""
        cleaned = {}
        for key, value in (meta or {}).items():
            if value is None:
                # Use type-appropriate defaults for known fields to maintain consistent types
                # Based on actual JSON structure: pmcid, doi, title, year, journal, protein_hits, source_url
                if key == "year":
                    cleaned[key] = 0  # year is numeric field, default to 0
                else:
                    cleaned[key] = ""  # all other fields (pmcid, doi, title, journal, source_url, protein_hits) get empty string
            elif isinstance(value, (str, int, float, bool)):
                cleaned[key] = value  # keep simple types as-is
            elif isinstance(value, list):
                cleaned[key] = json.dumps(value)  # convert lists to JSON string (e.g., protein_hits)
            elif isinstance(value, dict):
                cleaned[key] = json.dumps(value)  # convert dicts to JSON string
            else:
                cleaned[key] = str(value)  # fallback: convert to string
        return cleaned
    
    print("[INDEX][DEBUG] Cleaning metadata for Chroma...")
    node_metas = [clean_metadata_for_chroma(n.metadata) for n in nodes]  # extract and clean metadata
    print(f"[INDEX][DEBUG] Cleaned {len(node_metas)} metadata entries")

    # Request embeddings via Nebius
    try:
        print(f"[INDEX] Embedding with model='{NEBIUS_EMBED_MODEL}' via Nebius...")
        print(f"[INDEX][DEBUG] Sending {len(node_texts)} texts to Nebius for embedding...")

        # Batch embeddings
        BATCH_SIZE = 96
        embeddings = []
        total_batches = (len(node_texts) + BATCH_SIZE - 1) // BATCH_SIZE
        for start in range(0, len(node_texts), BATCH_SIZE):
            batch = node_texts[start:start + BATCH_SIZE]
            batch_num = start // BATCH_SIZE + 1
            if batch_num == 1 or batch_num % 10 == 0 or batch_num == total_batches:
                print(f"[INDEX][EMB] batch {batch_num}/{total_batches} (+{len(batch)} texts)")
            resp = embed_client.embeddings.create(model=NEBIUS_EMBED_MODEL, input=batch)
            embeddings.extend([item.embedding for item in resp.data])

        print(f"[INDEX][DEBUG] Total embeddings: {len(embeddings)}")
    except Exception as e:
        print(f"[INDEX][embed error] {e}")
        raise HTTPException(status_code=500, detail="Nebius embedding request failed")

    # Sanity check: ensure we got one embedding per node
    if len(embeddings) != len(node_ids):
        print(f"[INDEX][embed mismatch] ids={len(node_ids)} vs embeds={len(embeddings)}")
        raise HTTPException(status_code=500, detail="Embedding count mismatch")

    # Debug: Check embedding dimensions
    if embeddings:
        emb_dim = len(embeddings[0])
        print(f"[INDEX][DEBUG] Embedding dimensions: {emb_dim} (first vector)")

    # === ChromaDB: Persistent vector store with metadata ===
    # Ensure target directory exists
    try:
        os.makedirs(CHROMA_STORE_PATH, exist_ok=True)
    except Exception as e:
        print(f"[INDEX][ChromaDB dir error] {e}")
        raise HTTPException(status_code=500, detail="Failed to create ChromaDB directory")

    # Initialize ChromaDB client and get/create collection
    try:
        chroma_client = chromadb.PersistentClient(path=CHROMA_STORE_PATH)
        collection = chroma_client.get_or_create_collection(
            name=CHROMA_STORE_COLLECTION,
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity
        )
        print(f"[INDEX][ChromaDB] Collection '{CHROMA_STORE_COLLECTION}' ready (current count: {collection.count()})")
    except Exception as e:
        print(f"[INDEX][ChromaDB init error] {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize ChromaDB")

    # Add vectors to ChromaDB in batches (ChromaDB handles deduplication by ID)
    CHROMA_BATCH_SIZE = 100
    total_added = 0
    for start in range(0, len(node_ids), CHROMA_BATCH_SIZE):
        end = min(start + CHROMA_BATCH_SIZE, len(node_ids))
        batch_ids = node_ids[start:end]
        batch_texts = node_texts[start:end]
        batch_metas = node_metas[start:end]
        batch_embeds = embeddings[start:end]
        
        try:
            collection.upsert(
                ids=batch_ids,
                documents=batch_texts,
                metadatas=batch_metas,
                embeddings=batch_embeds
            )
            total_added += len(batch_ids)
        except Exception as e:
            print(f"[INDEX][ChromaDB upsert error] batch {start}-{end}: {e}")
            raise HTTPException(status_code=500, detail=f"ChromaDB upsert failed: {e}")
    
    print(f"[INDEX][ChromaDB] Added {total_added} vectors (total in collection: {collection.count()})")
    print("[INDEX] Batch done (ChromaDB).")

    # ----------------------------------------------------------------------
    # SIMPLE ChromaDB QUERY (inline, for quick smoke-testing)
    # ----------------------------------------------------------------------
    QUERY = "APOE variant longevity lifespan"
    query_top_k = 10

    try:
        # Create query embedding
        q_emb_resp = client.embeddings.create(model=NEBIUS_EMBED_MODEL, input=[QUERY])
        query_embedding = q_emb_resp.data[0].embedding

        # Query ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=query_top_k,
            include=["documents", "metadatas", "distances"]
        )

        # Build result list for inspection
        query_hits = []
        if results and results['ids'] and results['ids'][0]:
            for rank, chunk_id in enumerate(results['ids'][0], start=1):
                idx = rank - 1
                # Get metadata and document from ChromaDB results
                meta = results['metadatas'][0][idx] if results['metadatas'] else {}
                text = results['documents'][0][idx] if results['documents'] else ""
                distance = results['distances'][0][idx] if results['distances'] else 0
                score = 1.0 / (1.0 + distance)  # Convert distance to similarity
                
                # Optional: shorten the text for terminal readability
                preview_text = text
                if len(preview_text) > 300:
                    preview_text = preview_text[:300] + "…"

                # Prepare a compact result object
                hit = {
                    "rank": rank,
                    "score": float(score),
                    "id": chunk_id,
                    "pmcid": meta.get("pmcid", ""),
                    "doi": meta.get("doi", ""),
                    "title": meta.get("title", ""),
                    "year": meta.get("year", 0),
                    "journal": meta.get("journal", ""),
                    "source_url": meta.get("source_url", ""),
                    "text_preview": preview_text,
                    "full_text": text,  # Store full text for LLM extraction
                }
                query_hits.append(hit)

    except Exception as e:
        # If anything goes wrong during the query phase, keep indexing result intact and log the error only.
        print(f"[QUERY][error] {e}")

    # ----------------------------------------------------------------------
    # PER-CHUNK LLM EXTRACTION (Nebius Chat Completions)
    # ----------------------------------------------------------------------
    # We now send each retrieved chunk to the Nebius LLM and ask it to extract
    # "sequence-to-function" facts relevant to longevity. This is a first-pass
    # extractor: JSON-only, chunk-scoped, no cross-chunk aggregation yet.
    #
    # Notes:
    # - Uses the same NEBIUS_MODEL as in /nebius-hello (OpenAI-compatible).
    # - Keeps temperature low for determinism.
    # - Enforces JSON response via response_format (json_schema).
    # - Prints results to terminal; also stores in 'extractions' list in RAM.
    #
    # Later:
    # - You can add cross-paper expansion (load all chunks of a PMCID).
    # - You can add deduplication/reranking/aggregation.
    # - You can add a second LLM pass to write full Wiki-style articles.
    # ----------------------------------------------------------------------

    # Limit how many chunks to extract from in this first pass (cost control).
    # You can later make this a parameter; we default to using all current hits.
    max_chunks_for_extraction = len(query_hits)

    # Prepare a strict JSON schema so the model must return structured fields.
    extraction_schema = {
        "name": "s2f_extraction",
        "schema": {
            "type": "object",
            "properties": {
                "protein": {"type": "string", "description": "Canonical protein/gene name if explicitly mentioned; otherwise empty."},
                "organism": {"type": "string", "description": "Species/organism context if stated; otherwise empty."},
                "sequence_interval": {"type": "string", "description": "Residue or nucleotide interval (e.g., 'aa 120-145', or motif/domain) if inferable; otherwise empty."},
                "modification": {"type": "string", "description": "Exact sequence change (e.g., 'E4 (Arg112/Arg158)', 'Cys->Ser at pos 151)', 'domain deletion') if present; otherwise empty."},
                "functional_effect": {"type": "string", "description": "Functional change on the protein/gene (e.g., binding, stability, transcriptional activity)."},
                "longevity_effect": {"type": "string", "description": "Effect on lifespan/healthspan if present (e.g., increased lifespan in C.elegans)."},
                "evidence_type": {"type": "string", "description": "Type of evidence (e.g., genetic manipulation, mutant strain, CRISPR edit, overexpression, knockdown)."},
                "figure_or_panel": {"type": "string", "description": "Figure/panel if explicitly cited (e.g., 'Fig. 2B'); otherwise empty."},
                "citation_hint": {"type": "string", "description": "Any DOI/PMCID/PMID text in the chunk; empty if none. Do not invent IDs."},
                "confidence": {"type": "number", "description": "0.0–1.0 subjective confidence derived from the chunk only."}
            },
            "required": ["protein", "modification", "functional_effect", "longevity_effect", "confidence"],
            "additionalProperties": False
        },
        "strict": True
    }

    # System and user prompts. We keep the user prompt short and inject the chunk verbatim.
    SYSTEM_PROMPT = (
        "You are a careful scientific text-miner for protein/gene sequence-to-function relationships in the context of longevity. "
        "Extract only what is explicitly supported by the provided chunk. Do not hallucinate unknown IDs or effects. "
        "If a field is not present in the text, return an empty string for that field (or 0.0 for confidence)."
    )

    USER_INSTRUCTION_PREFIX = (
        "From the following paper chunk, extract ONLY facts about sequence modifications (mutations, domain edits, variants) "
        "and their functional outcomes, especially any lifespan/healthspan associations. "
        "Work strictly chunk-local: do not infer from general knowledge. "
        "Return a single JSON object that conforms to the provided schema."
        "\n\n--- BEGIN CHUNK ---\n"
    )
    USER_INSTRUCTION_SUFFIX = "\n--- END CHUNK ---"

    # We'll reuse the same Nebius HTTP style as in nebius_hello()
    neb_url = f"{NEBIUS_BASE_URL}chat/completions"
    neb_headers = {
        "Authorization": f"Bearer {settings.nebius_api_key}",
        "Content-Type": "application/json",
    }

    # Collect extraction outputs here
    extractions = []

    # Iterate over each hit (chunk) and call the LLM once per chunk.
    for i, hit in enumerate(query_hits[:max_chunks_for_extraction], start=1):
        # Get full text from the hit (stored during query phase)
        node_id = hit.get("id")
        full_text = hit.get("full_text", "")

        # Safety: if for some reason we didn't find it, fall back to preview.
        if not full_text:
            full_text = hit.get("text_preview", "")

        # Compose the user content with chunk text
        user_content = USER_INSTRUCTION_PREFIX + full_text + USER_INSTRUCTION_SUFFIX

        # Build the payload enforcing JSON schema
        payload = {
            "model": NEBIUS_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.1,
            "max_tokens": 600,
            "response_format": {
                "type": "json_schema",
                "json_schema": extraction_schema
            }
        }

        # print(f"[EXTRACT] Calling Nebius LLM for chunk #{i} | PMCID={hit.get('pmcid','')} | title='{hit.get('title','')[:80]}'")
        try:
            with httpx.Client(timeout=90) as neb_client:
                resp = neb_client.post(neb_url, json=payload, headers=neb_headers)
            # print(f"[EXTRACT] HTTP {resp.status_code}")

            # Try to parse model's JSON response
            data = resp.json()
            # Defensive parsing: choices → message → content (JSON as string)
            content = ""
            if isinstance(data, dict) and "choices" in data and data["choices"]:
                content = data["choices"][0]["message"]["content"] or ""

            extracted_obj = {}
            if content:
                try:
                    extracted_obj = json.loads(content)
                except json.JSONDecodeError:
                    # If schema mode was not obeyed due to model drift, keep raw content for debugging.
                    extracted_obj = {"_raw": content}

            # Attach hit metadata for provenance
            extracted_obj["_provenance"] = {
                "pmcid": hit.get("pmcid", ""),
                "doi": hit.get("doi", ""),
                "title": hit.get("title", ""),
                "year": hit.get("year", 0),
                "journal": hit.get("journal", ""),
                "source_url": hit.get("source_url", ""),
                "rank": hit.get("rank", i),
                "score": hit.get("score", None),
                "node_id": node_id,
            }

            # Store in RAM list
            extractions.append(extracted_obj)

            # Pretty-print a compact summary to terminal
            try:
                # print(
                #     "[EXTRACT][OK]",
                #     f"protein={extracted_obj.get('protein','')!r}",
                #     f"mod={extracted_obj.get('modification','')!r}",
                #     f"fx={extracted_obj.get('functional_effect','')!r}",
                #     f"longevity={extracted_obj.get('longevity_effect','')!r}",
                #     f"conf={extracted_obj.get('confidence', 0.0)}",
                # )
                pass
            except Exception:
                print("[EXTRACT][OK] (unprintable chars)")

        except Exception as e:
            print(f"[EXTRACT][error] {e}")
            # Keep going; append minimal error record for visibility
            extractions.append({
                "_error": str(e),
                "_provenance": {
                    "pmcid": hit.get("pmcid", ""),
                    "title": hit.get("title", ""),
                    "rank": hit.get("rank", i),
                    "node_id": node_id,
                }
            })

    # Final log: how many extractions we collected
    print(f"[EXTRACT] Completed {len(extractions)}/{max_chunks_for_extraction} chunk extractions.")

    # ----------------------------------------------------------------------
    # SECOND LLM CALL: GENERATE HTML ARTICLE (NO RETURN PAYLOAD)
    # ----------------------------------------------------------------------
    # This block takes the JSON extractions created above and calls Nebius LLM
    # to synthesize a WikiCrow-style HTML article. The HTML is saved locally
    # and a console preview is printed. Nothing is returned to the browser
    # except {"status": "ok"}.
    # ----------------------------------------------------------------------

    protein_name = "APOE"  # hard-coded test target; replace later with variable

    # Compact extractions (filter only fields relevant for composing)
    compact_extractions = []
    for ex in extractions:
        if not isinstance(ex, dict):
            continue
        compact_extractions.append({
            "protein": ex.get("protein", ""),
            "organism": ex.get("organism", ""),
            "sequence_interval": ex.get("sequence_interval", ""),
            "modification": ex.get("modification", ""),
            "functional_effect": ex.get("functional_effect", ""),
            "longevity_effect": ex.get("longevity_effect", ""),
            "evidence_type": ex.get("evidence_type", ""),
            "figure_or_panel": ex.get("figure_or_panel", ""),
            "citation_hint": ex.get("citation_hint", ""),
            "confidence": ex.get("confidence", 0.0),
            "_provenance": ex.get("_provenance", {}),
        })

    # Define output JSON schema (LLM must return {title, html})
    article_schema = {
        "name": "wikicrow_article",
        "schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "html": {"type": "string"}
            },
            "required": ["title", "html"],
            "additionalProperties": False
        },
        "strict": True
    }

    ARTICLE_SYSTEM = (
        "You are a senior scientific editor. Write concise HTML articles "
        "summarizing protein sequence-to-function relationships related to longevity. "
        "Use the provided extraction data only; do not invent facts or citations. "
        "Return the article as clean, minimal HTML suitable for web display."
    )

    article_user_instruction = (
        "Compose a WikiCrow-style HTML article for the protein '"
        + protein_name
        + "'. Use these extraction objects as factual input. "
        "Include sections for Overview, Sequence→Function Table, and Notes. "
        "Use semantic HTML tags only (<h1>, <h2>, <table>, <tr>, <td>, <ul>, <li>, <p>). "
        "The table must have columns: Interval, Modification, Functional Effect, "
        "Longevity Effect, Evidence, Citation. Do not include external CSS or scripts. "
        "\n\nExtraction data:\n"
        + json.dumps({"protein": protein_name, "extractions": compact_extractions}, ensure_ascii=False)
    )

    # Build the Nebius payload for chat completion
    article_payload = {
        "model": NEBIUS_MODEL,
        "messages": [
            {"role": "system", "content": ARTICLE_SYSTEM},
            {"role": "user", "content": article_user_instruction}
        ],
        "temperature": 0.2,
        "max_tokens": 1800,
        "response_format": {
            "type": "json_schema",
            "json_schema": article_schema
        }
    }

    print(f"[ARTICLE] Generating HTML article for protein={protein_name!r} using {NEBIUS_MODEL}")

    try:
        with httpx.Client(timeout=120) as neb_client:
            aresp = neb_client.post(
                f"{NEBIUS_BASE_URL}chat/completions",
                json=article_payload,
                headers={
                    "Authorization": f"Bearer {settings.nebius_api_key}",
                    "Content-Type": "application/json",
                },
            )
        print(f"[ARTICLE] HTTP {aresp.status_code}")

        article_title = f"{protein_name} — Sequence-to-Function & Longevity"
        article_html = "<h1>Draft</h1><p>No content returned.</p>"

        adata = aresp.json()
        if isinstance(adata, dict) and adata.get("choices"):
            acontent = adata["choices"][0]["message"]["content"] or ""
            try:
                aobj = json.loads(acontent)
                article_title = aobj.get("title") or article_title
                article_html = aobj.get("html") or article_html
            except json.JSONDecodeError:
                # Fallback: model returned plain text instead of JSON
                article_html = f"<h1>{article_title}</h1><pre>{acontent}</pre>"

        # Save HTML locally
        out_dir = os.path.join(CHROMA_STORE_PATH, "articles")
        os.makedirs(out_dir, exist_ok=True)  # create directory if missing
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", protein_name)
        out_path = os.path.join(out_dir, f"{safe_name}.html")

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(article_html)
        print(f"[ARTICLE] Saved article HTML: {out_path}")

        # Optional console preview (first 800 chars)
        preview = article_html[:800] + ("…" if len(article_html) > 800 else "")
        print("[ARTICLE][preview]\n", preview)

    except Exception as e:
        print(f"[ARTICLE][error] {e}")

    


    return {"status": "ok"}


@app.post("/index/genage-batch")
def index_genage_batch(
    limit: int = 200,
    offset: int = 0,
    corpus_dir: str = "data/corpus"
):
    """
    Enhanced GenAge-aware batch indexing for the aging protein corpus.
    
    This endpoint processes papers from the data/corpus directory (7,018 EPMC papers)
    with full GenAge protein entity recognition and aging theory classification.
    
    Features:
    - Extracts mentions of 307 GenAge aging-related proteins
    - Classifies papers by 12 aging hallmarks
    - Tracks detailed statistics
    - Stores enriched metadata in ChromaDB
    
    Args:
        limit: Number of papers to process in this batch
        offset: Starting position in the corpus
        corpus_dir: Directory containing paper JSON files (default: data/corpus)
    
    Returns:
        Detailed statistics about proteins found, theories identified, and indexing progress
    """
    from pathlib import Path
    
    # Resolve corpus directory relative to project root
    project_root = Path(__file__).parent.parent
    corpus_path = project_root / corpus_dir
    
    if not corpus_path.is_dir():
        raise HTTPException(
            status_code=404,
            detail=f"Corpus directory not found at: {corpus_path.absolute()}"
        )
    
    all_files = [
        str(corpus_path / fn)
        for fn in os.listdir(corpus_path)
        if fn.endswith(".json")
    ]
    all_files.sort()
    files = all_files[offset: offset + limit]
    
    print(f"[GENAGE-INDEX] Processing GenAge corpus")
    print(f"[GENAGE-INDEX] Total files: {len(all_files)} | Batch: {len(files)} (offset={offset}, limit={limit})")
    
    if not files:
        return {
            "status": "ok",
            "message": "No files to process in this batch",
            "total_files": len(all_files),
            "batch_size": 0
        }
    
    # Initialize statistics
    docs: List[Document] = []
    skipped_empty = 0
    skipped_errors = 0
    
    protein_stats = {
        "total_papers": 0,
        "papers_with_proteins": 0,
        "total_protein_mentions": 0,
        "unique_proteins_found": set(),
        "protein_distribution": {}
    }
    
    theory_stats = {theory: 0 for theory in theory_classifier.get_theory_names()}
    theory_stats["_papers_with_theories"] = 0
    
    # Process each paper
    for path in files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                paper: Dict[str, Any] = json.load(f)
            
            # Extract text (try multiple fields)
            text = (
                paper.get("plain_text") or
                paper.get("full_text") or
                paper.get("abstract_text") or
                ""
            ).strip()
            
            if not text:
                skipped_empty += 1
                continue
            
            protein_stats["total_papers"] += 1
            
            # Extract GenAge protein mentions
            proteins_mentioned = list(protein_recognizer.extract_unique_proteins(text))
            
            if proteins_mentioned:
                protein_stats["papers_with_proteins"] += 1
                protein_stats["total_protein_mentions"] += len(proteins_mentioned)
                protein_stats["unique_proteins_found"].update(proteins_mentioned)
                
                # Track protein distribution
                for protein in proteins_mentioned:
                    protein_stats["protein_distribution"][protein] = \
                        protein_stats["protein_distribution"].get(protein, 0) + 1
            
            # Classify by aging theories
            aging_theories = theory_classifier.classify(text)
            
            if aging_theories:
                theory_stats["_papers_with_theories"] += 1
                for theory in aging_theories:
                    theory_stats[theory] += 1
            
            # Build metadata
            metadata = {
                "pmcid": paper.get("PMCID") or paper.get("pmcid") or "",
                "pmid": paper.get("PMID") or paper.get("pmid") or "",
                "doi": paper.get("DOI") or paper.get("doi") or "",
                "title": paper.get("title") or "",
                "year": paper.get("year") or 0,
                "journal": paper.get("journal") or "",
                "source": paper.get("source") or "EPMC",
                "source_url": paper.get("source_url") or "",
                "proteins_mentioned": proteins_mentioned,
                "aging_theories": aging_theories,
            }
            
            # Create document ID
            doc_id = (
                metadata["pmcid"] or
                metadata["pmid"] or
                os.path.splitext(os.path.basename(path))[0]
            )
            
            docs.append(Document(text=text, metadata=metadata, doc_id=doc_id))
            
        except Exception as e:
            skipped_errors += 1
            print(f"[GENAGE-INDEX][error] {os.path.basename(path)}: {e}")
    
    # Print statistics
    print(f"\n[GENAGE-INDEX] === Processing Summary ===")
    print(f"[GENAGE-INDEX] Documents: {len(docs)} indexed | {skipped_empty} empty | {skipped_errors} errors")
    print(f"\n[GENAGE-INDEX] === Protein Statistics ===")
    print(f"[GENAGE-INDEX] Papers with proteins: {protein_stats['papers_with_proteins']}/{protein_stats['total_papers']}")
    print(f"[GENAGE-INDEX] Unique proteins found: {len(protein_stats['unique_proteins_found'])}")
    print(f"[GENAGE-INDEX] Total protein mentions: {protein_stats['total_protein_mentions']}")
    
    if protein_stats["protein_distribution"]:
        top_proteins = sorted(
            protein_stats["protein_distribution"].items(),
            key=lambda x: -x[1]
        )[:10]
        print(f"[GENAGE-INDEX] Top 10 proteins: {', '.join([f'{p}({c})' for p, c in top_proteins])}")
    
    print(f"\n[GENAGE-INDEX] === Theory Statistics ===")
    print(f"[GENAGE-INDEX] Papers with theories: {theory_stats['_papers_with_theories']}/{protein_stats['total_papers']}")
    theories_found = {k: v for k, v in theory_stats.items() if k != "_papers_with_theories" and v > 0}
    print(f"[GENAGE-INDEX] Theories identified: {len(theories_found)}")
    
    if theories_found:
        top_theories = sorted(theories_found.items(), key=lambda x: -x[1])[:5]
        print(f"[GENAGE-INDEX] Top 5 theories: {', '.join([f'{t}({c})' for t, c in top_theories])}")
    
    if not docs:
        return {
            "status": "ok",
            "message": "No usable documents in this batch",
            "statistics": {
                "skipped_empty": skipped_empty,
                "skipped_errors": skipped_errors
            }
        }
    
    # Continue with ChromaDB indexing
    print(f"\n[GENAGE-INDEX] === Starting ChromaDB Indexing ===")
    
    # Chunk documents
    splitter = SentenceSplitter(chunk_size=800, chunk_overlap=120)
    nodes = splitter.get_nodes_from_documents(docs)
    print(f"[GENAGE-INDEX] Created {len(nodes)} chunks from {len(docs)} documents")
    
    if not nodes:
        return {
            "status": "ok",
            "message": "No chunks created",
            "statistics": {"documents": len(docs)}
        }
    
    # Create embeddings
    client = OpenAI(api_key=settings.nebius_api_key, base_url=NEBIUS_BASE_URL)
    
    node_ids = [n.id_ for n in nodes]
    node_texts = [n.get_content(metadata_mode="none") for n in nodes]
    
    # Clean metadata for storage
    def clean_metadata_for_storage(meta: Dict[str, Any]) -> Dict[str, Any]:
        cleaned = {}
        for key, value in (meta or {}).items():
            if value is None:
                cleaned[key] = "" if key != "year" else 0
            elif isinstance(value, (str, int, float, bool)):
                cleaned[key] = value
            elif isinstance(value, list):
                cleaned[key] = json.dumps(value)
            elif isinstance(value, dict):
                cleaned[key] = json.dumps(value)
            else:
                cleaned[key] = str(value)
        return cleaned
    
    node_metas = [clean_metadata_for_storage(n.metadata) for n in nodes]
    
    # Batch embeddings
    BATCH_SIZE = 96
    embeddings = []
    total_batches = (len(node_texts) + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"[GENAGE-INDEX] Creating embeddings in {total_batches} batches...")
    for start in range(0, len(node_texts), BATCH_SIZE):
        batch = node_texts[start:start + BATCH_SIZE]
        batch_num = start // BATCH_SIZE + 1
        if batch_num % 5 == 0 or batch_num == total_batches:
            print(f"[GENAGE-INDEX] Embedding batch {batch_num}/{total_batches}")
        resp = client.embeddings.create(model=NEBIUS_EMBED_MODEL, input=batch)
        embeddings.extend([item.embedding for item in resp.data])
    
    print(f"[GENAGE-INDEX] Created {len(embeddings)} embeddings")
    
    # Store in ChromaDB
    os.makedirs(CHROMA_STORE_PATH, exist_ok=True)
    
    chroma_client = chromadb.PersistentClient(path=CHROMA_STORE_PATH)
    collection = chroma_client.get_or_create_collection(
        name=CHROMA_STORE_COLLECTION,
        metadata={"hnsw:space": "cosine"}
    )
    print(f"[GENAGE-INDEX] ChromaDB collection ready (current count: {collection.count()})")
    
    # Add vectors in batches
    CHROMA_BATCH_SIZE = 100
    total_added = 0
    for start in range(0, len(node_ids), CHROMA_BATCH_SIZE):
        end = min(start + CHROMA_BATCH_SIZE, len(node_ids))
        collection.upsert(
            ids=node_ids[start:end],
            documents=node_texts[start:end],
            metadatas=node_metas[start:end],
            embeddings=embeddings[start:end]
        )
        total_added += end - start
    
    print(f"[GENAGE-INDEX] Added {total_added} vectors (total in collection: {collection.count()})")
    
    # Prepare statistics for return and tracking
    batch_statistics = {
        "documents": {
            "processed": len(docs),
            "skipped_empty": skipped_empty,
            "skipped_errors": skipped_errors,
            "total_in_corpus": len(all_files)
        },
        "proteins": {
            "papers_with_proteins": protein_stats["papers_with_proteins"],
            "total_papers": protein_stats["total_papers"],
            "unique_proteins_found": list(protein_stats["unique_proteins_found"]),
            "total_mentions": protein_stats["total_protein_mentions"],
            "top_proteins": dict(sorted(
                protein_stats["protein_distribution"].items(),
                key=lambda x: -x[1]
            )[:10]) if protein_stats["protein_distribution"] else {}
        },
        "theories": {
            "papers_with_theories": theory_stats["_papers_with_theories"],
            "total_papers": protein_stats["total_papers"],
            "theories_found": len(theories_found),
            "distribution": theories_found
        },
        "indexing": {
            "chunks_created": len(nodes),
            "embeddings_created": len(embeddings),
            "chroma_total_vectors": collection.count()
        }
    }
    
    # Update global statistics tracker
    stats_tracker.update_batch(batch_statistics)
    stats_tracker.save()
    print(f"[GENAGE-INDEX] Updated global statistics (total batches: {stats_tracker.stats['total_batches']})")
    
    # Return detailed statistics
    return {
        "status": "success",
        "message": f"Indexed {len(docs)} documents with {len(nodes)} chunks",
        "statistics": batch_statistics,
        "cumulative_stats": stats_tracker.get_summary()
    }


@app.post("/index/chroma_batch")
def index_chroma_batch(
    limit: int = 200,
    offset: int = 0,
    use_scoring: bool = True,
    top_n: int = 1000,
    emb_batch_size: int = 96,
):
# call e.g.: POST http://localhost:8000/index/chroma_batch?limit=1000&offset=0

    """
    Indexing-only endpoint:
    - Loads JSON files from 'papers/' sliced by offset/limit
    - Builds chunks, embeds via Nebius, stores in ChromaDB
    - Does NOT run query/extraction/article generation
    Returns only {"status": "ok"} (plus small counters).
    """

    # --- Helper functions for scoring (local scope, no global effects) ---
    aging_re = re.compile(r"\b(aging|ageing|inflammaging|senescence|lifespan|longevity|healthspan)\b", re.I)
    mut_re = re.compile(r"\b(mutation(?:s)?|variant(?:s)?|polymorphism(?:s)?|snp(?:s)?|rs\d{3,}|allele(?:s)?|genotype(?:s)?)\b", re.I)

    def _textcount(text: str, rx: re.Pattern) -> int:
        if not text:
            return 0
        return len(rx.findall(text))

    def _extract_abstract(xml_str: str) -> str:
        """Extracts <abstract> text from JATS XML robustly; returns empty string on failure."""
        if not xml_str:
            return ""
        try:
            root = ET.fromstring(xml_str)
            abs_nodes = root.findall(".//abstract")
            parts = []
            for node in abs_nodes:
                parts.append("".join(node.itertext()))
            return "\n".join(p.strip() for p in parts if p and p.strip())
        except Exception:
            return ""

    def _score_paper(paper: Dict[str, Any]) -> float:
        title = (paper.get("title") or "")
        body = (paper.get("plain_text") or "")
        year = paper.get("year") or 0
        try:
            year = int(year)
        except Exception:
            year = 0
        abstract = _extract_abstract(paper.get("xml") or "")

        # Count matches by section
        t_mut = _textcount(title, mut_re)
        t_age = _textcount(title, aging_re)
        a_mut = _textcount(abstract, mut_re)
        a_age = _textcount(abstract, aging_re)
        b_mut = _textcount(body, mut_re)
        b_age = _textcount(body, aging_re)

        # Weighted sum with mild recency bonus
        score = (
            4.0 * t_mut
            + 3.0 * t_age
            + 2.5 * a_mut
            + 2.0 * a_age
            + 1.2 * b_mut
            + 0.8 * b_age
        )
        if year > 0:
            score += max(0, year - 2010) * 0.05

        return float(score)

    # --- Gather JSON files (no filtering) ---
    if not os.path.isdir(PAPERS_DIR):
        print(f"[INDEX] Folder '{PAPERS_DIR}' does not exist. Create it and drop JSON files inside.")
        return {"status": "ok"}

    all_files = [os.path.join(PAPERS_DIR, fn) for fn in os.listdir(PAPERS_DIR) if fn.endswith(".json")]
    all_files.sort()

    # --- Optional scoring and Top-N selection (streaming) ---
    selected_paths = all_files
    if use_scoring:
        scored: List[tuple[float, str]] = []
        bad = 0
        for p in all_files:
            try:
                with open(p, "r", encoding="utf-8") as f:
                    paper = json.load(f)
                sc = _score_paper(paper)
                scored.append((sc, p))
            except Exception:
                bad += 1
        scored.sort(key=lambda x: x[0], reverse=True)
        selected_paths = [p for _, p in scored[: max(1, int(top_n))]]
        print(f"[INDEX-ONLY][RANK] scanned={len(all_files)}, bad_json={bad}, selected_top_n={len(selected_paths)}")
        if selected_paths:
            print("[INDEX-ONLY][RANK] top5:", [os.path.basename(x) for x in selected_paths[:5]])

    # --- Batch slice after selection ---
    files = selected_paths[offset: offset + limit]

    print(f"[INDEX-ONLY] files_seen_total={len(all_files)} | after_select={len(selected_paths)} | batch_offset={offset} | batch_limit={limit} | batch_files={len(files)}")
    if not files:
        print("[INDEX-ONLY] Nothing to do for this batch.")
        return {"status": "ok", "files": 0}

    # --- Build Documents ---
    docs: List[Document] = []
    skipped_empty = 0
    for path in files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                paper: Dict[str, Any] = json.load(f)
            text = (paper.get("plain_text") or "").strip()
            if not text:
                skipped_empty += 1
                continue
            metadata = {
                "pmcid": paper.get("pmcid"),
                "doi": paper.get("doi"),
                "title": paper.get("title"),
                "year": paper.get("year"),
                "journal": paper.get("journal"),
                "protein_hits": paper.get("protein_hits"),
                "source_url": paper.get("source_url"),
            }
            pmcid = paper.get("pmcid")
            if pmcid and isinstance(pmcid, str) and pmcid.strip():
                doc_id = pmcid.strip()
            else:
                base = os.path.basename(path)
                doc_id = os.path.splitext(base)[0]
            docs.append(Document(text=text, metadata=metadata, doc_id=doc_id))
        except Exception as e:
            print(f"[INDEX-ONLY][skip broken] {os.path.basename(path)}: {e}")

    print(f"[INDEX-ONLY] docs_used={len(docs)} | docs_skipped_empty={skipped_empty}")
    if not docs:
        print("[INDEX-ONLY] No usable documents in this batch (empty/plain_text or load fail).")
        return {"status": "ok", "docs": 0}

    # --- Chunking ---
    splitter = SentenceSplitter(chunk_size=800, chunk_overlap=120)
    nodes = splitter.get_nodes_from_documents(docs)
    print(f"[INDEX-ONLY] chunks_created={len(nodes)}")
    if not nodes:
        print("[INDEX-ONLY] No chunks created.")
        return {"status": "ok", "chunks": 0}

    # --- Embeddings via Nebius ---
    print("[INDEX-ONLY] Creating OpenAI client for Nebius...")
    client = OpenAI(api_key=settings.nebius_api_key, base_url=NEBIUS_BASE_URL)
    node_ids = [n.id_ for n in nodes]
    node_texts = [n.get_content(metadata_mode="none") for n in nodes]
    print(f"[INDEX-ONLY] Prepared {len(node_ids)} node IDs and {len(node_texts)} texts")

    def clean_metadata_for_chroma(meta: Dict[str, Any]) -> Dict[str, Any]:
        cleaned = {}
        for key, value in (meta or {}).items():
            if value is None:
                if key == "year":
                    cleaned[key] = 0
                else:
                    cleaned[key] = ""
            elif isinstance(value, (str, int, float, bool)):
                cleaned[key] = value
            elif isinstance(value, list):
                cleaned[key] = json.dumps(value)
            elif isinstance(value, dict):
                cleaned[key] = json.dumps(value)
            else:
                cleaned[key] = str(value)
        return cleaned

    print("[INDEX-ONLY] Cleaning metadata for Chroma...")
    node_metas = [clean_metadata_for_chroma(n.metadata) for n in nodes]
    print(f"[INDEX-ONLY] Cleaned {len(node_metas)} metadata entries")

    try:
        print(f"[INDEX-ONLY] Embedding with model='{NEBIUS_EMBED_MODEL}' at base_url='{NEBIUS_BASE_URL}' ...")
        print(f"[INDEX-ONLY] Sending {len(node_texts)} texts to Nebius for embedding...")
        embeddings = []
        total_batches = (len(node_texts) + emb_batch_size - 1) // emb_batch_size
        for start in range(0, len(node_texts), emb_batch_size):
            batch = node_texts[start:start + emb_batch_size]
            batch_num = start // emb_batch_size + 1
            if batch_num == 1 or batch_num % 10 == 0 or batch_num == total_batches:
                print(f"[INDEX-ONLY][EMB] batch {batch_num}/{total_batches} (+{len(batch)} texts)")
            resp = client.embeddings.create(model=NEBIUS_EMBED_MODEL, input=batch)
            embeddings.extend([item.embedding for item in resp.data])
        print(f"[INDEX-ONLY] Total embeddings: {len(embeddings)}")
    except Exception as e:
        print(f"[INDEX-ONLY][embed error] {e}")
        raise HTTPException(status_code=500, detail="Nebius embedding request failed (index-only)")

    if len(embeddings) != len(node_ids):
        print(f"[INDEX-ONLY][embed mismatch] ids={len(node_ids)} vs embeds={len(embeddings)}")
        raise HTTPException(status_code=500, detail="Embedding count mismatch (index-only)")

    if embeddings:
        emb_dim = len(embeddings[0])
        print(f"[INDEX-ONLY] Embedding dimensions: {emb_dim} (first vector)")

    # --- ChromaDB storage ---
    try:
        os.makedirs(CHROMA_STORE_PATH, exist_ok=True)
    except Exception as e:
        print(f"[INDEX-ONLY][ChromaDB dir error] {e}")
        raise HTTPException(status_code=500, detail="Failed to create ChromaDB directory (index-only)")

    try:
        chroma_client = chromadb.PersistentClient(path=CHROMA_STORE_PATH)
        collection = chroma_client.get_or_create_collection(
            name=CHROMA_STORE_COLLECTION,
            metadata={"hnsw:space": "cosine"}
        )
        print(f"[INDEX-ONLY][ChromaDB] Collection ready (current count: {collection.count()})")
    except Exception as e:
        print(f"[INDEX-ONLY][ChromaDB init error] {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize ChromaDB (index-only)")

    # Add vectors in batches
    CHROMA_BATCH_SIZE = 100
    total_added = 0
    for start in range(0, len(node_ids), CHROMA_BATCH_SIZE):
        end = min(start + CHROMA_BATCH_SIZE, len(node_ids))
        try:
            collection.upsert(
                ids=node_ids[start:end],
                documents=node_texts[start:end],
                metadatas=node_metas[start:end],
                embeddings=embeddings[start:end]
            )
            total_added += end - start
        except Exception as e:
            print(f"[INDEX-ONLY][ChromaDB upsert error] batch {start}-{end}: {e}")
            raise HTTPException(status_code=500, detail=f"ChromaDB upsert failed: {e}")

    print(f"[INDEX-ONLY][ChromaDB] Added {total_added} vectors (total in collection: {collection.count()})")
    print("[INDEX-ONLY] Batch done (ChromaDB).")
    return {"status": "ok", "files": len(files), "docs": len(docs), "chunks": len(node_ids), "total_vectors": collection.count()}


@app.post("/index/chroma_batch_without_scoring")
def index_chroma_batch_without_scoring(limit: int = 200, offset: int = 0):
# call e.g.: POST http://localhost:8000/index/chroma_batch_without_scoring?limit=1000&offset=0

    """
    Indexing-only endpoint:
    - Loads JSON files from 'papers/' sliced by offset/limit
    - Builds chunks, embeds via Nebius, stores in ChromaDB
    - Does NOT run query/extraction/article generation
    Returns only {"status": "ok"} (plus small counters).
    """

    # --- Gather JSON files (no filtering) ---
    if not os.path.isdir(PAPERS_DIR):
        print(f"[INDEX] Folder '{PAPERS_DIR}' does not exist. Create it and drop JSON files inside.")
        return {"status": "ok"}

    all_files = [os.path.join(PAPERS_DIR, fn) for fn in os.listdir(PAPERS_DIR) if fn.endswith(".json")]
    all_files.sort()
    files = all_files[offset: offset + limit]

    print(f"[INDEX-ONLY] files_seen_total={len(all_files)} | batch_offset={offset} | batch_limit={limit} | batch_files={len(files)}")
    if not files:
        print("[INDEX-ONLY] Nothing to do for this batch.")
        return {"status": "ok", "files": 0}

    # --- Build Documents ---
    docs: List[Document] = []
    skipped_empty = 0
    for path in files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                paper: Dict[str, Any] = json.load(f)
            text = (paper.get("plain_text") or "").strip()
            if not text:
                skipped_empty += 1
                continue
            metadata = {
                "pmcid": paper.get("pmcid"),
                "doi": paper.get("doi"),
                "title": paper.get("title"),
                "year": paper.get("year"),
                "journal": paper.get("journal"),
                "protein_hits": paper.get("protein_hits"),
                "source_url": paper.get("source_url"),
            }
            pmcid = paper.get("pmcid")
            if pmcid and isinstance(pmcid, str) and pmcid.strip():
                doc_id = pmcid.strip()
            else:
                base = os.path.basename(path)
                doc_id = os.path.splitext(base)[0]
            docs.append(Document(text=text, metadata=metadata, doc_id=doc_id))
        except Exception as e:
            print(f"[INDEX-ONLY][skip broken] {os.path.basename(path)}: {e}")

    print(f"[INDEX-ONLY] docs_used={len(docs)} | docs_skipped_empty={skipped_empty}")
    if not docs:
        print("[INDEX-ONLY] No usable documents in this batch (empty/plain_text or load fail).")
        return {"status": "ok", "docs": 0}

    # --- Chunking ---
    splitter = SentenceSplitter(chunk_size=800, chunk_overlap=120)
    nodes = splitter.get_nodes_from_documents(docs)
    print(f"[INDEX-ONLY] chunks_created={len(nodes)}")
    if not nodes:
        print("[INDEX-ONLY] No chunks created.")
        return {"status": "ok", "chunks": 0}

    # --- Embeddings via Nebius ---
    print("[INDEX-ONLY] Creating OpenAI client for Nebius...")
    client = OpenAI(api_key=settings.nebius_api_key, base_url=NEBIUS_BASE_URL)
    node_ids = [n.id_ for n in nodes]
    node_texts = [n.get_content(metadata_mode="none") for n in nodes]
    print(f"[INDEX-ONLY] Prepared {len(node_ids)} node IDs and {len(node_texts)} texts")

    def clean_metadata_for_chroma(meta: Dict[str, Any]) -> Dict[str, Any]:
        cleaned = {}
        for key, value in (meta or {}).items():
            if value is None:
                if key == "year":
                    cleaned[key] = 0
                else:
                    cleaned[key] = ""
            elif isinstance(value, (str, int, float, bool)):
                cleaned[key] = value
            elif isinstance(value, list):
                cleaned[key] = json.dumps(value)
            elif isinstance(value, dict):
                cleaned[key] = json.dumps(value)
            else:
                cleaned[key] = str(value)
        return cleaned

    print("[INDEX-ONLY] Cleaning metadata for Chroma...")
    node_metas = [clean_metadata_for_chroma(n.metadata) for n in nodes]
    print(f"[INDEX-ONLY] Cleaned {len(node_metas)} metadata entries")

    try:
        print(f"[INDEX-ONLY] Embedding with model='{NEBIUS_EMBED_MODEL}' at base_url='{NEBIUS_BASE_URL}' ...")
        print(f"[INDEX-ONLY] Sending {len(node_texts)} texts to Nebius for embedding...")
        BATCH_SIZE = 96
        embeddings = []
        total_batches = (len(node_texts) + BATCH_SIZE - 1) // BATCH_SIZE
        for start in range(0, len(node_texts), BATCH_SIZE):
            batch = node_texts[start:start + BATCH_SIZE]
            batch_num = start // BATCH_SIZE + 1
            if batch_num == 1 or batch_num % 10 == 0 or batch_num == total_batches:
                print(f"[INDEX-ONLY][EMB] batch {batch_num}/{total_batches} (+{len(batch)} texts)")
            resp = client.embeddings.create(model=NEBIUS_EMBED_MODEL, input=batch)
            embeddings.extend([item.embedding for item in resp.data])
        print(f"[INDEX-ONLY] Total embeddings: {len(embeddings)}")
    except Exception as e:
        print(f"[INDEX-ONLY][embed error] {e}")
        raise HTTPException(status_code=500, detail="Nebius embedding request failed (index-only)")

    if len(embeddings) != len(node_ids):
        print(f"[INDEX-ONLY][embed mismatch] ids={len(node_ids)} vs embeds={len(embeddings)}")
        raise HTTPException(status_code=500, detail="Embedding count mismatch (index-only)")

    if embeddings:
        emb_dim = len(embeddings[0])
        print(f"[INDEX-ONLY] Embedding dimensions: {emb_dim} (first vector)")

    # --- ChromaDB storage ---
    try:
        os.makedirs(CHROMA_STORE_PATH, exist_ok=True)
    except Exception as e:
        print(f"[INDEX-ONLY][ChromaDB dir error] {e}")
        raise HTTPException(status_code=500, detail="Failed to create ChromaDB directory (index-only)")

    try:
        chroma_client = chromadb.PersistentClient(path=CHROMA_STORE_PATH)
        collection = chroma_client.get_or_create_collection(
            name=CHROMA_STORE_COLLECTION,
            metadata={"hnsw:space": "cosine"}
        )
        print(f"[INDEX-ONLY][ChromaDB] Collection ready (current count: {collection.count()})")
    except Exception as e:
        print(f"[INDEX-ONLY][ChromaDB init error] {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize ChromaDB (index-only)")

    # Add vectors in batches
    CHROMA_BATCH_SIZE = 100
    total_added = 0
    for start in range(0, len(node_ids), CHROMA_BATCH_SIZE):
        end = min(start + CHROMA_BATCH_SIZE, len(node_ids))
        try:
            collection.upsert(
                ids=node_ids[start:end],
                documents=node_texts[start:end],
                metadatas=node_metas[start:end],
                embeddings=embeddings[start:end]
            )
            total_added += end - start
        except Exception as e:
            print(f"[INDEX-ONLY][ChromaDB upsert error] batch {start}-{end}: {e}")
            raise HTTPException(status_code=500, detail=f"ChromaDB upsert failed: {e}")

    print(f"[INDEX-ONLY][ChromaDB] Added {total_added} vectors (total in collection: {collection.count()})")
    print("[INDEX-ONLY] Batch done (ChromaDB).")
    return {"status": "ok", "files": len(files), "docs": len(docs), "chunks": len(node_ids), "total_vectors": collection.count()}


@app.post("/article/generate")
def article_generate(query: Optional[str] = None, top_k: int = 300, protein_name: str = "APOE"):
    """
    Article-only endpoint:
    - Loads existing ChromaDB collection
    - Runs semantic query, per-chunk extractions (LLM), and article generation (LLM)
    - Saves HTML into CHROMA_STORE_PATH/articles and returns {"status": "ok"}
    """

    # Prepare Nebius client
    client = OpenAI(api_key=settings.nebius_api_key, base_url=NEBIUS_BASE_URL)

    # Prepare query
    QUERY = query or "APOE polymorphisms affecting human lifespan or aging, not disease-specific"
    query_top_k = int(top_k)
    print(f"[ARTICLE] START article_generate protein={protein_name!r} top_k={query_top_k} query={QUERY!r}")

    try:
        print(f"[ARTICLE][query] Starting ChromaDB query (top_k={query_top_k})...")
        q_emb_resp = client.embeddings.create(model=NEBIUS_EMBED_MODEL, input=[QUERY])
        query_embedding = q_emb_resp.data[0].embedding

        # Query ChromaDB
        chroma_client = chromadb.PersistentClient(path=CHROMA_STORE_PATH)
        collection = chroma_client.get_collection(name=CHROMA_STORE_COLLECTION)
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=query_top_k,
            include=["documents", "metadatas", "distances"]
        )

        query_hits = []
        if results and results['ids'] and results['ids'][0]:
            for rank, chunk_id in enumerate(results['ids'][0], start=1):
                idx = rank - 1
                meta = results['metadatas'][0][idx] if results['metadatas'] else {}
                text = results['documents'][0][idx] if results['documents'] else ""
                distance = results['distances'][0][idx] if results['distances'] else 0
                score = 1.0 / (1.0 + distance)  # Convert distance to similarity
                
                preview_text = text
                if len(preview_text) > 300:
                    preview_text = preview_text[:300] + "…"
                hit = {
                    "rank": rank,
                    "score": float(score),
                    "id": chunk_id,
                    "pmcid": meta.get("pmcid", ""),
                    "doi": meta.get("doi", ""),
                    "title": meta.get("title", ""),
                    "year": meta.get("year", 0),
                    "journal": meta.get("journal", ""),
                    "source_url": meta.get("source_url", ""),
                    "text_preview": preview_text,
                    "full_text": text,
                }
                query_hits.append(hit)
        print(f"[ARTICLE][query] hits={len(query_hits)} (requested top_k={query_top_k})")
    except Exception as e:
        print(f"[ARTICLE][query error] {e}")
        raise HTTPException(status_code=500, detail="ChromaDB query failed (article)")

    # Extraction LLM setup (schema and prompts)
    extraction_schema = {
        "name": "s2f_extraction",
        "schema": {
            "type": "object",
            "properties": {
                "protein": {"type": "string", "description": "Canonical protein/gene name if explicitly mentioned; otherwise empty."},
                "organism": {"type": "string", "description": "Species/organism context if stated; otherwise empty."},
                "sequence_interval": {"type": "string", "description": "Residue or nucleotide interval (e.g., 'aa 120-145', or motif/domain) if inferable; otherwise empty."},
                "modification": {"type": "string", "description": "Exact sequence change (e.g., 'E4 (Arg112/Arg158)', 'Cys->Ser at pos 151)', 'domain deletion') if present; otherwise empty."},
                "functional_effect": {"type": "string", "description": "Functional change on the protein/gene (e.g., binding, stability, transcriptional activity)."},
                "longevity_effect": {"type": "string", "description": "Effect on lifespan/healthspan if present (e.g., increased lifespan in C.elegans)."},
                "evidence_type": {"type": "string", "description": "Type of evidence (e.g., genetic manipulation, mutant strain, CRISPR edit, overexpression, knockdown)."},
                "figure_or_panel": {"type": "string", "description": "Figure/panel if explicitly cited (e.g., 'Fig. 2B'); otherwise empty."},
                "citation_hint": {"type": "string", "description": "Any DOI/PMCID/PMID text in the chunk; empty if none. Do not invent IDs."},
                "confidence": {"type": "number", "description": "0.0–1.0 subjective confidence derived from the chunk only."}
            },
            "required": ["protein", "modification", "functional_effect", "longevity_effect", "confidence"],
            "additionalProperties": False
        },
        "strict": True
    }

    SYSTEM_PROMPT = (
        "You are a careful scientific text-miner for protein/gene sequence-to-function relationships in the context of longevity. "
        "Extract only what is explicitly supported by the provided chunk. Do not hallucinate unknown IDs or effects. "
        "If a field is not present in the text, return an empty string for that field (or 0.0 for confidence)."
    )

    USER_INSTRUCTION_PREFIX = (
        "From the following paper chunk, extract ONLY facts about sequence modifications (mutations, domain edits, variants) "
        "and their functional outcomes, especially any lifespan/healthspan associations. "
        "Work strictly chunk-local: do not infer from general knowledge. "
        "Return a single JSON object that conforms to the provided schema."
        "\n\n--- BEGIN CHUNK ---\n"
    )
    USER_INSTRUCTION_SUFFIX = "\n--- END CHUNK ---"

    neb_url = f"{NEBIUS_BASE_URL}chat/completions"
    neb_headers = {
        "Authorization": f"Bearer {settings.nebius_api_key}",
        "Content-Type": "application/json",
    }

    extractions = []
    # Full-document extraction with PMCID-level deduplication
    # We iterate over hits (chunks) but perform at most one extraction per PMCID.
    pmcid_to_text = load_pmcid_to_text(PAPERS_DIR)
    seen_pmcids = set()
    total_hits = len(query_hits)
    processed_papers = 0
    print(f"[ARTICLE][extract] Starting extraction over {total_hits} hits (dedup by PMCID).")
    for i, hit in enumerate(query_hits, start=1):
        pmcid = (hit.get("pmcid") or "").strip()
        if pmcid and pmcid in seen_pmcids:
            continue  # already processed this paper

        # Prefer full paper text from harvested JSONs
        full_text = pmcid_to_text.get(pmcid, "")

        # Fallbacks: if no PMCID or no plain text, fall back to the chunk text from ChromaDB
        if not full_text:
            full_text = hit.get("full_text", "") or hit.get("text_preview", "")

        if pmcid:
            seen_pmcids.add(pmcid)

        # Compose the user content with the full paper text (or fallback)
        user_content = USER_INSTRUCTION_PREFIX + full_text + USER_INSTRUCTION_SUFFIX
        payload = {
            "model": NEBIUS_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.1,
            "max_tokens": 1024,
            "response_format": {
                "type": "json_schema",
                "json_schema": extraction_schema
            }
        }

        try:
            with httpx.Client(timeout=90) as neb_client:
                resp = neb_client.post(neb_url, json=payload, headers=neb_headers)
            # Try to parse model's JSON response
            data = resp.json()
            content = ""
            if isinstance(data, dict) and "choices" in data and data["choices"]:
                content = data["choices"][0]["message"]["content"] or ""
            extracted_obj = {}
            if content:
                try:
                    extracted_obj = json.loads(content)
                except json.JSONDecodeError:
                    extracted_obj = {"_raw": content}
            extracted_obj["_provenance"] = {
                "pmcid": hit.get("pmcid", ""),
                "doi": hit.get("doi", ""),
                "title": hit.get("title", ""),
                "year": hit.get("year", 0),
                "journal": hit.get("journal", ""),
                "source_url": hit.get("source_url", ""),
                "rank": hit.get("rank", i),
                "score": hit.get("score", None),
                "node_id": hit.get("id"),
            }
            extractions.append(extracted_obj)
            processed_papers += 1
            if processed_papers % 10 == 0:
                print(f"[ARTICLE][extract] {processed_papers} papers extracted so far...")
        except Exception as e:
            print(f"[ARTICLE][extract error] {e}")
            extractions.append({
                "_error": str(e),
                "_provenance": {
                    "pmcid": hit.get("pmcid", ""),
                    "title": hit.get("title", ""),
                    "rank": hit.get("rank", i),
                    "node_id": hit.get("id"),
                }
            })

    print(f"[ARTICLE] Completed {processed_papers} paper-level extractions (from {total_hits} hits, dedup by PMCID={len(seen_pmcids)}).")

    # Prepare article generation
    compact_extractions = []
    for ex in extractions:
        if not isinstance(ex, dict):
            continue
        compact_extractions.append({
            "protein": ex.get("protein", ""),
            "organism": ex.get("organism", ""),
            "sequence_interval": ex.get("sequence_interval", ""),
            "modification": ex.get("modification", ""),
            "functional_effect": ex.get("functional_effect", ""),
            "longevity_effect": ex.get("longevity_effect", ""),
            "evidence_type": ex.get("evidence_type", ""),
            "figure_or_panel": ex.get("figure_or_panel", ""),
            "citation_hint": ex.get("citation_hint", ""),
            "confidence": ex.get("confidence", 0.0),
            "_provenance": ex.get("_provenance", {}),
        })

    article_schema = {
        "name": "wikicrow_article",
        "schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "html": {"type": "string"}
            },
            "required": ["title", "html"],
            "additionalProperties": False
        },
        "strict": True
    }

    ARTICLE_SYSTEM = (
        "You are a senior scientific editor. Write concise HTML articles "
        "summarizing protein sequence-to-function relationships related to longevity. "
        "Use the provided extraction data only; do not invent facts or citations. "
        "Return the article as clean, minimal HTML suitable for web display."
    )

    article_user_instruction = (
        "Compose a WikiCrow-style HTML article for the protein '"
        + protein_name
        + "'. Use these extraction objects as factual input. "
        "Include sections for Overview, Sequence→Function Table, and Notes. "
        "Use semantic HTML tags only (<h1>, <h2>, <table>, <tr>, <td>, <ul>, <li>, <p>). "
        "The table must have columns: Interval, Modification, Functional Effect, "
        "Longevity Effect, Evidence, Citation. Do not include external CSS or scripts. "
        "\n\nExtraction data:\n"
        + json.dumps({"protein": protein_name, "extractions": compact_extractions}, ensure_ascii=False)
    )

    article_payload = {
        "model": NEBIUS_MODEL,
        "messages": [
            {"role": "system", "content": ARTICLE_SYSTEM},
            {"role": "user", "content": article_user_instruction}
        ],
        "temperature": 0.2,
        "max_tokens": 8192,
        "response_format": {
            "type": "json_schema",
            "json_schema": article_schema
        }
    }

    print(f"[ARTICLE] Generating HTML article for protein={protein_name!r} using {NEBIUS_MODEL}")
    try:
        with httpx.Client(timeout=120) as neb_client:
            aresp = neb_client.post(
                f"{NEBIUS_BASE_URL}chat/completions",
                json=article_payload,
                headers={
                    "Authorization": f"Bearer {settings.nebius_api_key}",
                    "Content-Type": "application/json",
                },
            )
        print(f"[ARTICLE] HTTP {aresp.status_code}")

        article_title = f"{protein_name} — Sequence-to-Function & Longevity"
        article_html = "<h1>Draft</h1><p>No content returned.</p>"

        adata = aresp.json()
        if isinstance(adata, dict) and adata.get("choices"):
            acontent = adata["choices"][0]["message"]["content"] or ""
            try:
                aobj = json.loads(acontent)
                article_title = aobj.get("title") or article_title
                article_html = aobj.get("html") or article_html
            except json.JSONDecodeError:
                article_html = f"<h1>{article_title}</h1><pre>{acontent}</pre>"

        out_dir = os.path.join(CHROMA_STORE_PATH, "articles")
        os.makedirs(out_dir, exist_ok=True)
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", protein_name)
        out_path = os.path.join(out_dir, f"{safe_name}.html")

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(article_html)
        print(f"[ARTICLE] Saved article HTML: {out_path}")

        preview = article_html[:800] + ("…" if len(article_html) > 800 else "")
        print("[ARTICLE][preview]\n", preview)

    except Exception as e:
        print(f"[ARTICLE][error] {e}")

    return {"status": "ok"}

@app.post("/article/generate-from-chunks")
def article_generate_from_chunks(query: Optional[str] = None, top_k: int = 100, protein_name: str = "APOE"):
    """
    Article-only endpoint:
    - Loads existing ChromaDB collection
    - Runs semantic query, per-chunk extractions (LLM), and article generation (LLM)
    - Saves HTML into CHROMA_STORE_PATH/articles and returns {"status": "ok"}
    """

    # Prepare Nebius client
    client = OpenAI(api_key=settings.nebius_api_key, base_url=NEBIUS_BASE_URL)

    # Prepare query
    QUERY = query or "APOE variant longevity lifespan"
    query_top_k = int(top_k)

    try:
        q_emb_resp = client.embeddings.create(model=NEBIUS_EMBED_MODEL, input=[QUERY])
        query_embedding = q_emb_resp.data[0].embedding

        # Query ChromaDB
        chroma_client = chromadb.PersistentClient(path=CHROMA_STORE_PATH)
        collection = chroma_client.get_collection(name=CHROMA_STORE_COLLECTION)
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=query_top_k,
            include=["documents", "metadatas", "distances"]
        )

        query_hits = []
        if results and results['ids'] and results['ids'][0]:
            for rank, chunk_id in enumerate(results['ids'][0], start=1):
                idx = rank - 1
                meta = results['metadatas'][0][idx] if results['metadatas'] else {}
                text = results['documents'][0][idx] if results['documents'] else ""
                distance = results['distances'][0][idx] if results['distances'] else 0
                score = 1.0 / (1.0 + distance)
                
                preview_text = text
                if len(preview_text) > 300:
                    preview_text = preview_text[:300] + "…"
                hit = {
                    "rank": rank,
                    "score": float(score),
                    "id": chunk_id,
                    "pmcid": meta.get("pmcid", ""),
                    "doi": meta.get("doi", ""),
                    "title": meta.get("title", ""),
                    "year": meta.get("year", 0),
                    "journal": meta.get("journal", ""),
                    "source_url": meta.get("source_url", ""),
                    "text_preview": preview_text,
                    "full_text": text,
                }
                query_hits.append(hit)
    except Exception as e:
        print(f"[ARTICLE][query error] {e}")
        raise HTTPException(status_code=500, detail="ChromaDB query failed (article)")

    # Extraction LLM setup (schema and prompts)
    extraction_schema = {
        "name": "s2f_extraction",
        "schema": {
            "type": "object",
            "properties": {
                "protein": {"type": "string", "description": "Canonical protein/gene name if explicitly mentioned; otherwise empty."},
                "organism": {"type": "string", "description": "Species/organism context if stated; otherwise empty."},
                "sequence_interval": {"type": "string", "description": "Residue or nucleotide interval (e.g., 'aa 120-145', or motif/domain) if inferable; otherwise empty."},
                "modification": {"type": "string", "description": "Exact sequence change (e.g., 'E4 (Arg112/Arg158)', 'Cys->Ser at pos 151)', 'domain deletion') if present; otherwise empty."},
                "functional_effect": {"type": "string", "description": "Functional change on the protein/gene (e.g., binding, stability, transcriptional activity)."},
                "longevity_effect": {"type": "string", "description": "Effect on lifespan/healthspan if present (e.g., increased lifespan in C.elegans)."},
                "evidence_type": {"type": "string", "description": "Type of evidence (e.g., genetic manipulation, mutant strain, CRISPR edit, overexpression, knockdown)."},
                "figure_or_panel": {"type": "string", "description": "Figure/panel if explicitly cited (e.g., 'Fig. 2B'); otherwise empty."},
                "citation_hint": {"type": "string", "description": "Any DOI/PMCID/PMID text in the chunk; empty if none. Do not invent IDs."},
                "confidence": {"type": "number", "description": "0.0–1.0 subjective confidence derived from the chunk only."}
            },
            "required": ["protein", "modification", "functional_effect", "longevity_effect", "confidence"],
            "additionalProperties": False
        },
        "strict": True
    }

    SYSTEM_PROMPT = (
        "You are a careful scientific text-miner for protein/gene sequence-to-function relationships in the context of longevity. "
        "Extract only what is explicitly supported by the provided chunk. Do not hallucinate unknown IDs or effects. "
        "If a field is not present in the text, return an empty string for that field (or 0.0 for confidence)."
    )

    USER_INSTRUCTION_PREFIX = (
        "From the following paper chunk, extract ONLY facts about sequence modifications (mutations, domain edits, variants) "
        "and their functional outcomes, especially any lifespan/healthspan associations. "
        "Work strictly chunk-local: do not infer from general knowledge. "
        "Return a single JSON object that conforms to the provided schema."
        "\n\n--- BEGIN CHUNK ---\n"
    )
    USER_INSTRUCTION_SUFFIX = "\n--- END CHUNK ---"

    neb_url = f"{NEBIUS_BASE_URL}chat/completions"
    neb_headers = {
        "Authorization": f"Bearer {settings.nebius_api_key}",
        "Content-Type": "application/json",
    }

    extractions = []
    max_chunks_for_extraction = len(query_hits)
    for i, hit in enumerate(query_hits[:max_chunks_for_extraction], start=1):
        # Get full text from the hit (stored during query phase)
        full_text = hit.get("full_text", "") or hit.get("text_preview", "")

        user_content = USER_INSTRUCTION_PREFIX + full_text + USER_INSTRUCTION_SUFFIX
        payload = {
            "model": NEBIUS_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.1,
            "max_tokens": 600,
            "response_format": {
                "type": "json_schema",
                "json_schema": extraction_schema
            }
        }

        try:
            with httpx.Client(timeout=90) as neb_client:
                resp = neb_client.post(neb_url, json=payload, headers=neb_headers)
            # Try to parse model's JSON response
            data = resp.json()
            content = ""
            if isinstance(data, dict) and "choices" in data and data["choices"]:
                content = data["choices"][0]["message"]["content"] or ""
            extracted_obj = {}
            if content:
                try:
                    extracted_obj = json.loads(content)
                except json.JSONDecodeError:
                    extracted_obj = {"_raw": content}
            extracted_obj["_provenance"] = {
                "pmcid": hit.get("pmcid", ""),
                "doi": hit.get("doi", ""),
                "title": hit.get("title", ""),
                "year": hit.get("year", 0),
                "journal": hit.get("journal", ""),
                "source_url": hit.get("source_url", ""),
                "rank": hit.get("rank", i),
                "score": hit.get("score", None),
                "node_id": node_id,
            }
            extractions.append(extracted_obj)
        except Exception as e:
            print(f"[ARTICLE][extract error] {e}")
            extractions.append({
                "_error": str(e),
                "_provenance": {
                    "pmcid": hit.get("pmcid", ""),
                    "title": hit.get("title", ""),
                    "rank": hit.get("rank", i),
                    "node_id": node_id,
                }
            })

    print(f"[ARTICLE] Completed {len(extractions)}/{max_chunks_for_extraction} chunk extractions.")

    # Prepare article generation
    compact_extractions = []
    for ex in extractions:
        if not isinstance(ex, dict):
            continue
        compact_extractions.append({
            "protein": ex.get("protein", ""),
            "organism": ex.get("organism", ""),
            "sequence_interval": ex.get("sequence_interval", ""),
            "modification": ex.get("modification", ""),
            "functional_effect": ex.get("functional_effect", ""),
            "longevity_effect": ex.get("longevity_effect", ""),
            "evidence_type": ex.get("evidence_type", ""),
            "figure_or_panel": ex.get("figure_or_panel", ""),
            "citation_hint": ex.get("citation_hint", ""),
            "confidence": ex.get("confidence", 0.0),
            "_provenance": ex.get("_provenance", {}),
        })

    article_schema = {
        "name": "wikicrow_article",
        "schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "html": {"type": "string"}
            },
            "required": ["title", "html"],
            "additionalProperties": False
        },
        "strict": True
    }

    ARTICLE_SYSTEM = (
        "You are a senior scientific editor. Write concise HTML articles "
        "summarizing protein sequence-to-function relationships related to longevity. "
        "Use the provided extraction data only; do not invent facts or citations. "
        "Return the article as clean, minimal HTML suitable for web display."
    )

    article_user_instruction = (
        "Compose a WikiCrow-style HTML article for the protein '"
        + protein_name
        + "'. Use these extraction objects as factual input. "
        "Include sections for Overview, Sequence→Function Table, and Notes. "
        "Use semantic HTML tags only (<h1>, <h2>, <table>, <tr>, <td>, <ul>, <li>, <p>). "
        "The table must have columns: Interval, Modification, Functional Effect, "
        "Longevity Effect, Evidence, Citation. Do not include external CSS or scripts. "
        "\n\nExtraction data:\n"
        + json.dumps({"protein": protein_name, "extractions": compact_extractions}, ensure_ascii=False)
    )

    article_payload = {
        "model": NEBIUS_MODEL,
        "messages": [
            {"role": "system", "content": ARTICLE_SYSTEM},
            {"role": "user", "content": article_user_instruction}
        ],
        "temperature": 0.2,
        "max_tokens": 1800,
        "response_format": {
            "type": "json_schema",
            "json_schema": article_schema
        }
    }

    print(f"[ARTICLE] Generating HTML article for protein={protein_name!r} using {NEBIUS_MODEL}")
    try:
        with httpx.Client(timeout=120) as neb_client:
            aresp = neb_client.post(
                f"{NEBIUS_BASE_URL}chat/completions",
                json=article_payload,
                headers={
                    "Authorization": f"Bearer {settings.nebius_api_key}",
                    "Content-Type": "application/json",
                },
            )
        print(f"[ARTICLE] HTTP {aresp.status_code}")

        article_title = f"{protein_name} — Sequence-to-Function & Longevity"
        article_html = "<h1>Draft</h1><p>No content returned.</p>"

        adata = aresp.json()
        if isinstance(adata, dict) and adata.get("choices"):
            acontent = adata["choices"][0]["message"]["content"] or ""
            try:
                aobj = json.loads(acontent)
                article_title = aobj.get("title") or article_title
                article_html = aobj.get("html") or article_html
            except json.JSONDecodeError:
                article_html = f"<h1>{article_title}</h1><pre>{acontent}</pre>"

        out_dir = os.path.join(CHROMA_STORE_PATH, "articles")
        os.makedirs(out_dir, exist_ok=True)
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", protein_name)
        out_path = os.path.join(out_dir, f"{safe_name}.html")

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(article_html)
        print(f"[ARTICLE] Saved article HTML: {out_path}")

        preview = article_html[:800] + ("…" if len(article_html) > 800 else "")
        print("[ARTICLE][preview]\n", preview)

    except Exception as e:
        print(f"[ARTICLE][error] {e}")

    return {"status": "ok"}


@app.post("/index/run_all")
def index_run_all(batch_size: int = 1000, protein_name: str = "APOE", query: Optional[str] = None, top_k: int = 10):
    """
    Orchestrator:
    - Iterates papers/ in batches, calling /index/chroma_batch until all are indexed
    - Then calls /article/generate once to produce the final article from the full index
    """

    if not os.path.isdir(PAPERS_DIR):
        return {"status": "ok", "note": f"Folder '{PAPERS_DIR}' not found", "indexed": 0}

    all_files = [fn for fn in os.listdir(PAPERS_DIR) if fn.endswith(".json")]
    total = len(all_files)
    if total == 0:
        return {"status": "ok", "note": "No JSON files in papers/", "indexed": 0}

    processed = 0
    for offset in range(0, total, int(batch_size)):
        limit = min(int(batch_size), total - offset)
        print(f"[RUN-ALL] Index batch offset={offset} limit={limit}")
        try:
            index_chroma_batch(limit=limit, offset=offset)
            processed += limit
        except HTTPException as e:
            print(f"[RUN-ALL][index error] {e.detail}")
            raise

    print("[RUN-ALL] Indexing complete. Generating article...")
    article_generate(query=query, top_k=top_k, protein_name=protein_name)
    print("[RUN-ALL] Done.")
    return {"status": "ok", "indexed": processed, "total": total}

@app.get("/harvest/{protein_name}")
def harvest_protein(protein_name: str, limit: int = 1):
    """
    Harvests Open Access Europe PMC papers for a given protein.

    This endpoint searches for *human* (TAXON_ID:9606) Open Access papers
    mentioning the specified protein in the full text. It iterates through
    search results using cursor-based pagination.

    For each valid result, it:
    1.  Fetches the full JATS XML from Europe PMC.
    2.  Converts the XML to cleaned plain text, removing common noise
        (e.g., reference lists, tables, figures).
    3.  If XML is unavailable, it falls back to using the title and abstract.
    4.  Saves the paper's metadata and text as one JSON file per paper
        (named `{pmcid}.json`) in the configured `PAPERS_DIR`.

    The harvest run stops when all results are processed or the
    hard-coded `MAX_HARVEST` limit is reached.

    Args:
        protein_name (str): The protein to search for (e.g., "APOE", "TP53"),
                            passed as a URL path parameter. The search is
                            case-insensitive and uses Europe PMC's synonym
                            expansion.
        limit (int, optional): The maximum number of papers to harvest.
                               Passed as a URL query parameter (e.g., `?limit=50`).
                               Defaults to 1.

    Returns:
        dict: A JSON response confirming the operation status, the total
              number of papers harvested (`harvested`), and an optional
              `note` if the `limit` cap was reached.
    """
    # Test proteins: NRF2, SOX2, APOE, OCT4
    # cytokine family: CCR1, CCR2, CCR5, CCR7
    PROTEIN = protein_name    # search term (Europe PMC search is case-insensitive)
    # ------------------------- Hard-coded settings -------------------------
    PAGE_SIZE = 1000          # Europe PMC maximum per page
    TIMEOUT_SECS = 60         # HTTP client timeout
    OA_ONLY = True            # we only collect Open Access; OA -> PMCID should be present
    SAVE_XML = True           # include raw JATS XML in JSON (can be set to False to save space)
    MAX_HARVEST = limit       # cap for test runs; raise/remove later
    # ----------------------------------------------------------------------

    # Ensure output directory exists (uses the global PAPERS_DIR defined at top of file)
    os.makedirs(PAPERS_DIR, exist_ok=True)

    # Build Europe PMC query.
    # TEXT: searches title, abstract, AND full text (if available).
    # synonym=Y: expand common gene/protein synonyms on EPMC side.
    # OPEN_ACCESS:Y: restricts to OA articles so we can fetch full JATS XML.
    base_query = f'(TEXT:"{PROTEIN}") AND OPEN_ACCESS:Y AND (TAXON_ID:9606 OR ORGANISM:"Homo sapiens" OR "Homo sapiens" OR human)'



    # -------------------- Small helpers (pure stdlib) ----------------------
    def _normalize_ws(s: str) -> str:
        """Collapse multiple whitespace to single spaces and trim."""
        return re.sub(r"\s+", " ", (s or "")).strip()

    def _parent_of(root: ET.Element, node: ET.Element):
        """Naive parent lookup for ElementTree (used to prune branches)."""
        for p in root.iter():
            for c in list(p):
                if c is node:
                    return p
        return None

    def jats_body_to_text(xml_text: str) -> str:
        """
        Convert JATS XML to a readable plain text:
        - Removes reference lists, figures, tables, and supplementary material (noise for embeddings).
        - Extracts <body> text if present, else falls back to whole tree text.
        - Normalizes whitespace.
        This is intentionally simple/robust rather than perfect formatting.
        """
        try:
            root = ET.fromstring(xml_text)
        except Exception:
            # If parsing fails, return normalized raw XML string (last-resort).
            return _normalize_ws(xml_text)

        # Drop typical non-content sections to declutter embeddings.
        def _remove_all(tag_local: str):
            for el in list(root.iter()):
                if isinstance(el.tag, str) and el.tag.endswith(tag_local) and el is not root:
                    parent = _parent_of(root, el)
                    if parent is not None:
                        parent.remove(el)

        for tag in ("ref-list", "table-wrap", "fig", "supplementary-material"):
            _remove_all(tag)

        # Prefer article body if present.
        target = None
        for el in root.iter():
            if isinstance(el.tag, str) and el.tag.endswith("body"):
                target = el
                break
        if target is None:
            target = root

        texts = []
        for t in target.itertext():
            texts.append(t)
        return _normalize_ws(" ".join(texts))
    # ----------------------------------------------------------------------

    # ----------------------------- Harvest loop ----------------------------
    # CursorMark (aka deep paging): Europe PMC returns a "nextCursorMark" token that you
    # pass back to retrieve the next page *without skipping* results even if the index changes.
    # We iterate until there are no more results or (optionally) a limit would be reached.
    cursor_mark = "*"
    harvested = 0
    seen_ids = set()

    with httpx.Client(timeout=TIMEOUT_SECS) as client:
        while True:
            # Prepare search request parameters (hard-coded strategy).
            params = {
                "query": base_query,
                "format": "json",        # ask for JSON so we can parse quickly
                "resultType": "core",    # standard metadata fields (title, abstract, IDs, OA flag, etc.)
                "pageSize": str(PAGE_SIZE),
                "cursorMark": cursor_mark,  # deep paging handle (see comment above)
                "synonym": "Y",             # activate Europe PMC synonym expansion
                # Align sort with working example in europepmc_search() to avoid API quirks with cursorMark
                # Europe PMC docs note stable sorts are recommended for cursor-based paging.
                "sort": "CITED desc",
            }

            # Visibility for server logs: which page are we fetching?
            print(f"[HARVEST][SEARCH] GET {EPMC_SEARCH_URL} q={params['query']} cursor={cursor_mark}")

            # Fire the search request and raise if HTTP status != 200.
            r = client.get(EPMC_SEARCH_URL, params=params)
            r.raise_for_status()

            # Parse the JSON payload and extract the "result" list and the next cursor.
            data = r.json()
            # Log total hit count reported by Europe PMC (useful to see scope upfront)
            try:
                print(f"[HARVEST][DEBUG] hitCount={data.get('hitCount', 0)}")
            except Exception:
                pass
            results = (data.get("resultList") or {}).get("result") or []
            print(f"[HARVEST][SEARCH] hits={len(results)}")
            next_cursor = data.get("nextCursorMark")

            # If no results, log a compact debug snippet and finish.
            if not results:
                try:
                    print("[HARVEST][debug] Empty page. Response keys:", list(data.keys()))
                    # Print a compact preview of payload to inspect structure differences
                    preview = str(data)
                    if len(preview) > 1200:
                        preview = preview[:1200] + "…"
                    print("[HARVEST][debug] Payload preview:", preview)
                except Exception:
                    pass
                break

            for rec in results:
                # Deduplicate across pages using a stable identifier preference.
                rid = rec.get("pmcid") or rec.get("id") or rec.get("pmid") or rec.get("doi")
                if not rid or rid in seen_ids:
                    continue
                seen_ids.add(rid)

                # OA-only is enforced by the query; OA entries should have a PMCID.
                pmcid = (rec.get("pmcid") or "").strip()
                if not pmcid:
                    # Extremely rare corner case; skip if no PMCID (we rely on PMCID for fullTextXML).
                    continue

                # Build the JSON skeleton expected by /index/batch.
                doi = (rec.get("doi") or "").strip()
                title = (rec.get("title") or "").strip()
                year = int(rec.get("pubYear") or 0)
                journal = (rec.get("journalTitle") or "").strip()

                # For OA items with PMCID, a canonical Europe PMC article URL is stable.
                source_url = f"https://europepmc.org/article/pmcid/{pmcid}"

                obj = {
                    "pmcid": pmcid,
                    "doi": doi,
                    "title": title,
                    "year": year,
                    "journal": journal,
                    "protein_hits": [PROTEIN],
                    "xml": "",
                    "plain_text": "",
                    "source_url": source_url,
                }

                # ---------------------- Fetch full JATS XML ----------------------
                # Europe PMC full-text endpoint pattern: /{PMCID}/fullTextXML
                full_url = f"{EPMC_FULLTEXT_BASE}/{pmcid}/fullTextXML"
                print(f"[HARVEST][XML] GET {full_url}")

                xml_text = ""
                try:
                    fr = client.get(full_url)
                    if fr.status_code == 200:
                        xml_text = fr.text or ""
                    else:
                        print(f"[HARVEST][warn] fullTextXML {pmcid} -> HTTP {fr.status_code}")
                except Exception as e:
                    print(f"[HARVEST][warn] XML fetch failed {pmcid}: {e}")

                # Convert JATS to plain text; if XML is missing, fall back to title+abstract.
                if xml_text:
                    plain = jats_body_to_text(xml_text)
                else:
                    abstr = (rec.get("abstractText") or "").strip()
                    plain = _normalize_ws(f"{title}. {abstr}")

                obj["xml"] = xml_text if SAVE_XML else ""
                obj["plain_text"] = plain

                # ----------------------- Write out JSON file ----------------------
                # File name policy: use PMCID (stable) so /index/batch will also use it as doc_id.
                out_path = os.path.join(PAPERS_DIR, f"{pmcid}.json")
                try:
                    with open(out_path, "w", encoding="utf-8") as f:
                        json.dump(obj, f, ensure_ascii=False, indent=2)
                    harvested += 1
                except Exception as e:
                    print(f"[HARVEST][error] write {out_path}: {e}")

                # Stop immediately when cap is reached
                if harvested >= MAX_HARVEST:
                    print(f"[HARVEST] Reached MAX_HARVEST={MAX_HARVEST}. Stopping.")
                    return {"status": "ok", "harvested": harvested, "note": "max cap reached"}

            # Stop when the cursor doesn't advance anymore (no further pages).
            if not next_cursor or next_cursor == cursor_mark:
                break
            cursor_mark = next_cursor
    # ----------------------------------------------------------------------

    print(f"[HARVEST] Done. harvested={harvested}")
    return {"status": "ok", "harvested": harvested}



@app.get("/papers/cleanup_refonly")
def papers_cleanup_refonly(protein: str = "APOE"):
    """
    Scans all JSON paper files under PAPERS_DIR and deletes those where the given
    protein term appears *only* inside the references (JATS <ref-list>), and
    nowhere else (title/abstract/body). Prints progress to the server console
    and returns only {"status": "ok"}.

    Assumptions:
    - All files in PAPERS_DIR are JSON with fields created by /harvest/apoe:
      {pmcid, doi, title, year, journal, protein_hits, xml, plain_text, source_url}.
    - 'xml' contains the JATS full text as saved during harvest.
    - Error handling is intentionally minimal for clarity.
    """

    # --- Config / search setup (simple and explicit) ---
    term = protein.strip()
    if not term:
        print("[CLEANUP] Empty protein term, nothing to do.")
        return {"status": "ok"}

    # \bAPOE\b, case-insensitive — adjust here if you ever want synonyms
    term_re = re.compile(rf"\b{re.escape(term)}\b", flags=re.IGNORECASE)

    # --- Collect files ---
    if not os.path.isdir(PAPERS_DIR):
        print(f"[CLEANUP] Folder '{PAPERS_DIR}' not found.")
        return {"status": "ok"}

    files = [os.path.join(PAPERS_DIR, fn) for fn in os.listdir(PAPERS_DIR) if fn.endswith(".json")]
    files.sort()
    total = len(files)
    print(f"[CLEANUP] Scanning {total} JSON files for '{term}' occurrences limited to references...")

    kept = 0
    deleted = 0
    empty_xml = 0

    for path in files:
        base = os.path.basename(path)
        try:
            # Load JSON record
            with open(path, "r", encoding="utf-8") as f:
                obj = json.load(f)

            xml_text = (obj.get("xml") or "").strip()
            title = (obj.get("title") or "").strip()

            if not xml_text:
                # If there is no XML at all, be conservative and keep it
                empty_xml += 1
                kept += 1
                continue

            # --- Parse JATS XML (minimal but robust) ---
            # We will (a) collect text inside <ref-list> and (b) collect text outside <ref-list>.
            try:
                root = ET.fromstring(xml_text)
            except Exception:
                # If parsing fails, keep the file (we cannot localize references safely).
                kept += 1
                continue

            # Helper: gather all text under an element
            def _all_text(el: ET.Element) -> str:
                parts = []
                for t in el.itertext():
                    parts.append(t)
                # normalize whitespace to avoid false negatives due to line breaks
                return re.sub(r"\s+", " ", " ".join(parts)).strip()

            # 1) Text inside all <ref-list> (may appear multiple times)
            ref_texts = []
            ref_nodes = []
            for el in root.iter():
                # tag can be namespaced: endswith("ref-list")
                if isinstance(el.tag, str) and el.tag.endswith("ref-list"):
                    ref_nodes.append(el)
                    ref_texts.append(_all_text(el))
            text_in_refs = " ".join(ref_texts)

            # 2) Text outside <ref-list>: clone-shallow removal by detaching ref-list nodes
            #    We remove each found ref-list node from its parent, then extract text.
            #    After extraction, we DO NOT write back — this is a throwaway tree for search.
            def _parent_of(root_el: ET.Element, node: ET.Element):
                for p in root_el.iter():
                    for c in list(p):
                        if c is node:
                            return p
                return None

            # Remove all ref-list nodes from a temporary working tree
            # (ElementTree does not support cheap deep copy; parse again for a clean root)
            try:
                work_root = ET.fromstring(xml_text)
            except Exception:
                # Fallback: if reparsing fails, reuse original root
                work_root = root

            to_remove = []
            for el in work_root.iter():
                if isinstance(el.tag, str) and el.tag.endswith("ref-list"):
                    to_remove.append(el)
            for node in to_remove:
                parent = _parent_of(work_root, node)
                if parent is not None:
                    parent.remove(node)

            text_outside_refs = _all_text(work_root)

            # Additionally check plain title string if present (cheap, high-signal)
            if title and title not in text_outside_refs:
                text_outside_refs = f"{title}. {text_outside_refs}".strip()

            # --- Decide: delete if ONLY in references ---
            has_outside = bool(term_re.search(text_outside_refs))
            has_inside = bool(term_re.search(text_in_refs))

            if has_inside and not has_outside:
                try:
                    os.remove(path)
                    deleted += 1
                    print(f"[CLEANUP][delete] {base} — '{term}' only in references.")
                except Exception as e:
                    # If deletion fails, keep and log
                    kept += 1
                    print(f"[CLEANUP][warn] failed to delete {base}: {e}")
            else:
                kept += 1
                # Optional verbose signal for borderline cases
                if has_outside:
                    print(f"[CLEANUP][keep] {base} — '{term}' found outside references.")
                elif not has_inside and not has_outside:
                    print(f"[CLEANUP][keep] {base} — '{term}' not found anywhere (after harvest filter).")

        except Exception as e:
            kept += 1
            print(f"[CLEANUP][skip] {base}: {e}")

    print(f"[CLEANUP] Done. total={total} deleted={deleted} kept={kept} empty_xml={empty_xml}")
    return {"status": "ok"}



# ============================================================================
# AGING THEORY ENDPOINTS
# ============================================================================

@app.get("/theories")
def list_theories(
    name: Optional[str] = None,
    confidence: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    List aging theories from research literature.
    
    Query params:
    - name: Filter by theory name (partial match, case-insensitive)
    - confidence: Filter by confidence level ('high', 'medium', 'low')
    - limit: Maximum number of theories to return
    - offset: Number of theories to skip (for pagination)
    
    Returns:
        List of theory objects with metadata
    """
    # Get theories based on filters
    if name:
        theories = theory_registry.search_theories(name)
    elif confidence:
        theories = theory_registry.filter_by_confidence(confidence)
    else:
        theories = theory_registry.get_all_theories()
    
    # Apply pagination
    total = len(theories)
    theories = theories[offset:offset + limit]
    
    # Format response
    results = []
    for theory in theories:
        results.append({
            "theory_id": theory.theory_id,
            "name": theory.mapped_name,
            "confidence": theory.confidence_is_theory,
            "paper_title": theory.paper_title,
            "pmid": theory.pmid,
            "doi": theory.doi,
            "key_concepts_count": len(theory.key_concepts),
            "concept_summary": theory.concept_summary
        })
    
    return {
        "theories": results,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@app.get("/theories/{theory_id}")
def get_theory_details(theory_id: str):
    """
    Get detailed information about a specific theory.
    
    Args:
        theory_id: The theory ID (e.g., 'T000002')
    
    Returns:
        Detailed theory information including all key concepts
    """
    theory = theory_registry.get_by_id(theory_id)
    
    if not theory:
        raise HTTPException(status_code=404, detail=f"Theory {theory_id} not found")
    
    return {
        "theory_id": theory.theory_id,
        "name": theory.mapped_name,
        "original_name": theory.original_name,
        "confidence": theory.confidence_is_theory,
        "mapping_confidence": theory.mapping_confidence,
        "key_concepts": [
            {
                "concept": kc.concept,
                "description": kc.description
            }
            for kc in theory.key_concepts
        ],
        "evidence": theory.evidence,
        "description": theory.description,
        "mode": theory.mode,
        "criteria_reasoning": theory.criteria_reasoning,
        "paper": {
            "title": theory.paper_title,
            "pmid": theory.pmid,
            "doi": theory.doi,
            "focus_score": theory.paper_focus
        },
        "enriched_text": theory.enriched_text
    }


@app.get("/theories/stats")
def get_theory_statistics():
    """
    Get statistics about the aging theory dataset.
    
    Returns:
        Statistics including total theories, unique names, top theories, etc.
    """
    return theory_registry.get_statistics()


@app.get("/theories/by-name/{theory_name}")
def get_theories_by_name(theory_name: str, limit: int = 50):
    """
    Get all papers/instances of a specific theory by name.
    
    Args:
        theory_name: The theory name (e.g., 'Cellular Senescence Theory')
        limit: Maximum number of instances to return
    
    Returns:
        List of all papers that discuss this theory
    """
    theories = theory_registry.get_by_name(theory_name)
    
    if not theories:
        raise HTTPException(status_code=404, detail=f"Theory '{theory_name}' not found")
    
    # Limit results
    theories = theories[:limit]
    
    results = []
    for theory in theories:
        results.append({
            "theory_id": theory.theory_id,
            "paper_title": theory.paper_title,
            "pmid": theory.pmid,
            "doi": theory.doi,
            "confidence": theory.confidence_is_theory,
            "paper_focus": theory.paper_focus,
            "key_concepts": [kc.concept for kc in theory.key_concepts]
        })
    
    return {
        "theory_name": theory_name,
        "total_papers": len(theories),
        "papers": results
    }


@app.get("/theories/by-paper/{pmid}")
def get_theories_by_paper(pmid: str):
    """
    Get all theories discussed in a specific paper.
    
    Args:
        pmid: PubMed ID of the paper
    
    Returns:
        List of theories found in this paper
    """
    theories = theory_registry.get_by_pmid(pmid)
    
    if not theories:
        raise HTTPException(status_code=404, detail=f"No theories found for PMID {pmid}")
    
    results = []
    for theory in theories:
        results.append({
            "theory_id": theory.theory_id,
            "name": theory.mapped_name,
            "confidence": theory.confidence_is_theory,
            "key_concepts": [kc.concept for kc in theory.key_concepts],
            "concept_summary": theory.concept_summary
        })
    
    return {
        "pmid": pmid,
        "paper_title": theories[0].paper_title if theories else "",
        "total_theories": len(theories),
        "theories": results
    }


@app.get("/theories/search")
def search_theories(q: str, limit: int = 50):
    """
    Search theories by name or concept.
    
    Query params:
    - q: Search query (searches in theory names and key concepts)
    - limit: Maximum number of results
    
    Returns:
        List of matching theories
    """
    theories = theory_registry.search_theories(q)
    
    # Limit results
    theories = theories[:limit]
    
    results = []
    for theory in theories:
        results.append({
            "theory_id": theory.theory_id,
            "name": theory.mapped_name,
            "confidence": theory.confidence_is_theory,
            "paper_title": theory.paper_title,
            "pmid": theory.pmid,
            "concept_summary": theory.concept_summary
        })
    
    return {
        "query": q,
        "total_results": len(results),
        "theories": results
    }


# ------- Start the server -------

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 Starting FastAPI server...")
    print("📊 Backend API: http://localhost:8000")
    print("📖 API Docs: http://localhost:8000/docs")
    print("="*60 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
