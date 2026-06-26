import pathlib
agents = (pathlib.Path(__file__).parent.parent / "dist/chunks/agents-DaLzXVa7.js").read_text(encoding="utf-8")
v5_keys = [
 "label:`Open in editor`",
 "description:`open in editor`",
 "children:` Generating agent from description...`",
 "children:`When should Claude use this agent?`",
 "children:`Automatic color`",
 "children:`Preview: `",
 "label:`Yes, delete`",
 "label:`No, cancel`",
 "children:`None`",
 "children:`All tools`",
]
for k in v5_keys:
    print(("HIT " if k in agents else "MISS"), k)

print("\n--- fuzzy ---")
for n in [
 "Generating agent from description",
 "When should Claude use this agent",
 "Automatic color",
 "Preview:",
 "Yes, delete",
 "No, cancel",
 "\u4f55\u65f6\u8ba9 Claude",
 "\u6b63\u5728\u6839\u636e\u63cf\u8ff0\u751f\u6210",
 "\u81ea\u52a8\u989c\u8272",
 "\u9884\u89c8\uff1a",
]:
    i = agents.find(n)
    if i >= 0:
        ctx = agents[max(0,i-40):i+len(n)+40].replace("\n"," ")
        print(f"  {n[:30]!r}: ...{ctx}...")
