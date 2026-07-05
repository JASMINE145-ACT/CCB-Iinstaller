# Platform / Business Architecture Separation — Boundary Map & Classification Guide

**Status:** completed（2026-07-05，Scenario E 零行为变更）
**Created:** 2026-07-05

## 背景与痛点

用户反馈：系统框架（可迁移到其他业务场景的部分）与业务逻辑（万鼎报价/库存等垂直业务）混在一起，代码结构不分明。后果：

1. 做改动时不知道自己是在改「系统架构层」还是「业务层」；
2. 未来向其他业务场景迁移框架时，无法快速识别哪些可以带走。

## 与已有工作的关系（关键前情）

| 已有工作 | 已解决 | 本 task 补的缺口 |
|----------|--------|-----------------|
| `07-03-platform-business-decoupling`（P0–P5 自动化完成，人工验收中） | 产品装配层解耦：manifest、只读 registry、配置编译器、`com.wanding.trade` 垂直包、第二垂直试点 | **代码/目录级**的边界地图与「改动归类」判定标准 |
| `06-25-architecture-business-system-boundaries` | Python/目录边界的早期探索 | 结论需与 07-03 之后的现状对齐 |
| `.trellis/spec/integration/platform-vertical-packages.md` | 目标架构分层与九大改造域 | 缺一份面向日常开发的「这个文件/这次改动属于哪层」速查 |

## 文档关系

| 文档 | 角色 | 与本 task 产物的关系 |
|------|------|---------------------|
| `.trellis/spec/integration/platform-vertical-packages.md` | 目标架构 ADR（layers、九大改造域、P0 红线） | boundary-map 的**上位依据**；归属判定与其 §3/§17 冲突时以 ADR 为准并回写 open question |
| `docs/platform-system-business-decoupling-optimization.md` | 权威设计文档 | 审计判据来源（§17 抽取边界清单） |
| `.trellis/spec/integration/platform-business-boundary-map.md`（本 task 新增） | **日常开发速查**：目录归属 + 改动归类决策树 | 本 task 主交付物 |
| `.trellis/spec/integration/index.md` | spec 索引 | 需新增 boundary-map 入口行（AC6） |

## 目标（本 task 交付）

1. **残留耦合审计**：07-03 之后，仓库中仍属「平台层夹带万鼎业务」或「业务散落在平台目录」的文件清单（含证据行号）。
2. **边界地图 spec**：`.trellis/spec/integration/platform-business-boundary-map.md` —
   目录级归属表（platform / business / mixed→待迁）+ 分层图 + 命名约定引用。
3. **改动归类决策树**：一套 3–5 问的判定流程，让未来任何改动能在 30 秒内归类为
   「架构层 / 业务层 / 需拆分」。
4. **分离 backlog**：对每个 mixed 项给出目标位置、迁移成本、风险、**priority（P0/P1/P2）与 transition-ok 标记**（过渡期可容忍保留）—— 只列清单，**本 task 不搬代码**。

## Non-goals

- 不移动/重命名任何现有代码文件（零行为变更）
- 不重做 07-03 已完成的 manifest / registry / 包化工作
- 不在本 task 内实现新的 lint/CI 门禁（列入 backlog，另开 task）

## Acceptance criteria

- [x] AC1 残留耦合审计落盘 `research/residual-coupling-audit.md`，每条含文件路径 + 证据
- [x] AC2 `platform-business-boundary-map.md` 覆盖仓库全部一级目录（含 ccb-installer 二级）
- [x] AC3 决策树可用：挑选 **5 类 curated commit**（平台脚本 / 业务 Agent / UI / 配置 manifest / 文档 各 1）逐一试归类，全部可判定
- [x] AC4 分离 backlog 每项含目标位置 + 成本估计（S/M/L）+ 风险 + priority + transition-ok
- [x] AC5 现有 registry lint / 平台健康检查照常通过（证明零行为变更）
- [x] AC6 `integration/index.md` 新增 boundary-map 入口行
