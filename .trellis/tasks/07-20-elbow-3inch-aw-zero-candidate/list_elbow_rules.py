import sys
from pathlib import Path

sys.path.insert(0, str(Path(r"D:\Projects\claude-code-best\python")))
from inventory.services.wanding_fuzzy_matcher import _load_field_matching_rules_from_knowledge

rules = _load_field_matching_rules_from_knowledge()
for sources, targets in rules:
    blob = " ".join(sources + targets).lower()
    if any(k in blob for k in ("elbow", "弯头", "丝扣", "drat", "螺纹")):
        print(sources, "->", targets)
