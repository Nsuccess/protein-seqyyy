"""Check ChromaDB metadata."""
import chromadb

client = chromadb.PersistentClient(path='backend/chroma_store')
collection = client.get_collection('longevity_papers')
results = collection.get(limit=5, include=['metadatas'])

print("=== ChromaDB Sample Metadata ===")
for i, meta in enumerate(results['metadatas']):
    pmcid = meta.get("pmcid", "N/A")
    title = str(meta.get("title", "N/A"))[:50]
    print(f"Chunk {i}: pmcid='{pmcid}', title='{title}...'")
