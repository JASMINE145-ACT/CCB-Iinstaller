import re
from pathlib import Path

path = Path(__file__).parent / "patch-i18n.ps1"
text = path.read_text(encoding="utf-8")

def extract_block(name):
    m = re.search(
        rf"\${name} = New-ReplacementMap(.*?)Patch-AllChunks -DistDir.*?-Replacements \${name}",
        text,
        re.M | re.S,
    )
    if not m:
        return {}
    block = m.group(1)
    pairs = re.findall(
        rf"\${name}\['((?:[^'\\]|\\.|'')*)'\]\s*=\s*'((?:[^'\\]|\\.|'')*)'",
        block,
    )
    return {k.replace("''", "'"): v.replace("''", "'") for k, v in pairs}

v3, v4, v5 = extract_block("chunkUiV3"), extract_block("chunkUiV4"), extract_block("chunkUiV5")
print("counts", len(v3), len(v4), len(v5))

for label, other in [("V3", v3), ("V4", v4)]:
    ov = [k for k in v5 if k in other]
    print(f"\nOverlap {label}: {len(ov)}")
    for k in sorted(ov):
        same = v5[k] == other[k]
        print(f"  {'SAME' if same else 'DIFF'}: {k[:100]}")
        if not same:
            print(f"    {label}={other[k][:80]}")
            print(f"    V5={v5[k][:80]}")

broad_pat = re.compile(
    r"^(label|title|children|text):`\s*(Yes|No|None|Success|Description|Tools|Model|Memory|Color|Location|Name)\s*`$"
)
print("\nBroad keys:")
for k in sorted(v5):
    if broad_pat.match(k):
        print(" ", k)

print("\nPrefix mismatches (key prefix != value prefix):")
for k, v in sorted(v5.items()):
    if re.match(r"^\w+:`", k):
        kp = k.split("`", 1)[0]
        vp = v.split("`", 1)[0]
        if kp != vp:
            print(f"  {k} -> {v[:60]}")

# Check ${r.ellipsis} vs figures_default
for k in v5:
    if "ellipsis" in k or "ellipsis" in v5[k]:
        print(f"\nellipsis entry: {k} = {v5[k]}")

# Verify \uXXXX sequences are valid (4 hex digits)
print("\nInvalid \\u escapes:")
for k, v in v5.items():
    for m in re.finditer(r"\\u([0-9a-fA-F]{4})", v):
        pass
    bad = re.findall(r"\\u(?![0-9a-fA-F]{4})", v)
    if bad:
        print(f"  {k[:70]}")

# Compare translations with $chunk28d / $chunkEgfc quote-format ports
def extract_quote_map(var):
    m = re.search(rf"\${var} = @{{(.*?)Patch-AllChunks", text, re.S)
    if not m:
        return {}
    block = m.group(1)
    pairs = re.findall(
        rf"\${var}\['((?:[^'\\]|\\.|'')*)'\]\s*=\s*'((?:[^'\\]|\\.|'')*)'",
        block,
    )
    return {k.replace("''", "'"): v.replace("''", "'") for k, v in pairs}

c28d = extract_quote_map("chunk28d")
cegfc = extract_quote_map("chunkEgfc")

def to_backtick_key(qkey):
    # children: "foo" -> children:`foo`
    m = re.match(r"^(\w+):\s*\"(.*)\"$", qkey)
    if m:
        return f"{m.group(1)}:`{m.group(2)}`"
    return None

print("\nTranslation drift vs quote-format maps:")
for qk, qv in c28d.items():
    bk = to_backtick_key(qk)
    if bk and bk in v5 and v5[bk] != qv.replace('"', "`").replace('children: "', "children:`").replace('title: "', "title:`"):
        # normalize quote map value to backtick suffix
        qv_bt = re.sub(r'^(\w+):\s*"', r"\1:`", qv)
        if qv_bt.endswith('"'):
            qv_bt = qv_bt[:-1] + "`"
        if v5[bk] != qv_bt:
            print(f"  28d drift: {bk}")
            print(f"    28d={qv_bt[:70]}")
            print(f"    V5 ={v5[bk][:70]}")

# Key presence in dist (English literal inside backtick key)
dist = Path(__file__).parent.parent / "dist" / "chunks"
chunks = {
    "perm": (dist / "permissions-BVvJQBEO.js").read_text(encoding="utf-8", errors="replace"),
    "agents": (dist / "agents-DaLzXVa7.js").read_text(encoding="utf-8", errors="replace"),
    "gh": (dist / "install-github-app-DfL8qoQZ.js").read_text(encoding="utf-8", errors="replace"),
}
all_c = "\n".join(chunks.values())

def key_literal(k):
    if "`" in k:
        parts = k.split("`")
        return parts[1] if len(parts) >= 2 else k
    return k.strip("`")

print("\nKey literal NOT found in dist (post-patch English remnants or bad keys):")
for k in sorted(v5):
    lit = key_literal(k)
    if len(lit) < 4 or lit.startswith("${"):
        continue
    # English keys should either still exist (unpatched) or Chinese value exists
    zh_suffix = v5[k].split("`", 2)[-1].rstrip("`") if "`" in v5[k] else v5[k]
    en_ok = lit in all_c or k in all_c
    zh_ok = any(part in all_c for part in re.findall(r"\\u[0-9a-fA-F]{4}", v5[k][:80]))
    if not en_ok and not zh_ok:
        print(f"  MISSING: {lit[:60]!r}  ({k[:50]})")

print("\nEllipsis patterns in permissions chunk:")
for pat in ["r.ellipsis", "figures_default.ellipsis", "Add directory", "Add a new rule", "title:`Allow`", "title:`Deny`"]:
    print(f"  {pat!r}: {'YES' if pat in chunks['perm'] else 'NO'}")

# V4 vs V5 semantic: same English, different prefix
print("\nSame English literal, different prefix vs V4:")
v4_lits = {}
for k in v4:
    lit = key_literal(k)
    v4_lits.setdefault(lit, []).append(k)
for k in v5:
    lit = key_literal(k)
    if lit in v4_lits and k not in v4_lits[lit]:
        print(f"  {lit!r}: V4={v4_lits[lit]}  V5={k}")
