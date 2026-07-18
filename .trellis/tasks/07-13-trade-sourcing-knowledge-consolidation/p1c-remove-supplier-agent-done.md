# supplier-directory-agent 已移除

**Date:** 2026-07-13

- 删除 packages/staging agent md+json；live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\supplier-directory-agent.*` 已删  
- `package.json` 去掉 agents 条目；alias `supplier-directory-agent` → `quotation-agent`  
- orchestrator / registry / health / specs 一律指向 quotation  
- MCP `supplier-directory` **保留**（挂在 quotation-agent）
