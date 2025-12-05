"""
Create a smaller sample from the aging-filtered Mol-Instructions.
Prioritizes examples with more specific aging keywords.
"""
import json
import random
from pathlib import Path
from collections import defaultdict

INPUT_DIR = Path("data/mol_instructions_aging")
OUTPUT_DIR = Path("data/mol_instructions_sample")

# Target total examples
TARGET_TOTAL = 5000

# Priority keywords (more specific to aging research)
HIGH_PRIORITY_KEYWORDS = {
    "aging", "ageing", "longevity", "lifespan", "senescence", "senescent",
    "telomere", "telomerase", "sirtuin", "foxo", "klotho", "werner", "progeria",
    "dna repair", "dna damage", "oxidative stress", "autophagy", "p53", "p21", "p16"
}

MEDIUM_PRIORITY_KEYWORDS = {
    "mitochondri", "apoptosis", "apoptotic", "proteasome", "chaperone",
    "stem cell", "neurodegenerat", "tumor suppressor", "caloric restriction"
}

TASKS = [
    "protein_function",
    "catalytic_activity", 
    "protein_design",
    "domain_motif",
    "general_function"
]

def score_example(item):
    """Score an example based on aging relevance."""
    keywords = set(item.get('aging_keywords', []))
    
    high_matches = len(keywords & HIGH_PRIORITY_KEYWORDS)
    medium_matches = len(keywords & MEDIUM_PRIORITY_KEYWORDS)
    
    # Score: high priority = 3 points, medium = 2, others = 1
    return high_matches * 3 + medium_matches * 2 + len(keywords)

def sample_task(input_path: Path, target_count: int) -> list:
    """Sample from a task file, prioritizing high-relevance examples."""
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if not data:
        return []
    
    # Score and sort by relevance
    scored = [(score_example(item), item) for item in data]
    scored.sort(key=lambda x: -x[0])
    
    # Take top examples by score, but add some randomness
    top_count = min(target_count // 2, len(scored))
    top_examples = [item for _, item in scored[:top_count]]
    
    # Random sample from the rest
    remaining = [item for _, item in scored[top_count:]]
    random_count = min(target_count - top_count, len(remaining))
    random_examples = random.sample(remaining, random_count) if remaining else []
    
    result = top_examples + random_examples
    random.shuffle(result)  # Mix them up
    
    return result

def main():
    random.seed(42)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Calculate per-task targets (proportional to original filtered counts)
    task_counts = {}
    total_available = 0
    
    for task in TASKS:
        input_path = INPUT_DIR / f"{task}.json"
        if input_path.exists():
            with open(input_path, 'r') as f:
                count = len(json.load(f))
                task_counts[task] = count
                total_available += count
    
    print(f"Total aging-relevant examples available: {total_available}")
    print(f"Target sample size: {TARGET_TOTAL}")
    print()
    
    # Distribute target proportionally
    results = {}
    total_sampled = 0
    
    for task in TASKS:
        input_path = INPUT_DIR / f"{task}.json"
        output_path = OUTPUT_DIR / f"{task}.json"
        
        if task in task_counts and task_counts[task] > 0:
            # Proportional target, minimum 100
            target = max(100, int(TARGET_TOTAL * task_counts[task] / total_available))
            
            sampled = sample_task(input_path, target)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(sampled, f)
            
            print(f"{task}: {task_counts[task]} -> {len(sampled)} examples")
            results[task] = len(sampled)
            total_sampled += len(sampled)
        else:
            with open(output_path, 'w') as f:
                json.dump([], f)
            print(f"{task}: 0 examples (file not found)")
    
    print()
    print(f"Total sampled: {total_sampled} aging-relevant examples")
    print(f"Output: {OUTPUT_DIR}")
    
    # Show some example keywords from the sample
    print("\nSample keyword distribution:")
    all_keywords = defaultdict(int)
    for task in TASKS:
        output_path = OUTPUT_DIR / f"{task}.json"
        if output_path.exists():
            with open(output_path, 'r') as f:
                for item in json.load(f):
                    for kw in item.get('aging_keywords', []):
                        all_keywords[kw] += 1
    
    for kw, count in sorted(all_keywords.items(), key=lambda x: -x[1])[:15]:
        print(f"  {kw}: {count}")

if __name__ == "__main__":
    main()
