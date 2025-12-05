"""
Filter Mol-Instructions dataset for aging/longevity relevant examples.
Searches for keywords related to aging research in the instruction outputs.
"""
import json
import os
from pathlib import Path
from typing import List, Dict, Set

INPUT_DIR = Path("data/raw/mol_instructions/Protein-oriented_Instructions")
OUTPUT_DIR = Path("data/mol_instructions_aging")

TASKS = [
    "protein_function",
    "catalytic_activity", 
    "protein_design",
    "domain_motif",
    "general_function"
]

# Aging-related keywords to search for
AGING_KEYWORDS = [
    # Core aging terms
    "aging", "ageing", "longevity", "lifespan", "senescence", "senescent",
    
    # Telomere related
    "telomere", "telomerase", "telomeric",
    
    # DNA damage/repair (major aging mechanism)
    "dna repair", "dna damage", "double-strand break", "base excision repair",
    "nucleotide excision repair", "mismatch repair", "homologous recombination",
    
    # Oxidative stress (hallmark of aging)
    "oxidative stress", "reactive oxygen", "antioxidant", "oxidative damage",
    "superoxide", "catalase", "peroxidase", "glutathione",
    
    # Mitochondrial (aging hallmark)
    "mitochondri", "electron transport", "oxidative phosphorylation",
    "respiratory chain", "atp synthase",
    
    # Proteostasis (aging hallmark)
    "autophagy", "proteasome", "ubiquitin", "chaperone", "protein folding",
    "unfolded protein", "heat shock", "hsp70", "hsp90",
    
    # Cellular senescence markers
    "cell cycle arrest", "p53", "p21", "p16", "rb protein", "cdkn",
    
    # Stem cells (aging related)
    "stem cell", "pluripoten", "self-renewal",
    
    # Inflammation (inflammaging)
    "inflammat", "cytokine", "interleukin", "nf-kappa", "tnf",
    
    # Epigenetics (aging clock)
    "methylation", "histone", "chromatin", "epigenetic", "sirtuin", "hdac",
    
    # Metabolism/nutrient sensing (aging pathways)
    "insulin", "igf", "mtor", "ampk", "foxo", "caloric restriction",
    "glucose metabolism", "lipid metabolism",
    
    # Apoptosis
    "apoptosis", "apoptotic", "programmed cell death", "caspase", "bcl-2",
    
    # Known aging-related proteins
    "klotho", "werner", "progeria", "hutchinson", "cockayne",
    
    # Neurodegeneration (age-related)
    "neurodegenerat", "alzheimer", "parkinson", "amyloid", "tau protein",
    
    # Cardiovascular aging
    "atherosclerosis", "cardiac", "vascular aging",
    
    # Cancer (age-related)
    "tumor suppressor", "oncogene", "carcinogen",
]

def matches_aging_keywords(text: str, keywords: List[str]) -> Set[str]:
    """Check if text contains any aging-related keywords. Returns matched keywords."""
    text_lower = text.lower()
    matched = set()
    for keyword in keywords:
        if keyword.lower() in text_lower:
            matched.add(keyword)
    return matched

def filter_file(input_path: Path, output_path: Path) -> Dict:
    """Filter a JSON file for aging-relevant examples."""
    print(f"\nProcessing {input_path.name}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    original_count = len(data)
    filtered = []
    keyword_stats = {}
    
    for item in data:
        # Check instruction, input, and output fields
        text_to_check = f"{item.get('instruction', '')} {item.get('input', '')} {item.get('output', '')}"
        matched = matches_aging_keywords(text_to_check, AGING_KEYWORDS)
        
        if matched:
            # Add matched keywords as metadata
            item['aging_keywords'] = list(matched)
            filtered.append(item)
            
            # Track keyword frequency
            for kw in matched:
                keyword_stats[kw] = keyword_stats.get(kw, 0) + 1
    
    # Save filtered data
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(filtered, f, indent=2)
    
    print(f"  {original_count} -> {len(filtered)} aging-relevant examples ({len(filtered)/original_count*100:.2f}%)")
    
    if keyword_stats:
        top_keywords = sorted(keyword_stats.items(), key=lambda x: -x[1])[:10]
        print(f"  Top keywords: {', '.join(f'{k}({v})' for k, v in top_keywords)}")
    
    return {
        "task": input_path.stem,
        "original": original_count,
        "filtered": len(filtered),
        "keywords": keyword_stats
    }

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    results = []
    total_original = 0
    total_filtered = 0
    all_keywords = {}
    
    for task in TASKS:
        input_path = INPUT_DIR / f"{task}.json"
        output_path = OUTPUT_DIR / f"{task}.json"
        
        if input_path.exists():
            result = filter_file(input_path, output_path)
            results.append(result)
            total_original += result["original"]
            total_filtered += result["filtered"]
            
            for kw, count in result["keywords"].items():
                all_keywords[kw] = all_keywords.get(kw, 0) + count
        else:
            print(f"Skipping {task} - file not found")
            # Create empty file
            with open(output_path, 'w') as f:
                json.dump([], f)
    
    print("\n" + "="*60)
    print(f"SUMMARY")
    print("="*60)
    print(f"Total: {total_original} -> {total_filtered} examples ({total_filtered/total_original*100:.2f}%)")
    print(f"\nTop 20 aging keywords found:")
    for kw, count in sorted(all_keywords.items(), key=lambda x: -x[1])[:20]:
        print(f"  {kw}: {count}")
    
    # Save summary
    summary = {
        "total_original": total_original,
        "total_filtered": total_filtered,
        "percentage": round(total_filtered/total_original*100, 2),
        "by_task": results,
        "keyword_frequency": dict(sorted(all_keywords.items(), key=lambda x: -x[1]))
    }
    
    with open(OUTPUT_DIR / "filtering_summary.json", 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\nOutput saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
