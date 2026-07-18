# learn-by-data 沉淀合同 — WANd.LEARN.PRECIPITATE.001

## 总表

| 段 | 动作 | 禁止 |
|----|------|------|
| **A** | 唯一可写业务知识库 | B/C/D 写知识库 |
| **B** | 严重标记表 + **通知祐嘉诚** | 写库 |
| **C** | 确认后写入 **价格库 draft** | 写知识库；非 admin 强写；跳过 draft 直发 active |
| **D** | **本任务硬跳过** | 调用 `append_quotation_mapping_pending` / 映射合并 |

「D 本次不改」= **Skill 明确跳过 Section D 工作流**（不是「代码里继续跑」）。

## Section A

预览前 Skill 校验（缺一不可）：

1. 规则正文：询价词 → 应选/勿选，一句话  
2. 原因：一行  
3. 来源：`learn-by-data 确认，YYYY-MM-DD`

落库形态：

```markdown
## 业务规则补充

- <规则>
  - 原因：<一行>
  - 来源：learn-by-data 确认，YYYY-MM-DD
```

`append_business_rule`：`rule_text` = 规则句；`reason` = 原因。缺「原因」→ 不得进入 confirmed 流程。

## Section B

输出严重标记表后，固定一句：

> 请祐嘉诚核查下列料号异常。

（企业微信/任务单若已有通道可挂钩；MVP 会话内文案即可。）

## Section C

| 角色 | 行为 |
|------|------|
| `price_admin` + org session | `upsert`：`confirmed=false` 预览 → 用户确认 → `confirmed=true` **写入 draft** |
| 非 admin / 无 token | **只出表，不调用写工具** |
| HTTP 403 | 如实说明权限；不换 JWT 硬试 |
| HTTP 409 | 重新 get draft revision；**不自动重试写** |

「直接进价格库」= 确认后进 **draft**，不自动 `publish_price_library_draft`（除非用户另说发布）。
