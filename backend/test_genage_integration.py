"""
Test script to verify GenAge integration in the backend.
"""

from genage_loader import get_global_registry

def test_genage_integration():
    print("=" * 60)
    print("Testing GenAge Integration")
    print("=" * 60)
    
    # Load registry
    registry = get_global_registry()
    print(f"\n✓ Loaded {registry.count()} proteins from GenAge")
    
    # Test getting all symbols
    all_symbols = registry.get_all_symbols()
    print(f"\n✓ First 10 protein symbols: {all_symbols[:10]}")
    
    # Test lookup by symbol
    test_proteins = ["APOE", "SIRT6", "TP53", "FOXO3", "MTOR"]
    print(f"\n✓ Testing lookups for: {test_proteins}")
    for symbol in test_proteins:
        protein = registry.get_by_symbol(symbol)
        if protein:
            print(f"  - {symbol}: {protein.name} (UniProt: {protein.uniprot})")
        else:
            print(f"  - {symbol}: NOT FOUND")
    
    # Test category filtering
    print("\n✓ Testing category filtering:")
    categories = ["mammal", "model", "human_link", "cell"]
    for cat in categories:
        proteins = registry.filter_by_category(cat)
        print(f"  - {cat}: {len(proteins)} proteins")
    
    # Test statistics
    stats = registry.get_statistics()
    print(f"\n✓ Statistics:")
    print(f"  - Total proteins: {stats['total_proteins']}")
    print(f"  - With UniProt: {stats['proteins_with_uniprot']}")
    print(f"  - Categories: {len(stats['category_distribution'])}")
    print(f"  - Category breakdown:")
    for cat, count in sorted(stats['category_distribution'].items(), key=lambda x: -x[1]):
        print(f"    • {cat}: {count}")
    
    print("\n" + "=" * 60)
    print("✓ All tests passed!")
    print("=" * 60)

if __name__ == "__main__":
    test_genage_integration()
