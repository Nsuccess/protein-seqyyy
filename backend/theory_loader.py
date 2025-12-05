"""
Aging Theory data loader and registry.

This module provides functionality to load and manage aging theories
extracted from research papers.
"""

import json
from typing import Dict, List, Optional, Set
from dataclasses import dataclass
from pathlib import Path
from collections import defaultdict


@dataclass
class TheoryKeyConcept:
    """Represents a key concept within an aging theory."""
    concept: str
    description: str


@dataclass
class AgingTheory:
    """Represents an aging theory from research literature."""
    theory_id: str
    original_name: str
    normalized_name: str
    mapped_name: str
    mapping_confidence: float
    confidence_is_theory: str  # 'high', 'medium', 'low'
    key_concepts: List[TheoryKeyConcept]
    description: str
    evidence: str
    mode: str
    criteria_reasoning: str
    paper_focus: int
    doi: str
    pmid: str
    paper_title: str
    enriched_text: str
    concept_text: str
    
    @property
    def concept_summary(self) -> str:
        """Get a brief summary of key concepts."""
        return " | ".join([kc.concept for kc in self.key_concepts[:3]])


class TheoryRegistry:
    """
    In-memory registry for fast lookups of aging theories.
    
    Provides efficient access to theory data by ID, name, or paper.
    """
    
    def __init__(self):
        self.theories: Dict[str, AgingTheory] = {}  # theory_id -> theory
        self.by_name: Dict[str, List[AgingTheory]] = defaultdict(list)  # mapped_name -> theories
        self.by_pmid: Dict[str, List[AgingTheory]] = defaultdict(list)  # pmid -> theories
        self.by_doi: Dict[str, List[AgingTheory]] = defaultdict(list)  # doi -> theories
        self.all_theory_names: Set[str] = set()
        self.metadata: Dict = {}
        
    def add_theory(self, theory: AgingTheory) -> None:
        """Add a theory to the registry."""
        self.theories[theory.theory_id] = theory
        self.by_name[theory.mapped_name].append(theory)
        if theory.pmid:
            self.by_pmid[theory.pmid].append(theory)
        if theory.doi:
            self.by_doi[theory.doi].append(theory)
        self.all_theory_names.add(theory.mapped_name)
    
    def get_by_id(self, theory_id: str) -> Optional[AgingTheory]:
        """Get theory by ID."""
        return self.theories.get(theory_id)
    
    def get_by_name(self, name: str) -> List[AgingTheory]:
        """Get all theories with a given name (case-insensitive)."""
        # Try exact match first
        if name in self.by_name:
            return self.by_name[name]
        
        # Try case-insensitive match
        name_lower = name.lower()
        for key, theories in self.by_name.items():
            if key.lower() == name_lower:
                return theories
        return []
    
    def get_by_pmid(self, pmid: str) -> List[AgingTheory]:
        """Get all theories from a paper by PMID."""
        return self.by_pmid.get(pmid, [])
    
    def get_by_doi(self, doi: str) -> List[AgingTheory]:
        """Get all theories from a paper by DOI."""
        return self.by_doi.get(doi, [])
    
    def get_all_theory_names(self) -> List[str]:
        """Get all unique theory names sorted alphabetically."""
        return sorted(self.all_theory_names)
    
    def get_all_theories(self) -> List[AgingTheory]:
        """Get all theories sorted by theory_id."""
        return sorted(self.theories.values(), key=lambda t: t.theory_id)
    
    def filter_by_confidence(self, confidence: str) -> List[AgingTheory]:
        """Filter theories by confidence level."""
        return [t for t in self.theories.values() if t.confidence_is_theory == confidence]
    
    def search_theories(self, query: str) -> List[AgingTheory]:
        """Search theories by name or concept (case-insensitive)."""
        query_lower = query.lower()
        results = []
        seen_ids = set()
        
        for theory in self.theories.values():
            if theory.theory_id in seen_ids:
                continue
                
            # Search in name
            if query_lower in theory.mapped_name.lower():
                results.append(theory)
                seen_ids.add(theory.theory_id)
                continue
            
            # Search in concepts
            for concept in theory.key_concepts:
                if query_lower in concept.concept.lower() or query_lower in concept.description.lower():
                    results.append(theory)
                    seen_ids.add(theory.theory_id)
                    break
        
        return results
    
    def count(self) -> int:
        """Return total number of theories in registry."""
        return len(self.theories)
    
    def count_unique_names(self) -> int:
        """Return number of unique theory names."""
        return len(self.all_theory_names)
    
    def get_statistics(self) -> Dict:
        """Get summary statistics about the theory dataset."""
        confidence_counts = defaultdict(int)
        for theory in self.theories.values():
            confidence_counts[theory.confidence_is_theory] += 1
        
        # Top theories by frequency
        theory_counts = defaultdict(int)
        for theory in self.theories.values():
            theory_counts[theory.mapped_name] += 1
        
        top_theories = sorted(theory_counts.items(), key=lambda x: x[1], reverse=True)[:20]
        
        return {
            "total_theories": self.count(),
            "unique_theory_names": self.count_unique_names(),
            "confidence_distribution": dict(confidence_counts),
            "total_papers": len(self.by_pmid),
            "top_theories": [{"name": name, "count": count} for name, count in top_theories],
            "metadata": self.metadata
        }


def load_theory_json(json_path: str = "data/stage1_5_llm_mapped.json") -> TheoryRegistry:
    """
    Load aging theories from JSON file into registry.
    
    Args:
        json_path: Path to theory JSON file (relative to project root)
    
    Returns:
        TheoryRegistry populated with all theories from the JSON
    
    Raises:
        FileNotFoundError: If JSON file doesn't exist
        ValueError: If JSON format is invalid
    """
    registry = TheoryRegistry()
    
    # Try multiple paths for flexibility (local dev vs Docker)
    possible_paths = [
        Path(__file__).parent.parent / json_path,  # Project root (local dev)
        Path(__file__).parent / json_path,          # Backend folder
        Path("/app") / json_path,                   # Docker absolute
        Path(json_path),                            # Direct path
    ]
    
    json_file = None
    for p in possible_paths:
        if p.exists():
            json_file = p
            break
    
    if json_file is None:
        print(f"[TheoryLoader] Warning: Theory JSON not found. Tried: {[str(p) for p in possible_paths]}")
        print("[TheoryLoader] Continuing with empty theory registry...")
        return registry  # Return empty registry instead of crashing
    
    print(f"[TheoryLoader] Loading theories from {json_path}...")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Store metadata
    registry.metadata = data.get('metadata', {})
    
    # Load theories
    mapped_theories = data.get('mapped_theories', [])
    
    for theory_data in mapped_theories:
        # Parse key concepts
        key_concepts = []
        for kc_data in theory_data.get('key_concepts', []):
            key_concepts.append(TheoryKeyConcept(
                concept=kc_data.get('concept', ''),
                description=kc_data.get('description', '')
            ))
        
        theory = AgingTheory(
            theory_id=theory_data.get('theory_id', ''),
            original_name=theory_data.get('original_name', ''),
            normalized_name=theory_data.get('normalized_name', ''),
            mapped_name=theory_data.get('mapped_name', ''),
            mapping_confidence=theory_data.get('mapping_confidence', 0.0),
            confidence_is_theory=theory_data.get('confidence_is_theory', 'medium'),
            key_concepts=key_concepts,
            description=theory_data.get('description', ''),
            evidence=theory_data.get('evidence', ''),
            mode=theory_data.get('mode', ''),
            criteria_reasoning=theory_data.get('criteria_reasoning', ''),
            paper_focus=theory_data.get('paper_focus', 0),
            doi=theory_data.get('doi', ''),
            pmid=theory_data.get('pmid', ''),
            paper_title=theory_data.get('paper_title', ''),
            enriched_text=theory_data.get('enriched_text', ''),
            concept_text=theory_data.get('concept_text', '')
        )
        
        registry.add_theory(theory)
    
    print(f"[TheoryLoader] Loaded {registry.count()} theories ({registry.count_unique_names()} unique names)")
    return registry


# Global registry instance (initialized on first import)
_global_registry: Optional[TheoryRegistry] = None


def get_global_registry() -> TheoryRegistry:
    """
    Get or create the global theory registry singleton.
    
    This ensures the JSON is only loaded once per application lifecycle.
    """
    global _global_registry
    if _global_registry is None:
        _global_registry = load_theory_json()
    return _global_registry


def reload_registry(json_path: str = "data/stage1_5_llm_mapped.json") -> TheoryRegistry:
    """
    Force reload of the global registry from JSON.
    
    Useful for testing or if the JSON file is updated.
    """
    global _global_registry
    _global_registry = load_theory_json(json_path)
    return _global_registry


if __name__ == "__main__":
    # Test the loader
    print("Testing Theory loader...")
    registry = load_theory_json()
    
    stats = registry.get_statistics()
    print(f"\nTotal theories: {stats['total_theories']}")
    print(f"Unique theory names: {stats['unique_theory_names']}")
    print(f"Total papers: {stats['total_papers']}")
    
    print(f"\nTop 10 theories:")
    for theory_stat in stats['top_theories'][:10]:
        print(f"  {theory_stat['count']:4d}x - {theory_stat['name']}")
    
    # Test lookups
    cellular_senescence = registry.get_by_name("Cellular Senescence Theory")
    if cellular_senescence:
        print(f"\nCellular Senescence Theory: {len(cellular_senescence)} papers")
        sample = cellular_senescence[0]
        print(f"  Sample paper: {sample.paper_title}")
        print(f"  Key concepts: {len(sample.key_concepts)}")
