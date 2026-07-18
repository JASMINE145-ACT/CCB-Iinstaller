# Research — KB / quotation「知识库 MCP」业务不完整

**Date:** 2026-07-14  
**Explore agent:** [KB MCP gap research](b3b38303-74cf-4655-89fb-bc63f315cd0a)

## Verdict

没有独立的 `org-knowledge` MCP。业务知识暴露面 = **org REST** + quotation MCP **`append_business_rule`** + Agent **文件系统 Read(shadow)**。所谓「MCP 业务不完整」主要是：**发布内容仍带 CONF-001/002**、**restructured ≠ seed/center**、**append 落「业务规则补充」不进 §4**、**matcher 几乎不吃 §4 默认口径**。

## Surfaces

| Surface | Role |
|---------|------|
| `mcp__quotation__append_business_rule` | 确认后写入 center `wanding_business_knowledge` |
| `match_quotation*` | `selection_context.knowledge_source` 路径提示；不内联全文 |
| Agent `Read` shadow | 选型正文唯一加载面（PreToolUse 强制 session-once） |
| `#/org-knowledge` PUT | 全量编辑 / 解除 CONF 的正式落库口 |

## Drift map

| Artifact | CONF / §4.1 |
|----------|-------------|
| `data/wanding_business_knowledge.restructured.md` | **已解除**（本会话合并 §4.1） |
| `data/wanding_business_knowledge.md` | 仍 ⚠️ CONF（需同步） |
| Org center UI | 以 UI Save 版本为准；与 seed 易漂移 |
| Live shadow `D:\CCB-Wanding\vendor\wanding\data\…` | 跟 sync；旧内容 → 旧默认 |

## Gap priority

**P0:** Publish §4.1（CONF resolve）→ seed + UI Save + shadow parity  
**P1:** matcher encode 直管D/管件A + 150→dn160；append 默认改附录/禁 dump  
**P2:** 可选 `get_business_knowledge(sections?)`；Layer2+ slug；registry 登记 `WANd.KB.*`
