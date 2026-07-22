## Why

复审 #2：架构方向已提升，但 C0 未关闭——watermark 会漏 turn、worker outcome 不可靠、detached 双 worker、出站未锁、Hermes SHA 无效、local business 与 Agent 规则冲突。本变更将合同升到 **v3**，关闭文档/规格层放行条件；**仍不批准 I1 编码**直到 PO 认可出站默认且 validate 通过。

## What Changes

- `hermes-trigger-port.md` **v3**：`reviewThroughTurnId`、lease、per-run outcome  
- Hermes 官方 SHA `1600008ab00e…`（废弃无效 `820cb051…`）  
- `proposal_kind` × `knowledge_object`；Agent 写 `memory/business/*` = 合法路径 B  
- 出站默认：租户 allow + 会话 deny 覆盖 + 企业字段脱敏 + fail-closed  
- 新规格 `turn-harvest-runtime`；修订 lanes / routing / operator-promise  
- Registry `WANd.LEARNING.IDLE.001`：legacy + **four proposal kinds**（去五车道）  
- **无**生产 Scheduler 实现

## Capabilities

### New Capabilities
- `memory-lanes`
- `memory-operator-promise`
- `learning-lane-routing`
- `promotion-result`
- `turn-harvest-runtime`: watermark snapshot、lease、per-run outcome

### Modified Capabilities
- （无 openspec/specs 基线）

## Impact

- Docs + registry wording  
- I1 将改：aionui spawn/outcome、worker return、accurate-agent 审计（非删除写路径）
