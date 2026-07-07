# Execution Plan — `07-06-skill-fusion-scenario-expansion`

| Field | Value |
|-------|--------|
| **Status** | completed |
| **Scenario** | K（文档/规格类变更 — 本次升级对象即 skill 文档本身） |
| **Plan depth** | Standard |
| **Verification profile** | Fast |
| **Active phase** | done |

## Skills invoked (this session)

| 调用 | 类型 | 证据 |
|------|------|------|
| superpowers:writing-skills | Skill: | 载入 skill 编写纪律 → 决定"重参考独立文件 + SKILL.md 挂载 + rationalization 表"结构 |
| superpowers:using-superpowers | Skill: | SessionStart 注入，据其元规则触发 writing-skills |
| 四体系清单盘点 | Bash/Glob | ~/.claude/skills、.claude/skills、.agents/skills、.cursor/skills 实测；openspec-* 仅存在于 .cursor/skills 且不在 Claude Code Skill 清单（矩阵中所有条目均以此核实） |
| openspec-* frontmatter | Read: | 5 个 openspec skill 的 name/description/CLI 依赖已核实 |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 盘点 | done | 四体系真实可调用清单（见上） |
| P1 skill-selection.md | done | `.cursor/skills/trellis-task-execution/skill-selection.md`：§一 per-harness 调用机制、§二 12 维裁定矩阵+降级链、§三 场景 F–L playbooks、§四 rationalization 表+red flags、§五 evidence 格式 |
| P2 SKILL.md 升级 | done | 场景表 A→A–L；Step 1b 换 harness 感知调用表 + 裁定速览；cheat sheet/anti-pattern/user-trigger 扩充；消灭 "if on disk"（仅存反例引用） |
| P3 命令入口升级 | done | `.cursor/commands/trellis-plan-execution.md`：Real invocation 三类型、场景表 A–L、证据前缀要求 |
| P4 三镜像同步 | done | `diff -q` 全 IDENTICAL（.cursor/.claude/.agents；.claude 原落后一版已追平） |
| P5 验证 | done | grep 无残留 "if on disk"（除反例）；所有被引用文件存在；内联 spec 合规审查 R1–R6 全过 |

## TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| docs-only | N/A（理由：markdown 参考文档，无运行时行为） | 基线 = 用户观察「没有真实调用的存在」+ 旧表 "if on disk" 措辞 | grep + 文件存在性校验（见 P5） | 引用完整性、三镜像一致 |

## Defer / out of scope

- docs/ai-tools-reference.md §六 与新矩阵的双向互链（内容不冲突，交叉引用可后续补）
- 用 subagent 做 pressure-test 验证新 rationalization 表的约束力（writing-skills 的完整 RED-GREEN 循环）
- git commit（等用户指示）
