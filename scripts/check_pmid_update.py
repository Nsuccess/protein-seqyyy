"""Check if PMIDs were updated in NeonDB."""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("backend/.env")

conn = psycopg2.connect(os.getenv("NEON_DATABASE_URL"))
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM paper_chunks WHERE pmid IS NOT NULL AND pmid != ''")
print(f"Chunks with PMID: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM paper_chunks WHERE pmcid IS NOT NULL AND pmcid != ''")
print(f"Chunks with PMCID: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM paper_chunks")
print(f"Total chunks: {cur.fetchone()[0]}")

# Sample
cur.execute("SELECT title, pmid, pmcid FROM paper_chunks WHERE pmid != '' LIMIT 3")
print("\nSample with PMID:")
for row in cur.fetchall():
    print(f"  {row[0][:50]}... PMID={row[1]}, PMCID={row[2]}")

cur.close()
conn.close()
