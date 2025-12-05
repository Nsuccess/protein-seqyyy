"""
Create a sampled subset of Mol-Instructions for production deployment.
Reduces ~650MB to ~30MB while keeping representative examples.
"""
import json
import random
import os
from pathlib import Path

# Sample rate (5% of each file)
SAMPLE_RATE = 0.05

INPUT_DIR = Path("data/raw/mol_instructions/Protein-oriented_Instructions")
OUTPUT_DIR = Path("data/mol_instructions_sample")

TASKS = [
    "protein_function",
    "catalytic_activity", 
    "protein_design",
    "domain_motif",
    "general_function"
]

def sample_file(input_path: Path, output_path: Path, sample_rate: float):
    """Sample a JSON file to reduce size."""
    print(f"Processing {input_path.name}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    original_count = len(data)
    sample_size = max(100, int(original_count * sample_rate))  # At least 100 examples
    
    # Random sample
    sampled = random.sample(data, min(sample_size, original_count))
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(sampled, f)
    
    print(f"  {original_count} -> {len(sampled)} examples ({len(sampled)/original_count*100:.1f}%)")
    return len(sampled)

def main():
    random.seed(42)  # Reproducible sampling
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    total_sampled = 0
    for task in TASKS:
        input_path = INPUT_DIR / f"{task}.json"
        output_path = OUTPUT_DIR / f"{task}.json"
        
        if input_path.exists():
            count = sample_file(input_path, output_path, SAMPLE_RATE)
            total_sampled += count
        else:
            print(f"Skipping {task} - file not found")
    
    print(f"\nTotal sampled: {total_sampled} examples")
    print(f"Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
