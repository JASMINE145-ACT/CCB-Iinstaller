import re, pathlib
agents = (pathlib.Path(__file__).parent.parent / "dist/chunks/agents-DaLzXVa7.js").read_text(encoding="utf-8")
keys = [
 "Open in editor", "open in editor", "Generating agent from description",
 "When should Claude use this agent?", "children:`None`", "All tools",
 "Yes, delete", "No, cancel", "Automatic color", "Preview: ",
]
for s in keys:
    print(s, "->", "YES" if s in agents else "NO")
print("--- label:`Open")
for m in re.finditer(r"label:`([^`]{3,30})`", agents):
    if "editor" in m.group(1).lower() or m.group(1) in ("Open in editor","open in editor"):
        print(m.group(0))
