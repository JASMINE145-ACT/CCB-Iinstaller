import re, pathlib
agents = (pathlib.Path(__file__).parent.parent / "dist/chunks/agents-DaLzXVa7.js").read_text(encoding="utf-8")
needles = [
 "open in editor", "Open in editor", "Generating agent from description",
 "When should Claude use this agent?", "Automatic color", "Preview: ",
 "Yes, delete", "No, cancel", "children:`None`", "`None`",
]
for n in needles:
    i = agents.find(n)
    if i >= 0:
        ctx = agents[max(0,i-50):i+len(n)+50].replace("\n"," ")
        print(f"FOUND {n!r}: ...{ctx}...")
    else:
        print(f"MISSING {n!r}")
