"""
Statistics Service for computing and caching dataset metrics.

This module provides comprehensive statistics about the indexed corpus including
coverage, theory distribution, and quality metrics for visualization.
"""

import json
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime
from collections import Counter


class StatisticsService:
    """
    Compute and cache statistics about the indexed corpus.
    
    Provides visualization-ready data for:
    - Coverage statistics (proteins with papers)
    - Theory distribution across papers
    - Quality metrics (publication years, citation patterns)
    """
    
    def __init__(
        self,
        metadata_path: str = "backend/faiss_store/meta.jsonl",
        indexing_stats_path: str = "backend/faiss_store/indexing_stats.json"
    ):
        """
        Initialize statistics service.
        
        Args:
            metadata_path: Path to FAISS metadata JSONL
            indexing_stats_path: Path to indexing statistics JSON
        """
        # Handle paths relative to project root
        self.metadata_path = Path(metadata_path)
        if not self.metadata_path.exists():
            self.metadata_path = Path(__file__).parent.parent / metadata_path
        
        self.indexing_stats_path = Path(indexing_stats_path)
        if not self.indexing_stats_path.exists():
            self.indexing_stats_path = Path(__file__).parent.parent / indexing_stats_path
        self._cache: Dict[str, tuple[Any, datetime]] = {}
        self._cache_ttl_seconds = 300  # 5 minutes
        
        print("[StatisticsService] Initialized")
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid."""
        if key not in self._cache:
            return False
        _, cached_time = self._cache[key]
        age = (datetime.now() - cached_time).total_seconds()
        return age < self._cache_ttl_seconds
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get data from cache if valid."""
        if self._is_cache_valid(key):
            data, _ = self._cache[key]
            return data
        return None
    
    def _add_to_cache(self, key: str, data: Any) -> None:
        """Add data to cache."""
        self._cache[key] = (data, datetime.now())
    
    def _load_metadata(self) -> List[Dict[str, Any]]:
        """Load all metadata entries from JSONL."""
        if not self.metadata_path.exists():
            return []
        
        metadata = []
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        metadata.append(json.loads(line))
                    except:
                        continue
        return metadata
    
    def _load_indexing_stats(self) -> Dict[str, Any]:
        """Load indexing statistics from JSON."""
        if not self.indexing_stats_path.exists():
            return {}
        
        try:
            with open(self.indexing_stats_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}
    
    def compute_coverage_statistics(self) -> Dict[str, Any]:
        """
        Compute protein coverage statistics.
        
        Returns:
            Visualization-ready coverage data including:
            - Total proteins in GenAge
            - Proteins with papers
            - Coverage percentage
            - Top proteins by paper count
            - Coverage by category
        """
        cache_key = "coverage"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        # Load indexing stats
        indexing_stats = self._load_indexing_stats()
        
        # Get protein statistics
        protein_stats = indexing_stats.get("proteins", {})
        unique_proteins = protein_stats.get("unique_proteins_found", [])
        protein_distribution = protein_stats.get("protein_distribution", {})
        
        total_genage_proteins = 307  # From GenAge
        proteins_with_papers = len(unique_proteins)
        coverage_percentage = (proteins_with_papers / total_genage_proteins * 100) if total_genage_proteins > 0 else 0
        
        # Top proteins by paper count
        top_proteins = sorted(
            protein_distribution.items(),
            key=lambda x: x[1],
            reverse=True
        )[:20]
        
        result = {
            "total_genage_proteins": total_genage_proteins,
            "proteins_with_papers": proteins_with_papers,
            "proteins_without_papers": total_genage_proteins - proteins_with_papers,
            "coverage_percentage": round(coverage_percentage, 2),
            "top_proteins": [
                {"protein": p, "paper_count": count}
                for p, count in top_proteins
            ],
            "distribution_summary": {
                "proteins_with_1_paper": sum(1 for c in protein_distribution.values() if c == 1),
                "proteins_with_2_5_papers": sum(1 for c in protein_distribution.values() if 2 <= c <= 5),
                "proteins_with_6_10_papers": sum(1 for c in protein_distribution.values() if 6 <= c <= 10),
                "proteins_with_11_plus_papers": sum(1 for c in protein_distribution.values() if c > 10)
            },
            "total_protein_mentions": protein_stats.get("total_protein_mentions", 0),
            "papers_with_proteins": protein_stats.get("papers_with_proteins", 0)
        }
        
        self._add_to_cache(cache_key, result)
        return result
    
    def compute_theory_statistics(self) -> Dict[str, Any]:
        """
        Compute aging theory distribution statistics.
        
        Returns:
            Visualization-ready theory data including:
            - Theory distribution across papers
            - Papers per theory
            - Theory co-occurrence
            - Most common theory combinations
        """
        cache_key = "theories"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        # Load indexing stats
        indexing_stats = self._load_indexing_stats()
        
        # Get theory statistics
        theory_stats = indexing_stats.get("theories", {})
        theory_distribution = theory_stats.get("theory_distribution", {})
        papers_with_theories = theory_stats.get("papers_with_theories", 0)
        
        # Sort theories by paper count
        sorted_theories = sorted(
            theory_distribution.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Calculate percentages
        total_papers = indexing_stats.get("total_documents_indexed", 1)
        
        result = {
            "total_papers": total_papers,
            "papers_with_theories": papers_with_theories,
            "papers_without_theories": total_papers - papers_with_theories,
            "coverage_percentage": round((papers_with_theories / total_papers * 100) if total_papers > 0 else 0, 2),
            "theories_identified": len(theory_distribution),
            "theory_distribution": [
                {
                    "theory": theory,
                    "paper_count": count,
                    "percentage": round((count / total_papers * 100) if total_papers > 0 else 0, 2)
                }
                for theory, count in sorted_theories
            ],
            "top_5_theories": [
                {"theory": theory, "paper_count": count}
                for theory, count in sorted_theories[:5]
            ]
        }
        
        self._add_to_cache(cache_key, result)
        return result
    
    def compute_quality_metrics(self) -> Dict[str, Any]:
        """
        Compute data quality metrics.
        
        Returns:
            Visualization-ready quality data including:
            - Publication year distribution
            - Papers by decade
            - Recent vs older papers
            - Data completeness metrics
        """
        cache_key = "quality"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        # Load metadata to analyze
        metadata = self._load_metadata()
        
        if not metadata:
            return {
                "total_papers": 0,
                "message": "No metadata available. Please run indexing first."
            }
        
        # Extract years and analyze
        years = []
        papers_with_year = 0
        papers_with_pmcid = 0
        papers_with_doi = 0
        papers_with_title = 0
        
        for entry in metadata:
            meta = entry.get("meta", {})
            
            # Year analysis
            year = meta.get("year", 0)
            if isinstance(year, str):
                try:
                    year = int(year)
                except:
                    year = 0
            
            if year and year > 1900 and year <= 2025:
                years.append(year)
                papers_with_year += 1
            
            # Completeness analysis
            if meta.get("pmcid"):
                papers_with_pmcid += 1
            if meta.get("doi"):
                papers_with_doi += 1
            if meta.get("title"):
                papers_with_title += 1
        
        total_papers = len(metadata)
        
        # Year distribution
        year_counts = Counter(years)
        year_distribution = sorted(
            [{"year": year, "count": count} for year, count in year_counts.items()],
            key=lambda x: x["year"]
        )
        
        # Decade distribution
        decade_counts = Counter((year // 10) * 10 for year in years)
        decade_distribution = sorted(
            [{"decade": f"{decade}s", "count": count} for decade, count in decade_counts.items()],
            key=lambda x: x["decade"]
        )
        
        # Recent papers (last 5 years)
        current_year = datetime.now().year
        recent_papers = sum(1 for year in years if year >= current_year - 5)
        
        # Calculate median year
        median_year = sorted(years)[len(years) // 2] if years else 0
        
        result = {
            "total_papers": total_papers,
            "papers_with_year": papers_with_year,
            "year_coverage_percentage": round((papers_with_year / total_papers * 100) if total_papers > 0 else 0, 2),
            "year_range": {
                "earliest": min(years) if years else None,
                "latest": max(years) if years else None,
                "median": median_year
            },
            "recent_papers": {
                "last_5_years": recent_papers,
                "percentage": round((recent_papers / total_papers * 100) if total_papers > 0 else 0, 2)
            },
            "year_distribution": year_distribution,
            "decade_distribution": decade_distribution,
            "completeness": {
                "pmcid": {
                    "count": papers_with_pmcid,
                    "percentage": round((papers_with_pmcid / total_papers * 100) if total_papers > 0 else 0, 2)
                },
                "doi": {
                    "count": papers_with_doi,
                    "percentage": round((papers_with_doi / total_papers * 100) if total_papers > 0 else 0, 2)
                },
                "title": {
                    "count": papers_with_title,
                    "percentage": round((papers_with_title / total_papers * 100) if total_papers > 0 else 0, 2)
                }
            }
        }
        
        self._add_to_cache(cache_key, result)
        return result
    
    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """
        Get all statistics in one call.
        
        Returns:
            Combined coverage, theory, and quality statistics
        """
        return {
            "coverage": self.compute_coverage_statistics(),
            "theories": self.compute_theory_statistics(),
            "quality": self.compute_quality_metrics(),
            "generated_at": datetime.now().isoformat()
        }
    
    def clear_cache(self) -> None:
        """Clear all cached statistics."""
        self._cache.clear()
        print("[StatisticsService] Cache cleared")


# Global service instance
_global_service = None


def get_global_service() -> StatisticsService:
    """Get or create the global StatisticsService singleton."""
    global _global_service
    if _global_service is None:
        _global_service = StatisticsService()
    return _global_service


if __name__ == "__main__":
    print("Testing StatisticsService...")
    print("=" * 60)
    
    service = StatisticsService()
    
    print("\n1. Coverage Statistics:")
    coverage = service.compute_coverage_statistics()
    print(f"   Proteins with papers: {coverage.get('proteins_with_papers', 0)}/{coverage.get('total_genage_proteins', 0)}")
    print(f"   Coverage: {coverage.get('coverage_percentage', 0)}%")
    
    print("\n2. Theory Statistics:")
    theories = service.compute_theory_statistics()
    print(f"   Papers with theories: {theories.get('papers_with_theories', 0)}/{theories.get('total_papers', 0)}")
    print(f"   Theories identified: {theories.get('theories_identified', 0)}")
    
    print("\n3. Quality Metrics:")
    quality = service.compute_quality_metrics()
    print(f"   Total papers: {quality.get('total_papers', 0)}")
    print(f"   Year range: {quality.get('year_range', {})}")
    
    print("\n" + "=" * 60)
    print("✓ Test completed!")
