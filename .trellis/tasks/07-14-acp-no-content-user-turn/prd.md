# PRD — ACP `(no content)` 幽灵用户回合导致答非所问

## Problem

库存查询等路径上，`Agent(quotation-agent)` / MCP **已成功返回**（物料存在、库存为 0），随后模型思考出现：

> The user's last message was "(no content)"

并对用户真实追问（如「的确是有的 对吧 只不过是没库存？」）给出错误的空转回复：

> admin，请问还有什么需要帮忙的吗？上一轮 … 已返回

用户侧往往**看不到**空气泡，但模型上下文里有不可见的 `(no content)` user 回合。

## Repro (2026-07-14)

1. 会话（编排器或直连报价卡）发：`001754 查询该编号的库存`
2. 委派 → `get_inventory_by_code` → 返回品名 + `qty_*=0`
3. 不经可见空消息，助手可能已开始「no content」偏航；再发确认追问 → 再次「no content」式空转，而非「是，料号在库库存为 0」

## Root-cause (planning-session explore)

| 层 | 发现 |
|----|------|
| **Primary (ccb-src)** | Claude Code `createUserMessage`：`content: e \|\| '(no content)'`；UI 对 `(no content)` **隐藏气泡**，但 API `messagesForAPI` **仍保留** |
| **Incomplete guard** | ACP `isEmptyPromptSubmitInput` 只挡空的 `session/prompt`，不挡 QueryEngine 内 Stop/nudge / queued_command / 历史里已有的哨兵 |
| **Precedent** | `06-29-price-tiers-synthesis-and-seed-fallback`：档位 tool 成功后「你最后一条消息没有内容…」同类症状 |

详见 `research/no-content-root-cause.md`。

## Goals

1. 模型可见历史中 **不得** 出现 user 文本等于 `(no content)` / 空用户回合（成功工具结果之后尤甚）。
2. MCP/Agent 成功后助手必须 **根据 tool_result 综合回答**，禁止空用户偏航话术。
3. 复现 001754 库存 → 追问「有料无库存？」→ 明确确认「存在 + 库存 0」。

## Non-goals

- 改报价匹配算法或库存字段语义（仍只看 `qty_warehouse` 等业务规则）。
- 一次性重做编排器架构。

## Acceptance

- [ ] Transcript/API dump：Agent/MCP 后 user 回合无 `(no content)`
- [ ] Guid smoke：001754 库存 → 追问确认 → 正确「有料、无库存」
- [ ] 回归：空 `session/prompt` 仍 early-return（现有守卫不破坏）
- [ ] unit/contract 覆盖哨兵剥离或禁止写入
- [ ] execution-plan lint PASS；Contract Verification 记录证据
