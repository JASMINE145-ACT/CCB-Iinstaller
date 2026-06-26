import re, pathlib
gh = (pathlib.Path(__file__).parent.parent / "dist/chunks/install-github-app-DfL8qoQZ.js").read_text(encoding="utf-8")
# V5 keys from iter 23 github section - check exact key presence
v5_keys = [
 "children:`You must select at least one workflow to continue`",
 "children:`We'll create a workflow file in your repository for each one you select.`",
 "children:`Claude Code Review - Automated code review on new PRs`",
 "children:`Would you like to:`",
 "children:`What would you like to do?`",
 "children:`ANTHROPIC_API_KEY already exists in repository secrets!`",
 "children:`GitHub CLI not found`",
 "title:`GitHub CLI not found`",
 "subtitle:`We'll create a workflow file in your repository for each one you select.`",
 "label:`Claude Code Review - Automated code review on new PRs`",
 "children:`Press Enter to try again, or any other key to cancel`",
 "children:`Press Enter to continue anyway, or Ctrl+C to exit and fix issues`",
 "children:`We found some potential issues, but you can continue anyway`",
 "children:`Success`",
 "children:`Next steps:`",
 "children:`Create Authentication Token`",
 "children:`Please enter a repository name to continue`",
 "title:`Invalid GitHub URL format`",
 "title:`Repository format warning`",
]
for k in v5_keys:
    print(("HIT " if k in gh else "MISS"), k[:90])

print("\n--- fuzzy search for unpatchable english ---")
for n in [
 "You must select at least one workflow",
 "Would you like to:",
 "What would you like to do?",
 "ANTHROPIC_API_KEY already exists",
 "Press Enter to try again",
 "Press Enter to continue anyway",
 "We found some potential issues",
 "Next steps:",
 "Create Authentication Token",
 "Please enter a repository name",
 "Invalid GitHub URL format",
 "Repository format warning",
]:
    i = gh.find(n)
    if i >= 0:
        ctx = gh[max(0,i-35):i+len(n)+35]
        print(f"  {n!r} @ {ctx!r}")
