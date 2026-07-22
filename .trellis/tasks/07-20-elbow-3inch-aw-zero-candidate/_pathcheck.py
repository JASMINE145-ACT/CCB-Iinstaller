from pathlib import Path
p = Path(r"D:\Projects\claude-code-best\.trellis\tasks\07-20-elbow-3inch-aw-zero-candidate\repro_elbow3.py").resolve()
print("parents3", p.parents[3])
print("python exists", (p.parents[3] / "python").is_dir())
print("inventory", (p.parents[3] / "python" / "inventory").is_dir())
