"""
Extract PMID/PMCID from source_url and update NeonDB.
source_url format: https://europepmc.org/article/MED/10022120 (PMID)
                   https://europepmc.org/article/PMC/PMC84026 (PMCID)
"""
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
import psycopg2

load_dotenv("backend/.env")

CORPUS_DIR = Path("data/corpus")

def extract_ids_from_url(source_url: str) -> tuple:
    """Extract PMID and PMCID from source_url."""
    pmid = ""
    pmcid = ""
    
    if not source_url:
        return pmid, pmcid
    
    # Match MED/12345678 for PMID
    med_match = re.search(r'/MED/(\d+)', source_url)
    if med_match:
        pmid = med_match.group(1)
    
    # Match PMC/PMC12345 for PMCID
    pmc_match = re.search(r'/PMC/(PMC\d+)', source_url)
    if pmc_match:
        pmcid = pmc_match.group(1)
    
    return pmid, pmcid

def build_title_to_ids_map() -> dict:
    """Build mapping from title -> (pmid, pmcid) from corpus files."""
    title_map = {}
    
    for f in CORPUS_DIR.glob("*.json"):
        try:
            with open(f, encoding='utf-8') as fp:
                data = json.load(fp)
            
            title = data.get("title", "").strip()
            source_url = data.get("source_url", "")
            
            if title:
                pmid, pmcid = extract_ids_from_url(source_url)
                if pmid or pmcid:
                    title_map[title] = (pmid, pmcid)
        except Exception as e:
            pass
    
    return title_map

def update_neondb(title_map: dict):
    """Update NeonDB with extracted PMIDs/PMCIDs."""
    conn_string = os.getenv("NEON_DATABASE_URL")
    if not conn_string:
        print("ERROR: NEON_DATABASE_URL not set")
        return
    
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()
    
    updated = 0
    for title, (pmid, pmcid) in title_map.items():
        cur.execute("""
            UPDATE paper_chunks 
            SET pmid = %s, pmcid = %s 
            WHERE title = %s AND (pmid IS NULL OR pmid = '' OR pmcid IS NULL OR pmcid = '')
        """, (pmid, pmcid, title))
        updated += cur.rowcount
    
    conn.commit()
    cur.close()
    conn.close()
    
    return updated

def main():
    print("Building title -> ID map from corpus...")
    title_map = build_title_to_ids_map()
    
    pmid_count = sum(1 for _, (pmid, _) in title_map.items() if pmid)
    pmcid_count = sum(1 for _, (_, pmcid) in title_map.items() if pmcid)
    
    print(f"Found {len(title_map)} papers with IDs:")
    print(f"  - {pmid_count} with PMID")
    print(f"  - {pmcid_count} with PMCID")
    
    print("\nUpdating NeonDB...")
    updated = update_neondb(title_map)
    print(f"Updated {updated} chunks in NeonDB")

if __name__ == "__main__":
    main()
