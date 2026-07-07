# PRD — 07-06 skill-fusion-scenario-expansion

**Goal owner:** user (/goal 2026-07-06)
**Target:** `.cursor/commands/trellis-plan-execution.md` + `trellis-task-execution` skill（三镜像）

## Problem

现有 `trellis-plan-execution` 命令与 `trellis-task-execution` skill 号称融合四大体系
（Trellis / OpenSpec / Superpowers / ECC），但：

1. **没有真实调用**：Superpowers 全部写成 "Read if on disk"，实际在 Claude Code 中
   `superpowers:*` 是 Skill 工具可直接调用的 plugin skill；ECC（`ecc:*` 100+ skills、
   80+ agents）几乎完全缺席；OpenSpec 只在 `.cursor/skills/` 有文件、不在 Claude Code
   Skill 清单中（只能 Read），文档未写清这个平台差异。
2. **没有同功能比对**：四体系在 brainstorm / explore / plan / TDD / debug / review /
   verify 等能力上各有 skill，文档没有"谁更优秀、选谁、何时降级"的裁定。
3. **场景太窄**：只有 A–E 五个规划向场景；debug 深挖、构建失败、重构、安全、性能、
   发布、文档同步、深度研究等场景没有 skill 链路。

## Requirements (AC)

- [x] R1 真实调用协议：按 harness（Claude Code / Cursor / Codex）写清每个体系 skill 的
      **真实调用机制**（Skill 工具名 / Read 路径 / Agent 派发名），消灭 "if on disk" 措辞。
- [x] R2 四体系同功能比对矩阵：≥10 个能力维度，每维度列出四体系候选、裁定（选谁+理由）、
      降级链（fallback chain）。基于本仓库真实存在的 skill/agent（已盘点核实）。
- [x] R3 场景扩充：在保留 A–E 的基础上新增 ≥6 个场景（构建失败/重构/安全/性能/发布/
      文档规格同步/深度研究），每场景给出入口判定 → skill 调用链（真实机制）→ 验证
      profile → 回到 trellis gate。
- [x] R4 保持 trellis task 框架为主干：task.py 生命周期、execution-plan.md、Step 5
      验证链、evidence block 全部保留；新内容以 reference 文件挂载，SKILL.md 不超载。
- [x] R5 三镜像同步：`.cursor/skills/` `.claude/skills/` `.agents/skills/` 的
      trellis-task-execution 内容一致（.claude 当前落后一版，一并追平）。
- [x] R6 命令文件 `.cursor/commands/trellis-plan-execution.md` 同步升级：场景表扩展、
      调用机制表指向新 reference、证据要求覆盖新场景。

## Non-goals

- 不修改 openspec-* / superpowers 插件本身
- 不改 docs/ai-tools-reference.md 的体系介绍章节（仅保持交叉引用一致）
- 不引入不存在的 skill 名（选型表只收录已核实存在者）

## Canonical files

- `.cursor/commands/trellis-plan-execution.md`
- `.cursor/skills/trellis-task-execution/SKILL.md`（+ 新 `skill-selection.md`）
- `.claude/skills/trellis-task-execution/*`、`.agents/skills/trellis-task-execution/*`（镜像）
