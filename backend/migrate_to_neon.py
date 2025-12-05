"""
Migration script: ChromaDB → NeonDB (pgvector)

Exports all vectors from ChromaDB and imports them into NeonDB.
Run this once when switching to production.

Usage:
    python migrate_to_neon.py

Environment:
    NEON_DATABASE_URL - NeonDB connection string (required)
"""

import os
import sys
import json
import chromadb
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from neon_vector_store import NeonVectorStore, VectorChunk


def migrate_chroma_to_neon(
    chroma_path: str = "./chroma_store",
    collection_name: str = "longevity_papers",
    batch_size: int = 100
):
    """
    Migrate all data from ChromaDB to NeonDB.
    
    Args:
        chroma_path: Path to ChromaDB storage
        collection_name: Name of ChromaDB collection
        batch_size: Number of records per batch
    """
    # Check NeonDB connection
    neon_url = os.getenv("NEON_DATABASE_URL")
    if not neon_url:
        print("ERROR: NEON_DATABASE_URL environment variable not set")
        print("Get a free database at: https://neon.tech")
        sys.exit(1)
    
    # Connect to ChromaDB
    print(f"[Migration] Connecting to ChromaDB: {chroma_path}")
    chroma_client = chromadb.PersistentClient(path=chroma_path)
    
    try:
        collection = chroma_client.get_collection(name=collection_name)
    except Exception as e:
        print(f"ERROR: Could not find collection '{collection_name}': {e}")
        sys.exit(1)
    
    total_count = collection.count()
    print(f"[Migration] Found {total_count} vectors in ChromaDB")
    
    if total_count == 0:
        print("ERROR: No vectors to migrate")
        sys.exit(1)
    
    # Connect to NeonDB
    print("[Migration] Connecting to NeonDB...")
    neon_store = NeonVectorStore(connection_string=neon_url)
    
    # Check if NeonDB already has data
    existing_count = neon_store.count()
    if existing_count > 0:
        if existing_count >= total_count:
            print(f"[Migration] NeonDB already has {existing_count} vectors (complete!)")
            print("[Migration] Creating index if needed...")
            neon_store.create_index()
            print("[Migration] Done!")
            sys.exit(0)
        
        print(f"[Migration] NeonDB has {existing_count}/{total_count} vectors (partial migration)")
        print("[Migration] Auto-continuing from where it left off...")
        # Skip already migrated vectors by adjusting offset
        # The ON CONFLICT handles duplicates, so we just continue
    
    # Export from ChromaDB in batches
    print(f"[Migration] Exporting from ChromaDB in batches of {batch_size}...")
    
    migrated = 0
    offset = 0
    
    while offset < total_count:
        # Get batch from ChromaDB
        results = collection.get(
            limit=batch_size,
            offset=offset,
            include=["documents", "metadatas", "embeddings"]
        )
        
        if not results['ids']:
            break
        
        # Convert to VectorChunk objects
        chunks = []
        for i, chunk_id in enumerate(results['ids']):
            text = results['documents'][i] if results['documents'] is not None else ""
            embedding = results['embeddings'][i] if results['embeddings'] is not None else []
            # Convert numpy array to list if needed
            if hasattr(embedding, 'tolist'):
                embedding = embedding.tolist()
            metadata = results['metadatas'][i] if results['metadatas'] is not None else {}
            
            # Parse JSON fields in metadata
            proteins = metadata.get("proteins_mentioned", "[]")
            if isinstance(proteins, str):
                try:
                    proteins = json.loads(proteins)
                except:
                    proteins = []
            
            theories = metadata.get("aging_theories", "[]")
            if isinstance(theories, str):
                try:
                    theories = json.loads(theories)
                except:
                    theories = []
            
            chunks.append(VectorChunk(
                id=chunk_id,
                text=text,
                embedding=embedding,
                metadata={
                    "pmcid": metadata.get("pmcid", ""),
                    "pmid": metadata.get("pmid", ""),
                    "title": metadata.get("title", ""),
                    "year": int(metadata.get("year", 0)) if metadata.get("year") else 0,
                    "proteins_mentioned": proteins,
                    "aging_theories": theories,
                    "chunk_index": int(metadata.get("chunk_index", 0)) if metadata.get("chunk_index") else 0
                }
            ))
        
        # Import to NeonDB
        neon_store.add_chunks(chunks, batch_size=batch_size)
        
        migrated += len(chunks)
        offset += batch_size
        
        print(f"[Migration] Progress: {migrated}/{total_count} ({100*migrated/total_count:.1f}%)")
    
    # Create search index after data is loaded
    print("\n[Migration] Creating search index...")
    neon_store.create_index()
    
    # Verify migration
    final_count = neon_store.count()
    print(f"\n[Migration] Complete!")
    print(f"  ChromaDB vectors: {total_count}")
    print(f"  NeonDB vectors:   {final_count}")
    
    if final_count == total_count:
        print("  ✓ All vectors migrated successfully")
    else:
        print(f"  ⚠ Warning: {total_count - final_count} vectors may have failed")
    
    # Show stats
    stats = neon_store.get_stats()
    print(f"\n[NeonDB Stats]")
    print(f"  Total chunks: {stats['total_chunks']}")
    print(f"  Unique papers: {stats['unique_papers']}")
    print(f"  Year range: {stats['min_year']} - {stats['max_year']}")
    
    print("\n[Next Steps]")
    print("1. Update your .env file:")
    print("   VECTOR_STORE_MODE=neon")
    print("   NEON_DATABASE_URL=<your-connection-string>")
    print("2. Restart the backend server")
    print("3. Test with: curl -X POST 'http://localhost:8000/query/rag?query=APOE+aging'")


if __name__ == "__main__":
    migrate_chroma_to_neon()
