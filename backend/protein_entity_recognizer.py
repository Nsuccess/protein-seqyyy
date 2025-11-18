"""
Protein Entity Recognition for extracting GenAge protein mentions from scientific text.

This module provides functionality to identify and extract mentions of aging-related
proteins from paper text using pattern matching and normalization.
"""

import re
from typing import List, Set, Dict, Tuple
from dataclasses import dataclass
from genage_loader import GenAgeRegistry, get_global_registry


@dataclass
class ProteinMention:
    """Represents a single mention of a protein in text."""
    symbol: str  # Normalized gene symbol (e.g., "APOE")
    matched_text: str  # Actual text that was matched (e.g., "ApoE", "APOE")
    start_pos: int  # Character position where mention starts
    end_pos: int  # Character position where mention ends
    context: str  # Surrounding text context (for debugging/validation)


class ProteinEntityRecognizer:
    """
    Extract protein mentions from scientific text using GenAge protein symbols.
    
    Features:
    - Case-insensitive matching
    - Handles common variations (e.g., APOE, ApoE, apoE)
    - Word boundary detection to avoid false positives
    - Position tracking for each mention
    - Deduplication of overlapping matches
    """
    
    def __init__(self, genage_registry: GenAgeRegistry = None):
        """
        Initialize recognizer with GenAge protein symbols.
        
        Args:
            genage_registry: Optional registry; uses global if not provided
        """
        self.registry = genage_registry or get_global_registry()
        self.symbols = self.registry.get_all_symbols()
        
        # Build regex pattern for efficient matching
        self.pattern = self._build_regex_pattern()
        
        # Create normalization map for case-insensitive lookups
        self.normalization_map = {
            symbol.lower(): symbol for symbol in self.symbols
        }
        
        print(f"[EntityRecognizer] Initialized with {len(self.symbols)} protein symbols")
    
    def _build_regex_pattern(self) -> re.Pattern:
        """
        Build optimized regex pattern for all protein symbols.
        
        Pattern features:
        - Word boundaries to avoid partial matches
        - Case-insensitive matching
        - Sorted by length (longest first) to match longer symbols first
        
        Returns:
            Compiled regex pattern
        """
        # Sort symbols by length (descending) to match longer names first
        # This prevents "TP53" from matching before "TP53BP1"
        sorted_symbols = sorted(self.symbols, key=len, reverse=True)
        
        # Escape special regex characters in symbols
        escaped_symbols = [re.escape(symbol) for symbol in sorted_symbols]
        
        # Build pattern with word boundaries
        # \b ensures we match whole words only
        pattern_str = r'\b(' + '|'.join(escaped_symbols) + r')\b'
        
        # Compile with case-insensitive flag
        return re.compile(pattern_str, re.IGNORECASE)
    
    def extract_proteins(
        self,
        text: str,
        include_positions: bool = False,
        context_window: int = 50
    ) -> List[str] | List[ProteinMention]:
        """
        Extract all protein mentions from text.
        
        Args:
            text: Input text to search for protein mentions
            include_positions: If True, return ProteinMention objects with positions
            context_window: Number of characters to include in context (each side)
        
        Returns:
            List of protein symbols (if include_positions=False) or
            List of ProteinMention objects (if include_positions=True)
        """
        if not text:
            return []
        
        mentions = []
        seen_positions = set()  # Track positions to avoid duplicates
        
        # Find all matches
        for match in self.pattern.finditer(text):
            matched_text = match.group(0)
            start_pos = match.start()
            end_pos = match.end()
            
            # Skip if we've already seen this exact position
            if start_pos in seen_positions:
                continue
            seen_positions.add(start_pos)
            
            # Normalize to standard symbol (uppercase)
            normalized_symbol = self.normalization_map.get(matched_text.lower())
            
            if normalized_symbol:
                if include_positions:
                    # Extract context around the mention
                    context_start = max(0, start_pos - context_window)
                    context_end = min(len(text), end_pos + context_window)
                    context = text[context_start:context_end]
                    
                    mentions.append(ProteinMention(
                        symbol=normalized_symbol,
                        matched_text=matched_text,
                        start_pos=start_pos,
                        end_pos=end_pos,
                        context=context
                    ))
                else:
                    mentions.append(normalized_symbol)
        
        # If not including positions, deduplicate symbols
        if not include_positions:
            mentions = list(dict.fromkeys(mentions))  # Preserve order, remove duplicates
        
        return mentions
    
    def extract_unique_proteins(self, text: str) -> Set[str]:
        """
        Extract unique protein symbols from text (no duplicates).
        
        Args:
            text: Input text to search
        
        Returns:
            Set of unique protein symbols found
        """
        proteins = self.extract_proteins(text, include_positions=False)
        return set(proteins)
    
    def count_mentions(self, text: str) -> Dict[str, int]:
        """
        Count how many times each protein is mentioned in text.
        
        Args:
            text: Input text to search
        
        Returns:
            Dictionary mapping protein symbol to mention count
        """
        mentions = self.extract_proteins(text, include_positions=True)
        counts = {}
        for mention in mentions:
            symbol = mention.symbol
            counts[symbol] = counts.get(symbol, 0) + 1
        return counts
    
    def has_protein(self, text: str, protein_symbol: str) -> bool:
        """
        Check if a specific protein is mentioned in text.
        
        Args:
            text: Input text to search
            protein_symbol: Protein symbol to look for (case-insensitive)
        
        Returns:
            True if protein is mentioned, False otherwise
        """
        proteins = self.extract_unique_proteins(text)
        return protein_symbol.upper() in proteins
    
    def get_mention_density(self, text: str) -> float:
        """
        Calculate protein mention density (mentions per 1000 characters).
        
        Args:
            text: Input text to analyze
        
        Returns:
            Number of protein mentions per 1000 characters
        """
        if not text:
            return 0.0
        
        mentions = self.extract_proteins(text, include_positions=True)
        text_length = len(text)
        
        if text_length == 0:
            return 0.0
        
        return (len(mentions) / text_length) * 1000


# Global recognizer instance (initialized on first import)
_global_recognizer = None


def get_global_recognizer() -> ProteinEntityRecognizer:
    """
    Get or create the global ProteinEntityRecognizer singleton.
    
    This ensures the recognizer is only initialized once per application lifecycle.
    """
    global _global_recognizer
    if _global_recognizer is None:
        _global_recognizer = ProteinEntityRecognizer()
    return _global_recognizer


if __name__ == "__main__":
    # Test the recognizer
    print("Testing ProteinEntityRecognizer...")
    print("=" * 60)
    
    recognizer = ProteinEntityRecognizer()
    
    # Test text with various protein mentions
    test_text = """
    The APOE gene encodes apolipoprotein E, which plays a crucial role in lipid 
    metabolism and has been associated with longevity. Studies have shown that 
    APOE variants affect lifespan in humans. Additionally, SIRT6 and TP53 are 
    key regulators of aging processes. The mTOR pathway, involving MTOR, is 
    another critical regulator. FOXO3 transcription factors also contribute to 
    longevity. Recent research on apoe and sirt6 has revealed new insights.
    """
    
    print("\nTest text:")
    print(test_text[:200] + "...")
    
    # Test basic extraction
    print("\n1. Extract unique proteins:")
    proteins = recognizer.extract_unique_proteins(test_text)
    print(f"   Found: {sorted(proteins)}")
    
    # Test with positions
    print("\n2. Extract with positions:")
    mentions = recognizer.extract_proteins(test_text, include_positions=True)
    for mention in mentions[:5]:  # Show first 5
        print(f"   - {mention.symbol} at pos {mention.start_pos}: '{mention.matched_text}'")
    
    # Test counting
    print("\n3. Count mentions:")
    counts = recognizer.count_mentions(test_text)
    for symbol, count in sorted(counts.items()):
        print(f"   - {symbol}: {count} mentions")
    
    # Test specific protein check
    print("\n4. Check specific proteins:")
    test_symbols = ["APOE", "SIRT6", "NOTFOUND", "TP53"]
    for symbol in test_symbols:
        found = recognizer.has_protein(test_text, symbol)
        print(f"   - {symbol}: {'✓ Found' if found else '✗ Not found'}")
    
    # Test mention density
    print("\n5. Mention density:")
    density = recognizer.get_mention_density(test_text)
    print(f"   - {density:.2f} mentions per 1000 characters")
    
    print("\n" + "=" * 60)
    print("✓ All tests completed!")
