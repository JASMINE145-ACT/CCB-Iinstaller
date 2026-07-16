# Root cause v2 — 空消息唤醒 + 查询类结果不转述（2026-07-16）

## Evidence source（地面真相，非推测）

AionUi-Dev SQLite `messages` 表，conversation `e899ea1d`（「查询 直接50 价格」，2026-07-16 10:56–11:08），
Claude session `bd3ca06c-019f-4d65-abae-bef82aa06ee7`，runtime = `claude-agent-acp` 0.39.0。
db 快照：session scratchpad `dev.db`。

## Timeline（关键 7 条）

| 时间 | 角色/类型 | 内容 |
|------|-----------|------|
| 10:56:55 | user | 「查询 直接50 价格」 |
| 10:57:06 | Agent tool_result | **子代理完整交付**：`8020020755` 直通 dn50 ¥1,219/个 + 候选表（结果已进父上下文） |
| 10:57:52 | thinking | **"The user sent an empty message"** → 引用 L1 禁令 → 决定「只打招呼、不假设」→ 幻觉 "previous query was already answered" |
| 10:57:54 | text | 空壳「admin，我在的……」（未转述） |
| 11:04:45 | user | 「我没看到结果」 |
| 11:04:50 | text | **完美复述整张价格表（未重新查询）** → 证明结果一直在父上下文 |
| 11:08:38 | thinking | 第二次空唤醒；这次模型自行推理出正确恢复："my last assistant turn didn't include a final text response … subagent returned data but I didn't relay" → 自愈转述库存 |

## Verdict（更新假设表）

| Hyp | Status | Evidence |
|-----|--------|----------|
| H-投递层丢失（唤醒不带 payload） | **排除** | 11:04:50 与 11:08:40 两次无查询完美复述 → 结果一直在上下文 |
| H5 空唤醒回合被误读为用户行为 | **P0 新增** | 后台 Agent 完成 → 父被空 user 回合唤醒（app messages 表无对应 user 行，hidden 也无）→ 模型认知为「用户发空消息」 |
| H6 L1 禁令反噬 | **P0 新增** | 「禁止把未发生的用户行为写进解释」只压住了症状表述，同时压掉了正确恢复（转述）；11:08:38 证明正确行为只差一条正向指令 |
| H7 gate 触发面缺口 | **P0 新增** | `parse_transcript_outcome_relay.py` 只认 `output_path`/.xlsx/`Wanding-Quotation` path 证据；查价/查库存表格结果 `extract_artifact_from_text` 返回 None → 门禁静默（fixture `outcome-relay-no-artifact.jsonl` 即此设计） |

原 H2（父未强制回传）仍成立，但机理细化为 H5+H6+H7 的叠加；原修复（nudge/REJECT）对 fill 类 artifact 有效，对查询类完全不覆盖。

## 因果链（修正用户假设的方向）

```
后台委派完成 → 运行时以「空 user 回合」唤醒父级（空消息来源，非用户所发）
  → L1 禁令 + 保守策略 ⇒ 只打招呼不转述（结果其实已在上下文）
  → 用户看到空壳回复（= 「结果没转送」）
```

「总说发空消息」与「结果没转送」是同一条链的两个侧面；投递层无损。

## Fix directions（建议，均在 ccb-installer 范围内，无需动 aionui-src）

1. **P0 L1 空唤醒协议（正向替代禁令）**：`wande-orchestrator.md` —
   「空触发回合 = 后台委派完成信号：立即检查上一轮 Agent tool_result，若含未向用户转述的业务结果
   （价格/库存/表格/路径），必须完整转述；确无未转述结果才可简短待命。禁止将其描述为用户行为。」
2. **P0 同轮转述**：L1 要求委派时 `run_in_background: false`（单委派场景），tool_result 同轮返回，
   父必须在同轮产出最终文本 → 空唤醒根本不发生。
3. **P1 gate 触发面扩展**：`extract_artifact_from_text` 之外加查询类检测
   （Agent tool_result 含价格/库存/表格 token 且父终稿缺其关键 token → 同策略 nudge/确定性转发）。
4. **P1 eval**：加「查价 直接50」case（断言父泡含价格数字）；空唤醒 fixture。

## Scope impact

- 原 plan 的 trigger 设计（artifact-only）需扩展 → **plan 已锁 A，扩 scope 需用户批准**。
- Guid smoke（Phase 3 pending）应补「查价（无 artifact）」场景。
