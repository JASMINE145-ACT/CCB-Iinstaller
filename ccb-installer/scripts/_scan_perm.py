import re, pathlib
perm = (pathlib.Path(__file__).parent.parent / "dist/chunks/permissions-BVvJQBEO.js").read_text(encoding="utf-8")
# find title:`...` patterns
for m in re.finditer(r"title:`([^`]{1,40})`", perm):
    print("title:", m.group(1))
print("---")
for m in re.finditer(r"label:`Add[^`]{0,40}`", perm):
    print(m.group(0))
print("---")
for s in ["Allow", "Deny", "Ask", "allowed", "denied", "ask", "Enter to submit", "text:`Settings`"]:
    print(s, "->", "YES" if s in perm else "NO")
