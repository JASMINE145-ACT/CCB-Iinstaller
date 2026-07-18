# Review acceptance — Phase 1 强化（2026-07-14）

来源：系统审查「选 B」——先证据链与源文件，再谈可交付修复。

| Review risk | Plan response |
|-------------|---------------|
| 无 dump 就修 | Phase 1 **hard gate**；Phase 2 入口条件 = dump 命中或书面假说 2 |
| createUserMessage 定义不可见 | `research/source-of-truth.md` → `D:\claude-code-B\src\utils\messages.ts` |
| 只改 ACP empty guard | 明确 **不够**；合同测 normalize/history strip |
| check.jsonl 缺 backend ACP | 已补 `acp-session-flow.md` + source-of-truth |
| inventory mitigation 掩盖 P0 | 验收顺序：**USER_TURN.001 先** → 再 001754 smoke |
| image-only 误删 | TDD 显式矩阵：empty-text / image-only / resource-only |

成熟度目标：MVP plan → **可交付修复**（有 dump + SoT + unit + 业务 smoke）。
