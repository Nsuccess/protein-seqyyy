"""
GenAge protein data loader and registry.

This module provides functionality to load and manage the 308 aging-related proteins
from the GenAge Human Ageing Genomic Resources database.
"""

import csv
from typing import Dict, List, Optional, Set
from dataclasses import dataclass
from pathlib import Path


@dataclass
class GenAgeProtein:
    """Represents a protein from the GenAge database."""
    genage_id: str
    symbol: str
    name: str
    entrez_gene_id: str
    uniprot: str
    why: str  # Reason for inclusion (e.g., "mammal", "model", "cell", "human_link")
    
    @property
    def why_categories(self) -> List[str]:
        """Parse the 'why' field into individual categories."""
        if not self.why:
            return []
        return [cat.strip() for cat in self.why.split(',')]


class GenAgeRegistry:
    """
    In-memory registry for fast lookups of GenAge proteins.
    
    Provides efficient access to protein data by symbol, GenAge ID, or UniProt ID.
    """
    
    def __init__(self):
        self.proteins: Dict[str, GenAgeProtein] = {}  # symbol -> protein
        self.by_genage_id: Dict[str, GenAgeProtein] = {}  # genage_id -> protein
        self.by_uniprot: Dict[str, GenAgeProtein] = {}  # uniprot -> protein
        self.all_symbols: Set[str] = set()
        
    def add_protein(self, protein: GenAgeProtein) -> None:
        """Add a protein to the registry."""
        self.proteins[protein.symbol] = protein
        self.by_genage_id[protein.genage_id] = protein
        if protein.uniprot:
            self.by_uniprot[protein.uniprot] = protein
        self.all_symbols.add(protein.symbol)
    
    def get_by_symbol(self, symbol: str) -> Optional[GenAgeProtein]:
        """Get protein by gene symbol (case-insensitive)."""
        return self.proteins.get(symbol.upper())
    
    def get_by_genage_id(self, genage_id: str) -> Optional[GenAgeProtein]:
        """Get protein by GenAge ID."""
        return self.by_genage_id.get(genage_id)
    
    def get_by_uniprot(self, uniprot: str) -> Optional[GenAgeProtein]:
        """Get protein by UniProt ID."""
        return self.by_uniprot.get(uniprot)
    
    def get_all_symbols(self) -> List[str]:
        """Get all protein symbols sorted alphabetically."""
        return sorted(self.all_symbols)
    
    def get_all_proteins(self) -> List[GenAgeProtein]:
        """Get all proteins sorted by symbol."""
        return [self.proteins[symbol] for symbol in self.get_all_symbols()]
    
    def filter_by_category(self, category: str) -> List[GenAgeProtein]:
        """
        Filter proteins by 'why' category.
        
        Args:
            category: One of "mammal", "model", "cell", "human_link", "functional", etc.
        
        Returns:
            List of proteins that have the specified category in their 'why' field.
        """
        return [
            protein for protein in self.proteins.values()
            if category in protein.why_categories
        ]
    
    def count(self) -> int:
        """Return total number of proteins in registry."""
        return len(self.proteins)
    
    def get_statistics(self) -> Dict:
        """Get summary statistics about the GenAge dataset."""
        categories = {}
        for protein in self.proteins.values():
            for cat in protein.why_categories:
                categories[cat] = categories.get(cat, 0) + 1
        
        return {
            "total_proteins": self.count(),
            "proteins_with_uniprot": sum(1 for p in self.proteins.values() if p.uniprot),
            "category_distribution": categories,
            "symbols": self.get_all_symbols()
        }


def load_genage_csv(csv_path: str = "data/raw/genage_human.csv") -> GenAgeRegistry:
    """
    Load GenAge proteins from CSV file into registry.
    
    Args:
        csv_path: Path to genage_human.csv file (relative to project root)
    
    Returns:
        GenAgeRegistry populated with all proteins from the CSV
    
    Raises:
        FileNotFoundError: If CSV file doesn't exist
        ValueError: If CSV format is invalid
    """
    registry = GenAgeRegistry()
    
    # Try multiple paths for flexibility (local dev vs Docker)
    possible_paths = [
        Path(__file__).parent.parent / csv_path,  # Project root (local dev)
        Path(__file__).parent / csv_path,          # Backend folder
        Path("/app") / csv_path,                   # Docker absolute
        Path(csv_path),                            # Direct path
    ]
    
    csv_file = None
    for p in possible_paths:
        if p.exists():
            csv_file = p
            break
    
    if csv_file is None:
        raise FileNotFoundError(f"GenAge CSV not found. Tried: {[str(p) for p in possible_paths]}")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Validate headers
        expected_headers = {'GenAge ID', 'symbol', 'name', 'entrez gene id', 'uniprot', 'why'}
        if not expected_headers.issubset(set(reader.fieldnames or [])):
            raise ValueError(f"CSV missing required headers. Expected: {expected_headers}")
        
        for row in reader:
            protein = GenAgeProtein(
                genage_id=row['GenAge ID'].strip(),
                symbol=row['symbol'].strip().upper(),  # Normalize to uppercase
                name=row['name'].strip(),
                entrez_gene_id=row['entrez gene id'].strip(),
                uniprot=row['uniprot'].strip(),
                why=row['why'].strip()
            )
            registry.add_protein(protein)
    
    print(f"[GenAge] Loaded {registry.count()} proteins from {csv_path}")
    return registry


# Global registry instance (initialized on first import)
_global_registry: Optional[GenAgeRegistry] = None


def get_global_registry() -> GenAgeRegistry:
    """
    Get or create the global GenAge registry singleton.
    
    This ensures the CSV is only loaded once per application lifecycle.
    """
    global _global_registry
    if _global_registry is None:
        _global_registry = load_genage_csv()
    return _global_registry


def reload_registry(csv_path: str = "data/raw/genage_human.csv") -> GenAgeRegistry:
    """
    Force reload of the global registry from CSV.
    
    Useful for testing or if the CSV file is updated.
    
    Args:
        csv_path: Path relative to project root (e.g., "data/raw/genage_human.csv")
    """
    global _global_registry
    _global_registry = load_genage_csv(csv_path)
    return _global_registry


if __name__ == "__main__":
    # Test the loader
    print("Testing GenAge loader...")
    registry = load_genage_csv()
    
    print(f"\nTotal proteins: {registry.count()}")
    print(f"\nFirst 10 symbols: {registry.get_all_symbols()[:10]}")
    
    # Test lookups
    apoe = registry.get_by_symbol("APOE")
    if apoe:
        print(f"\nAPOE protein:")
        print(f"  GenAge ID: {apoe.genage_id}")
        print(f"  Name: {apoe.name}")
        print(f"  UniProt: {apoe.uniprot}")
        print(f"  Why: {apoe.why}")
        print(f"  Categories: {apoe.why_categories}")
    
    # Test category filtering
    mammal_proteins = registry.filter_by_category("mammal")
    print(f"\nProteins with 'mammal' category: {len(mammal_proteins)}")
    
    # Show statistics
    stats = registry.get_statistics()
    print(f"\nStatistics:")
    print(f"  Total: {stats['total_proteins']}")
    print(f"  With UniProt: {stats['proteins_with_uniprot']}")
    print(f"  Categories: {stats['category_distribution']}")
