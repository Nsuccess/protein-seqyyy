"""
Aging Theory Classifier for categorizing papers by aging hallmarks.

This module classifies scientific papers based on the 11 hallmarks of aging
as defined in López-Otín et al. (2023) "Hallmarks of aging: An expanding universe"
"""

import re
from typing import List, Dict, Set, Tuple
from dataclasses import dataclass


@dataclass
class TheoryMatch:
    """Represents a match for an aging theory in text."""
    theory: str
    score: float
    matched_keywords: List[str]
    keyword_positions: List[int]


class AgingTheoryClassifier:
    """
    Classify papers by aging hallmarks using keyword-based scoring.
    
    Based on the 11 hallmarks of aging:
    1. Genomic instability
    2. Telomere attrition
    3. Epigenetic alterations
    4. Loss of proteostasis
    5. Disabled macroautophagy
    6. Deregulated nutrient sensing
    7. Mitochondrial dysfunction
    8. Cellular senescence
    9. Stem cell exhaustion
    10. Altered intercellular communication
    11. Chronic inflammation
    12. Dysbiosis
    """
    
    # Define keywords for each aging hallmark
    THEORY_KEYWORDS = {
        "genomic_instability": [
            "genomic instability", "DNA damage", "DNA repair", "mutation",
            "chromosomal aberration", "genome integrity", "DNA lesion",
            "double-strand break", "base excision repair", "nucleotide excision repair",
            "mismatch repair", "homologous recombination", "non-homologous end joining",
            "ATM", "ATR", "BRCA", "TP53", "DNA-PK", "telomere dysfunction"
        ],
        
        "telomere_attrition": [
            "telomere", "telomerase", "TERT", "TERC", "telomere shortening",
            "telomere length", "telomeric", "shelterin", "TRF1", "TRF2",
            "POT1", "replicative senescence", "Hayflick limit", "telomere erosion"
        ],
        
        "epigenetic_alterations": [
            "epigenetic", "DNA methylation", "histone modification", "chromatin",
            "histone acetylation", "histone methylation", "HDAC", "DNMT",
            "chromatin remodeling", "heterochromatin", "euchromatin",
            "histone deacetylase", "methyltransferase", "demethylase",
            "CpG island", "epigenome", "histone code"
        ],
        
        "loss_of_proteostasis": [
            "proteostasis", "protein folding", "chaperone", "HSP", "heat shock protein",
            "unfolded protein response", "UPR", "ER stress", "proteasome",
            "ubiquitin", "protein aggregation", "misfolded protein",
            "protein quality control", "HSF1", "BiP", "GRP78", "ERAD"
        ],
        
        "disabled_macroautophagy": [
            "autophagy", "macroautophagy", "mitophagy", "lysosome", "autophagosome",
            "LC3", "ATG", "BECN1", "mTOR", "AMPK", "autophagic flux",
            "lysosomal degradation", "selective autophagy", "chaperone-mediated autophagy"
        ],
        
        "deregulated_nutrient_sensing": [
            "nutrient sensing", "insulin signaling", "IGF-1", "mTOR", "AMPK",
            "sirtuins", "SIRT", "caloric restriction", "dietary restriction",
            "glucose metabolism", "insulin resistance", "metabolic syndrome",
            "IIS pathway", "FOXO", "PI3K", "AKT", "rapamycin", "metformin"
        ],
        
        "mitochondrial_dysfunction": [
            "mitochondria", "mitochondrial", "oxidative phosphorylation", "OXPHOS",
            "electron transport chain", "reactive oxygen species", "ROS",
            "mitochondrial DNA", "mtDNA", "ATP synthesis", "Complex I",
            "Complex II", "Complex III", "Complex IV", "cytochrome c",
            "mitochondrial biogenesis", "PGC-1", "mitophagy"
        ],
        
        "cellular_senescence": [
            "senescence", "senescent", "SASP", "senescence-associated secretory phenotype",
            "p16", "p21", "p53", "Rb", "cell cycle arrest", "SA-β-gal",
            "senescent cell", "senolytics", "senomorphics", "growth arrest",
            "irreversible cell cycle arrest", "oncogene-induced senescence"
        ],
        
        "stem_cell_exhaustion": [
            "stem cell", "stem cell exhaustion", "stem cell niche", "hematopoietic stem cell",
            "HSC", "satellite cell", "neural stem cell", "mesenchymal stem cell",
            "stem cell aging", "stem cell dysfunction", "regenerative capacity",
            "tissue regeneration", "stem cell pool", "stem cell quiescence"
        ],
        
        "altered_intercellular_communication": [
            "intercellular communication", "cell-cell communication", "paracrine",
            "endocrine", "neurohormonal", "extracellular vesicle", "exosome",
            "cytokine", "chemokine", "growth factor", "inflammaging",
            "immunosenescence", "cell signaling", "gap junction"
        ],
        
        "chronic_inflammation": [
            "inflammation", "inflammatory", "inflammaging", "cytokine",
            "interleukin", "IL-6", "IL-1", "TNF", "NF-κB", "NFKB",
            "C-reactive protein", "CRP", "pro-inflammatory", "anti-inflammatory",
            "immune response", "innate immunity", "adaptive immunity"
        ],
        
        "dysbiosis": [
            "dysbiosis", "microbiome", "microbiota", "gut microbiome",
            "intestinal microbiota", "bacterial diversity", "microbial composition",
            "gut-brain axis", "short-chain fatty acid", "SCFA",
            "probiotic", "prebiotic", "microbial metabolite", "gut permeability"
        ]
    }
    
    def __init__(self, min_score: float = 0.1):
        """
        Initialize classifier.
        
        Args:
            min_score: Minimum score threshold for a theory to be included (0-1)
        """
        self.min_score = min_score
        self.theories = list(self.THEORY_KEYWORDS.keys())
        
        # Compile regex patterns for each theory (case-insensitive)
        self.patterns = {}
        for theory, keywords in self.THEORY_KEYWORDS.items():
            # Escape special regex characters and create pattern
            escaped_keywords = [re.escape(kw) for kw in keywords]
            pattern_str = r'\b(' + '|'.join(escaped_keywords) + r')\b'
            self.patterns[theory] = re.compile(pattern_str, re.IGNORECASE)
        
        print(f"[TheoryClassifier] Initialized with {len(self.theories)} aging theories")
    
    def classify(
        self,
        text: str,
        return_scores: bool = False,
        top_k: int = None
    ) -> List[str] | List[Tuple[str, float]]:
        """
        Classify text by aging theories.
        
        Args:
            text: Input text to classify
            return_scores: If True, return (theory, score) tuples
            top_k: If set, return only top K theories by score
        
        Returns:
            List of theory names or (theory, score) tuples
        """
        if not text:
            return []
        
        theory_scores = {}
        
        for theory in self.theories:
            score = self._calculate_theory_score(text, theory)
            if score >= self.min_score:
                theory_scores[theory] = score
        
        # Sort by score (descending)
        sorted_theories = sorted(
            theory_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Apply top_k filter if specified
        if top_k:
            sorted_theories = sorted_theories[:top_k]
        
        if return_scores:
            return sorted_theories
        else:
            return [theory for theory, _ in sorted_theories]
    
    def _calculate_theory_score(self, text: str, theory: str) -> float:
        """
        Calculate relevance score for a theory based on keyword matches.
        
        Scoring:
        - Each unique keyword match adds to the score
        - Score is normalized by text length
        - Multiple mentions of same keyword count once
        
        Args:
            text: Input text
            theory: Theory name
        
        Returns:
            Score between 0 and 1
        """
        pattern = self.patterns[theory]
        matches = pattern.findall(text)
        
        if not matches:
            return 0.0
        
        # Count unique matched keywords (case-insensitive)
        unique_matches = set(m.lower() for m in matches)
        
        # Calculate score based on:
        # 1. Number of unique keywords matched
        # 2. Total number of matches (frequency)
        # 3. Normalized by text length
        
        total_keywords = len(self.THEORY_KEYWORDS[theory])
        keyword_coverage = len(unique_matches) / total_keywords
        match_frequency = len(matches) / max(len(text.split()), 1)
        
        # Weighted combination
        score = (keyword_coverage * 0.7) + (match_frequency * 100 * 0.3)
        
        # Cap at 1.0
        return min(score, 1.0)
    
    def get_detailed_matches(self, text: str, theory: str) -> TheoryMatch:
        """
        Get detailed information about theory matches in text.
        
        Args:
            text: Input text
            theory: Theory name
        
        Returns:
            TheoryMatch object with details
        """
        pattern = self.patterns[theory]
        matches = []
        positions = []
        
        for match in pattern.finditer(text):
            matches.append(match.group(0))
            positions.append(match.start())
        
        score = self._calculate_theory_score(text, theory)
        
        return TheoryMatch(
            theory=theory,
            score=score,
            matched_keywords=matches,
            keyword_positions=positions
        )
    
    def get_theory_distribution(self, texts: List[str]) -> Dict[str, int]:
        """
        Get distribution of theories across multiple texts.
        
        Args:
            texts: List of text documents
        
        Returns:
            Dictionary mapping theory to document count
        """
        distribution = {theory: 0 for theory in self.theories}
        
        for text in texts:
            theories = self.classify(text)
            for theory in theories:
                distribution[theory] += 1
        
        return distribution
    
    def get_theory_names(self) -> List[str]:
        """Get list of all theory names."""
        return self.theories.copy()
    
    def get_theory_keywords(self, theory: str) -> List[str]:
        """Get keywords for a specific theory."""
        return self.THEORY_KEYWORDS.get(theory, []).copy()


# Global classifier instance
_global_classifier = None


def get_global_classifier() -> AgingTheoryClassifier:
    """
    Get or create the global AgingTheoryClassifier singleton.
    """
    global _global_classifier
    if _global_classifier is None:
        _global_classifier = AgingTheoryClassifier()
    return _global_classifier


if __name__ == "__main__":
    # Test the classifier
    print("Testing AgingTheoryClassifier...")
    print("=" * 60)
    
    classifier = AgingTheoryClassifier()
    
    # Test text covering multiple theories
    test_text = """
    Aging is associated with genomic instability and accumulation of DNA damage.
    Telomere shortening occurs with each cell division, leading to replicative
    senescence. Epigenetic alterations, including changes in DNA methylation and
    histone modifications, are hallmarks of aging. Mitochondrial dysfunction
    results in increased ROS production and decreased ATP synthesis. Cellular
    senescence is characterized by irreversible cell cycle arrest and SASP.
    Chronic inflammation, or inflammaging, involves elevated levels of IL-6 and
    TNF-α. The gut microbiome undergoes dysbiosis with age, affecting health.
    """
    
    print("\nTest text (excerpt):")
    print(test_text[:200] + "...")
    
    print("\n1. Classify theories (basic):")
    theories = classifier.classify(test_text)
    print(f"   Found {len(theories)} theories: {theories}")
    
    print("\n2. Classify with scores:")
    theories_with_scores = classifier.classify(test_text, return_scores=True)
    for theory, score in theories_with_scores:
        print(f"   - {theory}: {score:.3f}")
    
    print("\n3. Top 3 theories:")
    top_theories = classifier.classify(test_text, top_k=3)
    print(f"   {top_theories}")
    
    print("\n4. Detailed matches for 'genomic_instability':")
    details = classifier.get_detailed_matches(test_text, "genomic_instability")
    print(f"   Score: {details.score:.3f}")
    print(f"   Matched keywords: {details.matched_keywords}")
    
    print("\n5. All available theories:")
    all_theories = classifier.get_theory_names()
    print(f"   {len(all_theories)} theories: {all_theories}")
    
    print("\n" + "=" * 60)
    print("✓ All tests completed!")
