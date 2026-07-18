# Smoke — WANd.ACP.USER_TURN.001 / inventory reply

> **验收顺序：** Case B（历史）→ Case D（unit，开发）→ Case A（库存业务）→ Case C（非库存通用）。  
> **禁止**仅 Case A PASS 且无 Case B/D 就宣称任务完成。

## Case B — transcript / API（P0 根因证据）

1. 复现至出现「no content」偏航或工具成功后立即导出。  
2. Grep model-facing messages：user text `"(no content)"`。  
3. **PASS（进入 Phase 2 的充分条件）：** 命中且时刻在 tool/Agent 后。  
4. **替代路径：** 无命中 → 写假说2证据，不得假装哨兵已证伪而不记。

## Case D — unit（开发，可交付硬门槛）

| 输入 | 期望 | Status 2026-07-14 |
|------|------|-------------------|
| user text = `(no content)` | normalize / API 视口 **0** 命中 | **PASS** — `messages.test.ts` USER_TURN.001 |
| 空 `session/prompt` | 仍 early-return（现有守卫） | **PASS** — `agent.test.ts` empty + whitespace |
| image-only / resource-only user | **保留**，不得当空删 | **PASS** — image-only retained |

命令：

```powershell
cd D:\claude-code-B
bun test src/utils/__tests__/messages.test.ts
# 69 pass
bun test src/services/acp/__tests__/agent.test.ts -t "empty prompt|whitespace-only"
# 2 pass
```

## Case A — 库存存在但为 0（业务闭环，排在 USER_TURN 后）

> **2026-07-14 收口：** 回滚 strip 后用户确认 **有终答**（001754 表 + 库存为 0）。  
> 这证明「不回复」回归已解除；**不**等同 USER_TURN.001 PASS。

1. 新开 **万鼎报价专家** Guid  
2. `001754 查询该编号的库存`  
3. 期望：编码 + 品名 + 库存数字（可为 0）  
4. 追问：`的确是有的对吧只不过是没库存？`  
5. **PASS（回复能力）：** 有综合文字（2026-07-14 ✅）  
6. **PASS（USER_TURN）：** 仍须无「(no content)」偏航 — **pending / deferred**


## Case C — 非库存通用（防专用补丁）

1. 任意非库存成功工具路径（如查价/档位或 Agent 完成）。  
2. 紧随真实追问一句业务确认。  
3. **PASS：** 不出现空用户偏航话术；回答贴合 tool_result。
