"""
Batch update PMIDs in NeonDB - more efficient version.
"""
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_batch

load_dotenv("backend/.env")

CORPUS_DIR = Path("data/corpus")

def extract_ids_from_url(source_url: str) -> tuple:
    """Extract PMID and PMCID from source_url."""
    pmid = ""
    pmcid = ""
    
    if not source_url:
        return pmid, pmcid
    
    med_match = re.search(r'/MED/(\d+)', source_url)
    if med_match:
        pmid = med_match.group(1)
    
    pmc_match = re.search(r'/PMC/(PMC\d+)', source_url)
    if pmc_match:
        pmcid = pmc_match.group(1)
    
    return pmid, pmcid

def main():
    conn_string = os.getenv("NEON_DATABASE_URL")
    if not conn_string:
        print("ERROR: NEON_DATABASE_URL not set")
        return
    
    print("Scanning corpus for IDs...")
    updates = []
    
    for f in CORPUS_DIR.glob("*.json"):
        try:
            with open(f, encoding='utf-8') as fp:
                data = json.load(fp)
            
            title = data.get("title", "").strip()
            source_url = data.get("source_url", "")
            
            if title:
                pmid, pmcid = extract_ids_from_url(source_url)
                if pmid or pmcid:
                    updates.append((pmid, pmcid, title))
        except:
            pass
    
    print(f"Found {len(updates)} papers with IDs to update")
    
    print("Connecting to NeonDB...")
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()
    
    print("Updating in batches...")
    batch_size = 500
    total_updated = 0
    
    for i in range(0, len(updates), batch_size):
        batch = updates[i:i+batch_size]
        execute_batch(cur, """
            UPDATE paper_chunks 
            SET pmid = %s, pmcid = %s 
            WHERE title = %s
        """, batch)
        total_updated += len(batch)
        print(f"  Progress: {total_updated}/{len(updates)}")
    
    conn.commit()
    
    # Verify
    cur.execute("SELECT COUNT(*) FROM paper_chunks WHERE pmid != '' OR pmcid != ''")
    updated_count = cur.fetchone()[0]
    print(f"\nChunks with IDs after update: {updated_count}")
    
    cur.close()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    main()
