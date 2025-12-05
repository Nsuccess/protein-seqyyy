"""Count papers with PMCID."""
import json
import os
from pathlib import Path

corpus_dir = Path("data/corpus")
with_pmcid = 0
without_pmcid = 0

for f in corpus_dir.glob("*.json"):
    try:
        with open(f) as fp:
            data = json.load(fp)
        if data.get("pmcid"):
            with_pmcid += 1
        else:
            without_pmcid += 1
    except:
        pass

print(f"With PMCID: {with_pmcid}")
print(f"Without PMCID: {without_pmcid}")
print(f"Total: {with_pmcid + without_pmcid}")
