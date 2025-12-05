"""Show some examples of aging-relevant Mol-Instructions."""
import json

with open('data/mol_instructions_sample/protein_function.json') as f:
    data = json.load(f)

print('=== AGING-RELEVANT MOL-INSTRUCTIONS EXAMPLES ===\n')
for i, item in enumerate(data[:5]):
    print(f'Example {i+1}:')
    print(f'  Keywords: {item.get("aging_keywords", [])}')
    output = item["output"][:300]
    print(f'  Output: {output}...')
    print()
