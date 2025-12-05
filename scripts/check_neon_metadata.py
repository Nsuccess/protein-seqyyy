"""Check what metadata is stored in NeonDB."""
import os
from dotenv import load_dotenv
load_dotenv()

import psycopg2
from psycopg2.extras import RealDictCursor

conn_string = os.getenv("NEON_DATABASE_URL")
if not conn_string:
    print("ERROR: NEON_DATABASE_URL not set")
    exit(1)

conn = psycopg2.connect(conn_string)
cur = conn.cursor(cursor_factory=RealDictCursor)

# Check sample of metadata
print("=== Sample of 5 chunks ===")
cur.execute("SELECT id, pmcid, pmid, title, year FROM paper_chunks LIMIT 5")
for row in cur.fetchall():
    print(f"  ID: {row['id'][:30]}...")
    print(f"  PMCID: '{row['pmcid']}'")
    print(f"  Title: {row['title'][:60] if row['title'] else 'None'}...")
    print(f"  Year: {row['year']}")
    print()

# Check distinct PMCIDs
print("=== PMCID Distribution ===")
cur.execute("SELECT pmcid, COUNT(*) as cnt FROM paper_chunks GROUP BY pmcid ORDER BY cnt DESC LIMIT 10")
for row in cur.fetchall():
    print(f"  '{row['pmcid']}': {row['cnt']} chunks")

# Check if pmcid is empty
cur.execute("SELECT COUNT(*) FROM paper_chunks WHERE pmcid IS NULL OR pmcid = ''")
empty_count = cur.fetchone()['count']
print(f"\nChunks with empty PMCID: {empty_count}")

cur.close()
conn.close()
