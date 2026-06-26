import re, pathlib
gh = (pathlib.Path(__file__).parent.parent / "dist/chunks/install-github-app-DfL8qoQZ.js").read_text(encoding="utf-8")
keys = [
 "You must select at least one workflow to continue",
 "We'll create a workflow file",
 "Claude Code Review - Automated code review on new PRs",
 "Would you like to:",
 "What would you like to do?",
 "ANTHROPIC_API_KEY already exists",
 "GitHub CLI not found",
 "GitHub CLI not authenticated",
 "Press Enter to try again",
 "Press Enter to continue anyway",
 "We found some potential issues",
 "Success",
 "Next steps:",
 "Create Authentication Token",
 "Please enter a repository name to continue",
 "Invalid GitHub URL format",
 "Repository format warning",
]
for s in keys:
    print(s[:50], "->", "YES" if s in gh else "NO")
print("--- children:` patterns sample ---")
for m in re.finditer(r"children:`([^`\\]{5,80})`", gh):
    t = m.group(1)
    if any(ord(c) < 128 for c in t):
        print(t)
