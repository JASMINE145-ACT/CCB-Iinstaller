import re, pathlib
gh = (pathlib.Path(__file__).parent.parent / "dist/chunks/install-github-app-DfL8qoQZ.js").read_text(encoding="utf-8")
needles = [
 "We''ll create a workflow file",
 "We'll create a workflow file",
 "Claude Code Review - Automated",
 "GitHub CLI not found",
 "You must select at least one workflow",
 "Would you like to:",
 "Success",
 "Invalid GitHub URL format",
]
for n in needles:
    i = gh.find(n)
    if i >= 0:
        ctx = gh[max(0,i-40):i+len(n)+40]
        ctx = ctx.replace("\n", " ")
        print(f"FOUND {n!r}")
        print(f"  ctx: {ctx}")
    else:
        print(f"MISSING {n!r}")
