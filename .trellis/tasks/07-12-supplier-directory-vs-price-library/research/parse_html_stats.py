"""One-off: stats from WanDing supplier index.html (UTF-8)."""
from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

SRC = Path(
    r"c:\Users\m1774\Documents\WXWork\1688857212807317\Cache\File\2026-07\index.html"
)
text = SRC.read_text(encoding="utf-8")
m = re.search(r"let allData = (\[[\s\S]*?\]);\s*\n", text)
if not m:
    raise SystemExit("parse fail: allData not found")
raw = m.group(1)
names = re.findall(r"'工厂全称':'([^']*)'", raw)
codes = re.findall(r"'供应商编码':'([^']*)'", raw)
cats = re.findall(r"'主营产品大类':'([^']*)'", raw)
addrs = re.findall(r"'工厂完整仓库地址':'([^']*)'", raw)
contacts = re.findall(r"'国内对接联系人':'([^']*)'", raw)
print("count", len(names))
print("with_code", sum(1 for c in codes if c.strip()))
print("with_addr", sum(1 for a in addrs if a.strip()))
print("with_contact", sum(1 for c in contacts if c.strip()))
print("categories", dict(Counter(cats)))
print("names:", ", ".join(names))
