# System Review Adoption — 2026-07-15

独立采纳用户粘贴的 System Review Report（非全盘照抄冲突项）。

## Adopted

| Review item | Action in task |
|-------------|----------------|
| 未到默认可切单入口 | PRD / plan：MVP 前门禁；G2 blocked |
| 「委派发生」≠「业务交付」 | `WANd.ORCH.ORACLE.001`；DISPATCH 验收改 oracle |
| Path B 自身 FAIL，不可唯一真理 | LD1；Path B 辅助对照 |
| smoke 不足四类交付 | D1：报价/账务/任务读/Word 四行 |
| 07-04 Case1≠Case3 | D2a / D2b 分治 |
| price-library Guid-only | LD4 + `WANd.GUID.ADMIN_ESCAPE.001`；禁止全隐 |
| 勿清空 custom guid_primary | LD5；filter = WanD shortcuts only |
| sidechain + 超时 | D3 计时三截：dispatch / first Agent / business result |
| 写操作边界 | LD6：MVP read-only；写后置 W 轨 |
| 计划状态混乱 | **唯一真相** = `execution-plan.md`；PRD=planning 等 D1 |
| B1 deferred | P2 debt，不挡 MVP |
| pi pin 非可执行策略 | O 保持 docs-only |

## Rejected / deferred differently

| Item | Why |
|------|-----|
| 立刻「执行 D2 harden」 | 评审自己要求 **先 D1 矩阵**；本计划 D2 门后置 |
| 把 Word 算进 read-only 同批无条件 | Word 有副作用 → 矩阵可列，但 oracle 须含产物；**默认可 skip 至 W 轨**若用户改只做读 |
| 重新开 guid 独立 task | 已合并；子壳 done |

## User override 2026-07-15（Guid 零卡）

系统评审曾建议保留价库 Guid 卡与 custom。**用户明确：全去掉，不要保留。**

| 原建议 | 现合同 |
|--------|--------|
| 保留 `price-library-agent` Guid 卡 | **隐藏**；价库走侧栏/页面 |
| 保留 custom `guid_primary` 卡 | **隐藏** |
| 禁止清空 catalog | 仍禁止动 **Team/Settings**；仅 Guid 面置空 |

风险：主入口 **不能** `Agent(price-library-agent)`（Guid-only）。验收改挂在 **G：侧栏价库可达**，不挂在 Guid 卡。
