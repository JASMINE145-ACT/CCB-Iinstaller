# PRD — CCB personal memory 自动沉淀（Thinking-primary · 1.1.7）

**Status:** in_progress (P5 done; P6 Memory sider **implemented**; manual smoke open)  
**Release:** **1.1.7**  
**Task:** `07-06-ccb-memory-auto-accumulation`

## Goal

**Personal only · 纯自动 · 后台并行 · 轻提示 ·（P6）可浏览编辑**

1. Stop / SubagentStop **入队后台任务**（不阻塞下一轮对话）
2. 后台 **minimax-m3-thinking** 提炼 → `memory/personal/workflow.md`
3. 前端学习横幅：「Agent 正在学习记录您的习惯」
4. **（P6）侧栏「记忆」** — 对齐知识库/价格库；页内 **personal / business** 切换，展示 memory 文件

## Personal 两层 + UI

| 层 | 载体 | UI |
|----|------|-----|
| 档案 | Settings `employee-profile.json` | 设置 → 个人信息 |
| 习得偏好 | `memory/personal/*.md` | **侧栏记忆 → personal** |
| 业务记忆（手动/agent） | `memory/business/*.md`（可空） | **侧栏记忆 → business** |
| 组织 SOP | org-knowledge | 侧栏知识库 |

## Acceptance criteria

### P4–P5 (auto-learn)

- [x] Seed, thinking worker, banner, unit tests
- [ ] Manual smoke: non-blocking + banner + workflow append

### P6 (Memory sider)

- [x] Sider entry **记忆**，样式与知识库/价格库对齐；位于知识库与价格库之间
- [x] Route `/memory`；Tabs **personal | business**
- [x] personal：列出并打开 `profile.md` / `workflow.md`（可编辑保存）
- [x] business：有文件则列出；无则空态（不自动 seed business）
- [x] IPC path jail：不可读写 `memory/` 外路径
- [x] CCB authority 下显示入口
- [ ] Manual UI smoke

## Non-goals

- business 自动沉淀（仍后续 phase）
- 记忆与知识库合并为同一页
- 写入前确认（保持 P5 纯自动）

## References

- P6: [`research/memory-sider-ui-design.md`](./research/memory-sider-ui-design.md)
- P5: [`research/thinking-extract-design.md`](./research/thinking-extract-design.md)
- Plan: [`execution-plan.md`](./execution-plan.md) (rev 5)
