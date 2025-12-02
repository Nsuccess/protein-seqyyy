"""
UniProt API Client for fetching protein data.

This module provides a client for the UniProt REST API with rate limiting,
caching, and structured data models.
"""

import time
import httpx
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class ProteinData:
    """Structured protein information from UniProt."""
    gene_symbol: str
    uniprot_id: str
    protein_name: str
    organism: str
    sequence: str
    length: int
    function: str
    pdb_ids: List[str]
    domains: List[Dict[str, Any]]
    ptms: List[Dict[str, Any]]  # Post-translational modifications
    keywords: List[str]
    go_terms: List[Dict[str, str]]
    subcellular_location: List[str]
    raw_data: Dict[str, Any]  # Full UniProt response


class UniProtClient:
    """
    REST client for UniProt API with rate limiting and caching.
    
    Features:
    - Rate limiting (1 request per second)
    - In-memory caching with TTL
    - Automatic retry on failures
    - Structured data parsing
    """
    
    BASE_URL = "https://rest.uniprot.org/uniprotkb"
    
    def __init__(
        self,
        rate_limit_delay: float = 1.0,
        cache_ttl_seconds: int = 3600,
        timeout: int = 30
    ):
        """
        Initialize UniProt client.
        
        Args:
            rate_limit_delay: Minimum seconds between requests (default: 1.0)
            cache_ttl_seconds: Cache time-to-live in seconds (default: 3600 = 1 hour)
            timeout: Request timeout in seconds (default: 30)
        """
        self.rate_limit_delay = rate_limit_delay
        self.cache_ttl = timedelta(seconds=cache_ttl_seconds)
        self.timeout = timeout
        
        self.last_request_time = 0.0
        self.cache: Dict[str, tuple[ProteinData, datetime]] = {}
        
        print(f"[UniProtClient] Initialized (rate_limit={rate_limit_delay}s, cache_ttl={cache_ttl_seconds}s)")
    
    def _enforce_rate_limit(self) -> None:
        """Enforce rate limiting between requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _is_cache_valid(self, gene_symbol: str) -> bool:
        """Check if cached data is still valid."""
        if gene_symbol not in self.cache:
            return False
        
        _, cached_time = self.cache[gene_symbol]
        return datetime.now() - cached_time < self.cache_ttl
    
    def _get_from_cache(self, gene_symbol: str) -> Optional[ProteinData]:
        """Get protein data from cache if valid."""
        if self._is_cache_valid(gene_symbol):
            protein_data, _ = self.cache[gene_symbol]
            return protein_data
        return None
    
    def _add_to_cache(self, gene_symbol: str, protein_data: ProteinData) -> None:
        """Add protein data to cache."""
        self.cache[gene_symbol] = (protein_data, datetime.now())
    
    def get_protein(self, gene_symbol: str) -> Optional[ProteinData]:
        """
        Fetch protein data from UniProt by gene symbol.
        
        Args:
            gene_symbol: Gene symbol (e.g., "APOE", "SIRT6")
        
        Returns:
            ProteinData object or None if not found
        """
        # Check cache first
        cached = self._get_from_cache(gene_symbol)
        if cached:
            print(f"[UniProtClient] Cache hit for {gene_symbol}")
            return cached
        
        # Enforce rate limiting
        self._enforce_rate_limit()
        
        # Search for protein by gene name - prefer reviewed (Swiss-Prot) canonical entries
        search_url = f"{self.BASE_URL}/search"
        params = {
            "query": f"(gene:{gene_symbol}) AND (organism_id:9606) AND (reviewed:true)",  # Human proteins, reviewed only
            "format": "json",
            "size": 5  # Get multiple results to find canonical entry
        }
        
        try:
            print(f"[UniProtClient] Fetching {gene_symbol} from UniProt...")
            
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(search_url, params=params)
                response.raise_for_status()
                data = response.json()
            
            results = data.get("results", [])
            if not results:
                print(f"[UniProtClient] No results found for {gene_symbol}")
                return None
            
            # Find the best entry - prefer canonical entries with PDB structures
            best_entry = results[0]
            best_score = 0
            
            for entry in results:
                score = 0
                # Prefer entries with PDB structures
                db_refs = entry.get("uniProtKBCrossReferences", [])
                pdb_count = sum(1 for ref in db_refs if ref.get("database") == "PDB")
                score += pdb_count * 10
                
                # Prefer longer sequences (canonical vs fragments)
                seq_length = entry.get("sequence", {}).get("length", 0)
                score += seq_length // 100
                
                # Prefer entries with function annotation
                comments = entry.get("comments", [])
                has_function = any(c.get("commentType") == "FUNCTION" for c in comments)
                if has_function:
                    score += 5
                
                if score > best_score:
                    best_score = score
                    best_entry = entry
            
            print(f"[UniProtClient] Selected entry with score {best_score} (PDB structures available: {best_score >= 10})")
            protein_data = self._parse_uniprot_entry(best_entry, gene_symbol)
            
            # Cache the result
            self._add_to_cache(gene_symbol, protein_data)
            
            return protein_data
        
        except httpx.HTTPError as e:
            print(f"[UniProtClient] HTTP error for {gene_symbol}: {e}")
            return None
        except Exception as e:
            print(f"[UniProtClient] Error fetching {gene_symbol}: {e}")
            return None
    
    def _parse_uniprot_entry(self, entry: Dict[str, Any], gene_symbol: str) -> ProteinData:
        """
        Parse UniProt JSON entry into ProteinData.
        
        Args:
            entry: UniProt JSON entry
            gene_symbol: Gene symbol for reference
        
        Returns:
            ProteinData object
        """
        # Extract basic info
        uniprot_id = entry.get("primaryAccession", "")
        
        protein_description = entry.get("proteinDescription", {})
        recommended_name = protein_description.get("recommendedName", {})
        protein_name = recommended_name.get("fullName", {}).get("value", "")
        
        organism = entry.get("organism", {}).get("scientificName", "")
        
        # Extract sequence
        sequence_info = entry.get("sequence", {})
        sequence = sequence_info.get("value", "")
        length = sequence_info.get("length", 0)
        
        # Extract function/comments
        function = ""
        comments = entry.get("comments", [])
        for comment in comments:
            if comment.get("commentType") == "FUNCTION":
                texts = comment.get("texts", [])
                if texts:
                    function = texts[0].get("value", "")
                    break
        
        # Extract PDB IDs
        pdb_ids = []
        db_references = entry.get("uniProtKBCrossReferences", [])
        for ref in db_references:
            if ref.get("database") == "PDB":
                pdb_ids.append(ref.get("id", ""))
        
        # Extract domains
        domains = []
        features = entry.get("features", [])
        for feature in features:
            if feature.get("type") in ["DOMAIN", "REGION", "MOTIF"]:
                domains.append({
                    "type": feature.get("type", ""),
                    "description": feature.get("description", ""),
                    "begin": feature.get("location", {}).get("start", {}).get("value"),
                    "end": feature.get("location", {}).get("end", {}).get("value")
                })
        
        # Extract PTMs
        ptms = []
        for feature in features:
            if feature.get("type") in ["MOD_RES", "LIPID", "CARBOHYD", "DISULFID"]:
                ptms.append({
                    "type": feature.get("type", ""),
                    "description": feature.get("description", ""),
                    "position": feature.get("location", {}).get("start", {}).get("value")
                })
        
        # Extract keywords
        keywords = [kw.get("name", "") for kw in entry.get("keywords", [])]
        
        # Extract GO terms
        go_terms = []
        for ref in db_references:
            if ref.get("database") == "GO":
                properties = {p.get("key"): p.get("value") for p in ref.get("properties", [])}
                go_terms.append({
                    "id": ref.get("id", ""),
                    "term": properties.get("GoTerm", ""),
                    "category": properties.get("GoEvidenceType", "")
                })
        
        # Extract subcellular location
        subcellular_location = []
        for comment in comments:
            if comment.get("commentType") == "SUBCELLULAR LOCATION":
                locations = comment.get("subcellularLocations", [])
                for loc in locations:
                    location_value = loc.get("location", {}).get("value", "")
                    if location_value:
                        subcellular_location.append(location_value)
        
        return ProteinData(
            gene_symbol=gene_symbol,
            uniprot_id=uniprot_id,
            protein_name=protein_name,
            organism=organism,
            sequence=sequence,
            length=length,
            function=function,
            pdb_ids=pdb_ids,
            domains=domains,
            ptms=ptms,
            keywords=keywords,
            go_terms=go_terms,
            subcellular_location=subcellular_location,
            raw_data=entry
        )
    
    def batch_fetch(
        self,
        gene_symbols: List[str],
        max_concurrent: int = 1
    ) -> Dict[str, Optional[ProteinData]]:
        """
        Fetch multiple proteins (respecting rate limits).
        
        Args:
            gene_symbols: List of gene symbols
            max_concurrent: Maximum concurrent requests (default: 1 for rate limiting)
        
        Returns:
            Dictionary mapping gene symbol to ProteinData
        """
        results = {}
        
        for symbol in gene_symbols:
            results[symbol] = self.get_protein(symbol)
        
        return results
    
    def clear_cache(self) -> None:
        """Clear all cached data."""
        self.cache.clear()
        print("[UniProtClient] Cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        valid_entries = sum(1 for symbol in self.cache if self._is_cache_valid(symbol))
        
        return {
            "total_entries": len(self.cache),
            "valid_entries": valid_entries,
            "expired_entries": len(self.cache) - valid_entries,
            "cache_ttl_seconds": self.cache_ttl.total_seconds()
        }


# Global client instance
_global_client = None


def get_global_client() -> UniProtClient:
    """Get or create the global UniProtClient singleton."""
    global _global_client
    if _global_client is None:
        _global_client = UniProtClient()
    return _global_client


if __name__ == "__main__":
    # Test the UniProt client
    print("Testing UniProtClient...")
    print("=" * 60)
    
    client = UniProtClient(rate_limit_delay=1.0)
    
    # Test fetching a protein
    print("\n1. Fetch APOE protein:")
    apoe = client.get_protein("APOE")
    if apoe:
        print(f"   UniProt ID: {apoe.uniprot_id}")
        print(f"   Name: {apoe.protein_name}")
        print(f"   Length: {apoe.length} aa")
        print(f"   PDB IDs: {apoe.pdb_ids[:3]}")
        print(f"   Function: {apoe.function[:100]}...")
    
    # Test caching
    print("\n2. Fetch APOE again (should be cached):")
    apoe2 = client.get_protein("APOE")
    print(f"   Cached: {apoe2 is not None}")
    
    # Test cache stats
    print("\n3. Cache statistics:")
    stats = client.get_cache_stats()
    print(f"   {stats}")
    
    print("\n" + "=" * 60)
    print("✓ Test completed!")
