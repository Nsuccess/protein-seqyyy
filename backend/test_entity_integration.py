"""
Test entity recognition integration with the indexing pipeline.
"""

from protein_entity_recognizer import get_global_recognizer

def test_entity_integration():
    print("=" * 60)
    print("Testing Entity Recognition Integration")
    print("=" * 60)
    
    # Get recognizer
    recognizer = get_global_recognizer()
    
    # Simulate paper text from corpus
    sample_paper_text = """
    Apolipoprotein E (APOE) is a key protein in lipid metabolism and has been 
    extensively studied for its role in aging and longevity. The APOE ε4 allele 
    is associated with increased risk of Alzheimer's disease, while APOE ε2 may 
    confer protective effects. 
    
    Recent studies have also implicated SIRT6, a member of the sirtuin family, 
    in regulating lifespan. SIRT6 deficiency leads to premature aging phenotypes 
    in mice. Additionally, TP53 (tumor protein p53) plays a crucial role in 
    cellular senescence and DNA damage response.
    
    The mechanistic target of rapamycin (mTOR) pathway is another critical 
    regulator of aging. Inhibition of MTOR has been shown to extend lifespan 
    in multiple model organisms. FOXO3 transcription factors also contribute 
    to longevity through regulation of stress resistance genes.
    """
    
    print("\n1. Extract proteins from sample paper:")
    proteins = recognizer.extract_unique_proteins(sample_paper_text)
    print(f"   Found {len(proteins)} unique proteins: {sorted(proteins)}")
    
    print("\n2. Count mentions per protein:")
    counts = recognizer.count_mentions(sample_paper_text)
    for symbol, count in sorted(counts.items()):
        print(f"   - {symbol}: {count} mentions")
    
    print("\n3. Get mention density:")
    density = recognizer.get_mention_density(sample_paper_text)
    print(f"   - {density:.2f} mentions per 1000 characters")
    
    print("\n4. Test with positions:")
    mentions = recognizer.extract_proteins(sample_paper_text, include_positions=True)
    print(f"   Found {len(mentions)} total mentions:")
    for mention in mentions[:5]:
        print(f"   - {mention.symbol} at pos {mention.start_pos}: '{mention.matched_text}'")
    
    # Test metadata format for FAISS
    print("\n5. Simulate metadata for FAISS indexing:")
    metadata = {
        "pmcid": "PMC1234567",
        "doi": "10.1234/test.2024",
        "title": "APOE and aging mechanisms",
        "year": 2024,
        "journal": "Aging Cell",
        "proteins_mentioned": list(proteins),  # Convert set to list for JSON
    }
    print(f"   Metadata: {metadata}")
    print(f"   proteins_mentioned type: {type(metadata['proteins_mentioned'])}")
    print(f"   proteins_mentioned value: {metadata['proteins_mentioned']}")
    
    print("\n" + "=" * 60)
    print("✓ Entity recognition integration test passed!")
    print("=" * 60)

if __name__ == "__main__":
    test_entity_integration()
