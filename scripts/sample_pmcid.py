"""Sample papers for PMCID."""
import json
import os

files = [f for f in os.listdir('data/corpus') if f.endswith('.json')][:100]
with_pmcid = 0
without_pmcid = 0

for f in files:
    try:
        with open(f'data/corpus/{f}', encoding='utf-8') as fp:
            data = json.load(fp)
        if data.get('pmcid'):
            with_pmcid += 1
        else:
            without_pmcid += 1
    except Exception as e:
        print(f"Error: {f}: {e}")

print(f"Sample of {len(files)}: {with_pmcid} have PMCID, {without_pmcid} don't")
