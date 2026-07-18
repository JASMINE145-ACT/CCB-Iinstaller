# Closure — 2026-07-14（回滚收口）

## 用户确认

截图：回滚后 `001754` 库存查询 **有最终文字回复**（Thinking / 非 Thinking 均 OK），子 Agent + `get_inventory_by_code` 正常，可用/仓库库存为 0。用户：「解决了 收口！」

## 本轮结论

| Item | Verdict |
|------|---------|
| 「不回复」回归 | **RESOLVED** — 全量回滚 `messages.ts` strip/pairing 改动 + redeploy |
| `WANd.ACP.USER_TURN.001` | **未交付** — 宽 strip 在 MiniMax 上伴随父会话 `400 (2013)` 无终答 |
| Live SoT | `D:\claude-code-B\src\utils\messages.ts` = pre-fix HEAD；`D:\CCB-Wanding\dist` 无 `isNoContentOnlyUserMessage` |

## 证据链

- 失败 transcript：tool_result 后 `API Error: 400 invalid params, 400 (2013)`（见 `research/regression-no-reply-400.md`）
- 回放 normalize+pairing：id 对齐，结构看似合法 → 宽改动仍不安全上 MiniMax
- 回滚后 UI smoke：用户截图 PASS（有表 + 结论文案）

## 明确不要做

- 不要在未做 MiniMax 续跑 smoke 前再上「全局 skip sentinel user / 改 ensureToolResultPairing 空分支」
- 不要用库存 ROE 单独宣称 USER_TURN 完成

## 下次重开（窄方案）

1. 仅在 `mergeUserMessages` / 连续 user merge 时剥 `(no content)` **文本块**，不 drop 整条 user  
2. **禁止**改 pairing 空分支（保留 alternation spacer）  
3. Unit + **MiniMax**：tool 成功后必须有非空终答，再 Case A/C

## Task status

→ **`deferred`**（哨兵根因仍在；本轮交付仅为回归恢复）
