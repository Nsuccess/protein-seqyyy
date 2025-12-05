"""
Test aging theory classification integration with the indexing pipeline.
"""

from aging_theory_classifier import get_global_classifier

def test_theory_integration():
    print("=" * 60)
    print("Testing Aging Theory Classification Integration")
    print("=" * 60)
    
    # Get classifier
    classifier = get_global_classifier()
    
    # Simulate paper text covering multiple theories
    sample_paper_text = """
    Aging is characterized by multiple hallmarks that contribute to the decline
    in physiological function. Genomic instability accumulates with age due to
    DNA damage from various sources including oxidative stress and replication
    errors. Telomere shortening occurs with each cell division, eventually
    triggering replicative senescence.
    
    Epigenetic alterations, including changes in DNA methylation patterns and
    histone modifications, alter gene expression programs. Loss of proteostasis
    results from declining chaperone function and proteasome activity, leading
    to protein aggregation. Mitochondrial dysfunction is characterized by
    decreased ATP production and increased ROS generation.
    
    Cellular senescence involves irreversible cell cycle arrest and the
    senescence-associated secretory phenotype (SASP), which promotes chronic
    inflammation. The gut microbiome undergoes dysbiosis with age, affecting
    metabolic health. Stem cell exhaustion reduces regenerative capacity in
    aged tissues. Altered intercellular communication through changes in
    hormone levels and inflammatory cytokines affects tissue homeostasis.
    """
    
    print("\n1. Classify theories in sample paper:")
    theories = classifier.classify(sample_paper_text)
    print(f"   Found {len(theories)} theories:")
    for theory in theories:
        print(f"   - {theory}")
    
    print("\n2. Get theories with scores:")
    theories_with_scores = classifier.classify(sample_paper_text, return_scores=True)
    print(f"   Top 5 theories by score:")
    for theory, score in theories_with_scores[:5]:
        print(f"   - {theory}: {score:.3f}")
    
    print("\n3. Get top 3 theories only:")
    top_3 = classifier.classify(sample_paper_text, top_k=3)
    print(f"   {top_3}")
    
    print("\n4. Test metadata format for ChromaDB:")
    metadata = {
        "pmcid": "PMC9876543",
        "doi": "10.1234/aging.2024",
        "title": "Hallmarks of aging in human tissues",
        "year": 2024,
        "journal": "Cell",
        "proteins_mentioned": ["TP53", "SIRT6", "MTOR"],
        "aging_theories": theories,
    }
    print(f"   Metadata keys: {list(metadata.keys())}")
    print(f"   aging_theories type: {type(metadata['aging_theories'])}")
    print(f"   aging_theories count: {len(metadata['aging_theories'])}")
    
    print("\n5. Test theory distribution:")
    # Simulate multiple papers
    papers = [
        "DNA damage and genomic instability in aging cells",
        "Telomere shortening and cellular senescence",
        "Mitochondrial dysfunction and ROS production",
        "Epigenetic changes in aged tissues",
        "Chronic inflammation and inflammaging"
    ]
    distribution = classifier.get_theory_distribution(papers)
    theories_found = {k: v for k, v in distribution.items() if v > 0}
    print(f"   Theories found across {len(papers)} papers:")
    for theory, count in sorted(theories_found.items(), key=lambda x: -x[1]):
        print(f"   - {theory}: {count} papers")
    
    print("\n6. All available theories:")
    all_theories = classifier.get_theory_names()
    print(f"   {len(all_theories)} theories available")
    
    print("\n" + "=" * 60)
    print("✓ Theory classification integration test passed!")
    print("=" * 60)

if __name__ == "__main__":
    test_theory_integration()
