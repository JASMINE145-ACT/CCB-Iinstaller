# 已锁定决策摘要

**日期：** 2026-07-13  
**任务：** 07-13-trade-sourcing-knowledge-consolidation

## Agent

- **方案 A**：quotation 吸收 supplier MCP；一张报价专家卡；查价默认双调用。
- supplier 独立卡：`guid_primary=false`；产品找厂意图走报价卡。
- 合成形态：`dual-call-contract.md`

## learn-by-data

| 段 | 动作 |
|----|------|
| A | 唯一写业务知识库；**规则 + 原因 + 来源**；Skill 强制校验 |
| B | 严重标记；提醒通知 **祐嘉诚** |
| C | 确认后写 **价库 draft**；非 admin 只出表 |
| D | **Skill 硬跳过**（本任务禁止映射写入） |

详情：`learn-precipitate-contract.md`

## 知识库

五层整理；**先 inventory**（`kb-inventory.md`）再小批 PUT；可回滚。

## System Review

接纳表：`research/system-review-acceptance.md`
