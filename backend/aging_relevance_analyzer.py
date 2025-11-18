"""
Aging Relevance Analyzer
Analyzes queries and responses to identify aging/longevity connections
"""

from typing import Dict, List, Optional
import re


class AgingRelevanceAnalyzer:
    """Analyze query and response for aging relevance"""
    
    AGING_KEYWORDS = [
        'aging', 'ageing', 'longevity', 'lifespan', 'senescence', 'age-related',
        'elderly', 'geriatric', 'telomere', 'oxidative stress', 'mitochondrial',
        'autophagy', 'inflammation', 'proteostasis', 'genomic instability',
        'cellular senescence', 'stem cell', 'epigenetic', 'caloric restriction',
        'rapamycin', 'metformin', 'resveratrol', 'sirtuin', 'mtor', 'ampk',
        'healthspan', 'age-associated', 'gerontology', 'rejuvenation'
    ]
    
    AGING_THEORIES = {
        'genomic_instability': ['DNA damage', 'mutation', 'genomic', 'chromosome', 'repair'],
        'telomere_attrition': ['telomere', 'telomerase', 'chromosome end', 'replicative'],
        'epigenetic_alterations': ['epigenetic', 'methylation', 'histone', 'chromatin'],
        'loss_of_proteostasis': ['proteostasis', 'protein folding', 'chaperone', 'ubiquitin', 'proteasome'],
        'mitochondrial_dysfunction': ['mitochondrial', 'mitochondria', 'oxidative', 'ROS', 'electron transport'],
        'cellular_senescence': ['senescence', 'senescent', 'SASP', 'p16', 'p21'],
        'stem_cell_exhaustion': ['stem cell', 'progenitor', 'regeneration', 'tissue renewal'],
        'altered_intercellular_communication': ['inflammation', 'cytokine', 'immune', 'inflammaging'],
        'disabled_macroautophagy': ['autophagy', 'lysosome', 'degradation', 'recycling'],
        'chronic_inflammation': ['inflammation', 'inflammatory', 'inflammaging', 'cytokine'],
        'dysbiosis': ['microbiome', 'gut bacteria', 'dysbiosis', 'microbiota']
    }
    
    def analyze_query(self, query: str) -> Dict:
        """Determine if query is aging-related"""
        query_lower = query.lower()
        aging_keywords_found = [kw for kw in self.AGING_KEYWORDS if kw in query_lower]
        
        return {
            'is_aging_query': len(aging_keywords_found) > 0,
            'aging_keywords': aging_keywords_found,
            'relevance_score': min(len(aging_keywords_found) / 3, 1.0)
        }
    
    def find_aging_connections(self, text: str, proteins: List[str] = None) -> Dict:
        """Find aging connections in text"""
        text_lower = text.lower()
        
        # Find aging keywords
        keywords_found = [kw for kw in self.AGING_KEYWORDS if kw in text_lower]
        
        # Find aging theories
        theories_found = []
        for theory, keywords in self.AGING_THEORIES.items():
            if any(kw.lower() in text_lower for kw in keywords):
                theories_found.append(theory)
        
        # Generate connections based on found keywords
        connections = []
        if 'mitochondrial' in text_lower or 'mitochondria' in text_lower:
            connections.append('Involved in mitochondrial function and energy metabolism')
        if 'oxidative' in text_lower or 'ros' in text_lower:
            connections.append('Related to oxidative stress response')
        if 'dna' in text_lower and ('damage' in text_lower or 'repair' in text_lower):
            connections.append('Plays role in DNA damage response and genomic stability')
        if 'telomere' in text_lower:
            connections.append('Associated with telomere maintenance')
        if 'senescence' in text_lower or 'senescent' in text_lower:
            connections.append('Linked to cellular senescence pathways')
        if 'autophagy' in text_lower:
            connections.append('Regulates autophagy and cellular recycling')
        if 'inflammation' in text_lower or 'inflammatory' in text_lower:
            connections.append('Modulates inflammatory responses')
        if 'longevity' in text_lower or 'lifespan' in text_lower:
            connections.append('Directly associated with longevity regulation')
        
        # Calculate relevance score
        has_connection = len(keywords_found) > 0 or len(theories_found) > 0
        relevance_score = min((len(keywords_found) + len(theories_found) * 2) / 10, 1.0)
        
        return {
            'has_aging_connection': has_connection,
            'relevance_score': relevance_score,
            'connections': connections[:5],  # Limit to top 5
            'aging_theories': theories_found,
            'keywords_found': keywords_found[:10]  # Limit to top 10
        }
    
    def enhance_response_with_aging_context(self, response: str, aging_analysis: Dict) -> str:
        """Add aging relevance context to response"""
        if not aging_analysis['has_aging_connection']:
            return response
        
        aging_section = "\n\n**Aging Relevance:**\n"
        
        if aging_analysis['connections']:
            aging_section += "\n".join(f"- {conn}" for conn in aging_analysis['connections'])
        
        if aging_analysis['aging_theories']:
            theories_str = ", ".join(t.replace('_', ' ').title() for t in aging_analysis['aging_theories'])
            aging_section += f"\n\n*Related aging theories: {theories_str}*"
        
        return response + aging_section
