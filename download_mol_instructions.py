"""
Download Mol-Instructions protein-oriented dataset from HuggingFace.
Run this separately to download the dataset, then come back to integrate it.
"""

from datasets import load_dataset
import pandas as pd
import os

print("=" * 60)
print("Downloading Mol-Instructions Dataset")
print("=" * 60)

# Create data directory if it doesn't exist
os.makedirs("data/mol_instructions", exist_ok=True)

print("\n[1/4] Loading dataset from HuggingFace...")
print("      This may take a few minutes on first download...")
dataset = load_dataset("zjunlp/Mol-Instructions")

print("\n[2/4] Extracting protein-oriented subset (505K instructions)...")
protein_data = dataset["protein_oriented"]

print(f"\n[3/4] Dataset loaded successfully!")
print(f"      Total protein instructions: {len(protein_data):,}")

# Get task distribution
task_counts = {}
for item in protein_data:
    task = item.get("task_name", "unknown")
    task_counts[task] = task_counts.get(task, 0) + 1

print("\n      Task distribution:")
for task, count in sorted(task_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"        - {task}: {count:,}")

print("\n[4/4] Converting to CSV and saving locally...")
df = protein_data.to_pandas()
output_path = "data/mol_instructions/protein_instructions.csv"
df.to_csv(output_path, index=False)

print(f"\n✅ SUCCESS!")
print(f"   Dataset saved to: {output_path}")
print(f"   Size: {len(df):,} rows")
print(f"   Columns: {list(df.columns)}")

# Show sample
print("\n📋 Sample instruction:")
sample = df.iloc[0]
print(f"   Task: {sample.get('task_name', 'N/A')}")
print(f"   Instruction: {sample.get('instruction', 'N/A')[:100]}...")
print(f"   Input: {sample.get('input', 'N/A')[:100]}...")
print(f"   Output: {sample.get('output', 'N/A')[:100]}...")

print("\n" + "=" * 60)
print("Download complete! Come back when ready to integrate.")
print("=" * 60)
