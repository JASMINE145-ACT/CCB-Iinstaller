from pathlib import Path
p = Path(r'D:\Projects\claude-code-best\ccb-installer\packages\vertical\com.wanding.trade\agents\quotation-agent.md')
print(len(p.read_text(encoding='utf-8').splitlines()))
