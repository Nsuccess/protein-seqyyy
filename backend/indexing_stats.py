"""
Indexing statistics tracking and persistence.

This module provides functionality to track and store indexing progress,
protein extraction statistics, and theory classification results.
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, List
from pathlib import Path


class IndexingStatsTracker:
    """
    Track and persist indexing statistics across batches.
    
    Statistics are stored in a JSON file and updated after each batch.
    """
    
    def __init__(self, stats_file: str = "backend/chroma_store/indexing_stats.json"):
        """
        Initialize stats tracker.
        
        Args:
            stats_file: Path to JSON file for storing statistics
        """
        # Handle path relative to project root
        self.stats_file = Path(stats_file)
        if not self.stats_file.exists() and not self.stats_file.parent.exists():
            self.stats_file = Path(__file__).parent.parent / stats_file
        self.stats = self._load_stats()
    
    def _load_stats(self) -> Dict[str, Any]:
        """Load existing statistics from file or create new."""
        if self.stats_file.exists():
            try:
                with open(self.stats_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[StatsTracker] Error loading stats: {e}")
                return self._create_empty_stats()
        else:
            return self._create_empty_stats()
    
    def _create_empty_stats(self) -> Dict[str, Any]:
        """Create empty statistics structure."""
        return {
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "total_batches": 0,
            "total_documents_indexed": 0,
            "total_chunks_created": 0,
            "total_embeddings_created": 0,
            "documents": {
                "processed": 0,
                "skipped_empty": 0,
                "skipped_errors": 0
            },
            "proteins": {
                "papers_with_proteins": 0,
                "unique_proteins_found": [],
                "total_protein_mentions": 0,
                "protein_distribution": {}
            },
            "theories": {
                "papers_with_theories": 0,
                "theories_found": [],
                "theory_distribution": {}
            },
            "batches": []
        }
    
    def update_batch(self, batch_stats: Dict[str, Any]) -> None:
        """
        Update statistics with results from a new batch.
        
        Args:
            batch_stats: Statistics from the batch indexing operation
        """
        self.stats["last_updated"] = datetime.now().isoformat()
        self.stats["total_batches"] += 1
        
        # Update document counts
        if "documents" in batch_stats:
            doc_stats = batch_stats["documents"]
            self.stats["total_documents_indexed"] += doc_stats.get("processed", 0)
            self.stats["documents"]["processed"] += doc_stats.get("processed", 0)
            self.stats["documents"]["skipped_empty"] += doc_stats.get("skipped_empty", 0)
            self.stats["documents"]["skipped_errors"] += doc_stats.get("skipped_errors", 0)
        
        # Update protein statistics
        if "proteins" in batch_stats:
            prot_stats = batch_stats["proteins"]
            self.stats["proteins"]["papers_with_proteins"] += prot_stats.get("papers_with_proteins", 0)
            self.stats["proteins"]["total_protein_mentions"] += prot_stats.get("total_mentions", 0)
            
            # Merge unique proteins
            new_proteins = prot_stats.get("unique_proteins_found", 0)
            if isinstance(new_proteins, int):
                # If it's a count, we can't merge, just note it
                pass
            elif isinstance(new_proteins, list):
                existing = set(self.stats["proteins"]["unique_proteins_found"])
                existing.update(new_proteins)
                self.stats["proteins"]["unique_proteins_found"] = sorted(existing)
            
            # Merge protein distribution
            if "top_proteins" in prot_stats:
                for protein, count in prot_stats["top_proteins"].items():
                    current = self.stats["proteins"]["protein_distribution"].get(protein, 0)
                    self.stats["proteins"]["protein_distribution"][protein] = current + count
        
        # Update theory statistics
        if "theories" in batch_stats:
            theory_stats = batch_stats["theories"]
            self.stats["theories"]["papers_with_theories"] += theory_stats.get("papers_with_theories", 0)
            
            # Merge theory distribution
            if "distribution" in theory_stats:
                for theory, count in theory_stats["distribution"].items():
                    current = self.stats["theories"]["theory_distribution"].get(theory, 0)
                    self.stats["theories"]["theory_distribution"][theory] = current + count
            
            # Update theories found list
            theories_in_batch = list(theory_stats.get("distribution", {}).keys())
            existing_theories = set(self.stats["theories"]["theories_found"])
            existing_theories.update(theories_in_batch)
            self.stats["theories"]["theories_found"] = sorted(existing_theories)
        
        # Update indexing counts
        if "indexing" in batch_stats:
            idx_stats = batch_stats["indexing"]
            self.stats["total_chunks_created"] += idx_stats.get("chunks_created", 0)
            self.stats["total_embeddings_created"] += idx_stats.get("embeddings_created", 0)
        
        # Add batch record
        batch_record = {
            "batch_number": self.stats["total_batches"],
            "timestamp": datetime.now().isoformat(),
            "documents_processed": batch_stats.get("documents", {}).get("processed", 0),
            "chunks_created": batch_stats.get("indexing", {}).get("chunks_created", 0),
            "proteins_found": batch_stats.get("proteins", {}).get("unique_proteins_found", 0),
            "theories_found": batch_stats.get("theories", {}).get("theories_found", 0)
        }
        self.stats["batches"].append(batch_record)
        
        # Keep only last 100 batch records to avoid file bloat
        if len(self.stats["batches"]) > 100:
            self.stats["batches"] = self.stats["batches"][-100:]
    
    def save(self) -> None:
        """Save statistics to file."""
        try:
            # Ensure directory exists
            self.stats_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(self.stats_file, "w", encoding="utf-8") as f:
                json.dump(self.stats, f, indent=2, ensure_ascii=False)
            
            print(f"[StatsTracker] Saved statistics to {self.stats_file}")
        except Exception as e:
            print(f"[StatsTracker] Error saving stats: {e}")
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of current statistics."""
        return {
            "total_batches": self.stats["total_batches"],
            "total_documents": self.stats["total_documents_indexed"],
            "total_chunks": self.stats["total_chunks_created"],
            "unique_proteins": len(self.stats["proteins"]["unique_proteins_found"]),
            "theories_identified": len(self.stats["theories"]["theories_found"]),
            "last_updated": self.stats["last_updated"]
        }
    
    def get_protein_stats(self) -> Dict[str, Any]:
        """Get detailed protein statistics."""
        prot_dist = self.stats["proteins"]["protein_distribution"]
        top_10 = dict(sorted(prot_dist.items(), key=lambda x: -x[1])[:10])
        
        return {
            "papers_with_proteins": self.stats["proteins"]["papers_with_proteins"],
            "unique_proteins_found": len(self.stats["proteins"]["unique_proteins_found"]),
            "total_mentions": self.stats["proteins"]["total_protein_mentions"],
            "top_10_proteins": top_10,
            "all_proteins": self.stats["proteins"]["unique_proteins_found"]
        }
    
    def get_theory_stats(self) -> Dict[str, Any]:
        """Get detailed theory statistics."""
        return {
            "papers_with_theories": self.stats["theories"]["papers_with_theories"],
            "theories_identified": len(self.stats["theories"]["theories_found"]),
            "theory_distribution": self.stats["theories"]["theory_distribution"],
            "all_theories": self.stats["theories"]["theories_found"]
        }
    
    def reset(self) -> None:
        """Reset all statistics."""
        self.stats = self._create_empty_stats()
        self.save()
        print("[StatsTracker] Statistics reset")


# Global stats tracker instance
_global_tracker = None


def get_global_tracker() -> IndexingStatsTracker:
    """Get or create the global stats tracker singleton."""
    global _global_tracker
    if _global_tracker is None:
        _global_tracker = IndexingStatsTracker()
    return _global_tracker


if __name__ == "__main__":
    # Test the stats tracker
    print("Testing IndexingStatsTracker...")
    print("=" * 60)
    
    tracker = IndexingStatsTracker("test_stats.json")
    
    # Simulate batch 1
    batch1_stats = {
        "documents": {"processed": 10, "skipped_empty": 2, "skipped_errors": 1},
        "proteins": {
            "papers_with_proteins": 8,
            "unique_proteins_found": ["APOE", "SIRT6", "TP53"],
            "total_mentions": 25,
            "top_proteins": {"APOE": 10, "SIRT6": 8, "TP53": 7}
        },
        "theories": {
            "papers_with_theories": 9,
            "theories_found": 5,
            "distribution": {
                "genomic_instability": 3,
                "mitochondrial_dysfunction": 5,
                "cellular_senescence": 4
            }
        },
        "indexing": {"chunks_created": 50, "embeddings_created": 50}
    }
    
    print("\n1. Update with batch 1:")
    tracker.update_batch(batch1_stats)
    print(f"   Summary: {tracker.get_summary()}")
    
    # Simulate batch 2
    batch2_stats = {
        "documents": {"processed": 15, "skipped_empty": 1, "skipped_errors": 0},
        "proteins": {
            "papers_with_proteins": 12,
            "unique_proteins_found": ["MTOR", "FOXO3", "APOE"],
            "total_mentions": 30,
            "top_proteins": {"MTOR": 12, "FOXO3": 10, "APOE": 8}
        },
        "theories": {
            "papers_with_theories": 14,
            "theories_found": 6,
            "distribution": {
                "mitochondrial_dysfunction": 7,
                "chronic_inflammation": 5,
                "dysbiosis": 3
            }
        },
        "indexing": {"chunks_created": 75, "embeddings_created": 75}
    }
    
    print("\n2. Update with batch 2:")
    tracker.update_batch(batch2_stats)
    print(f"   Summary: {tracker.get_summary()}")
    
    print("\n3. Protein statistics:")
    prot_stats = tracker.get_protein_stats()
    print(f"   Unique proteins: {prot_stats['unique_proteins_found']}")
    print(f"   Top proteins: {prot_stats['top_10_proteins']}")
    
    print("\n4. Theory statistics:")
    theory_stats = tracker.get_theory_stats()
    print(f"   Theories found: {theory_stats['theories_identified']}")
    print(f"   Distribution: {theory_stats['theory_distribution']}")
    
    print("\n5. Save statistics:")
    tracker.save()
    print("   Saved to test_stats.json")
    
    # Clean up test file
    if os.path.exists("test_stats.json"):
        os.remove("test_stats.json")
        print("   Cleaned up test file")
    
    print("\n" + "=" * 60)
    print("✓ All tests completed!")
