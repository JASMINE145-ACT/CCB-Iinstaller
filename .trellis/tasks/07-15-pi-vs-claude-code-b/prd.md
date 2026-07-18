# PRD — 轻量主入口 + Dispatch 完备（pi 借鉴，不换装）

| Field | Value |
|-------|--------|
| **Task** | `07-15-pi-vs-claude-code-b`（合并 `07-15-guid-single-main-entry`） |
| **Priority** | **P1（产品）**；阶段级优先级见 execution-plan |
| **Status** | **done** — MVP closed 2026-07-15（见 `closeout.md`） |
| **Source of truth** | **仅** `execution-plan.md` |

## 合并说明

```text
pi 启示 → 不换装
  → Dispatch 完备（业务 oracle）
  → Guid：助手卡全部去掉（零卡）
```

## Product doctrine（锁）

> **单入口的前提是主入口 dispatch 足够强。**  
> 「强」= **业务交付完整**，不是「出现了 `Agent()`」。  
> Guid **不要任何助手快捷卡**（含价库卡、自建助手卡）；只留主入口对话。

## Locked decisions

| # | Decision |
|---|----------|
| **LD1** | 验收用 **业务 oracle**；Path B 仅辅助（自身也有 FAIL）。 |
| **LD2** | 「调用了 Agent」≠ PASS。 |
| **LD3** | **Guid 零卡**：不展示任何助手 shortcut（WanD specialist、价库、用户 custom `guid_primary` **一律不在 Guid 露出**）。Team/Settings catalog **不删**（别处仍可管助手）。 |
| **LD4** | ~~价库 Guid 卡例外~~ **撤销（用户 2026-07-15）**。价库管理走 **非 Guid 卡**路径（如侧栏「数据库 → 价格库」`#/price-library`）；须在 G 阶段核对仍可达。 |
| **LD5** | ~~Guid 保留自建助手卡~~ **撤销**。自建 agent 不在 Guid 露卡；需要时由主入口/其它入口处理（产品后补）。 |
| **LD6** | MVP 业务行优先 **read-only**；写操作后置。 |
| **LD7** | pi packaging **docs-only**。 |
| **LD8** | B1 View Steps meta 不阻塞 MVP。 |
| **LD9** | 零卡 **仅在 D 矩阵 PASS 后默认开启**；此前 flag 默认 off，或始终可开测。 |

## Goals

| Track | Goal |
|-------|------|
| **R** | pi 不换装 |
| **D** | Path A 业务 oracle 稳定 |
| **G** | Guid **零卡** + 默认主入口；价库 UI 仍从侧栏进 |

## Non-goals

- 换 pi / 砍 ACP 权限  
- 从磁盘删除 specialist / MCP（委派目标仍在）  
- 清空 Team/Settings 助手目录  
- 以 Path B 为唯一真理  

## Acceptance

### Research（done）
- [x] pi + dispatch 探查 + Guid baseline  

### Dispatch（D1→D3）
- [x] **D1** `mvp-matrix.md` 锁四行 + 环境钉 + eval 映射（2026-07-15）  
- [x] **D2** Case1 / Case3 分治修复  
- [x] **D3** 计时 + R1–R3 跑绿  

### Guid（G）
- [x] Guid 助手区可空（G1 flag；G2 **默认 on**，`ccb_guid_zero_card=0` 可 opt-out）  
- [x] 默认发送 → `wande-orchestrator`（已有；D3 矩阵验委派）  
- [x] `#/price-library`（侧栏）价库可达（registry + **UI smoke PASS** 2026-07-15）  
- [~] 历史会话 reopen 身份不漂移 — **收口 deferred**（不挡 MVP；见 `closeout.md`）  

### Deferred（用户确认不做 / 另线）
- [~] 写操作轨；B1 meta；pi pin — **explicitly out**

## Related

- 子壳 `07-15-guid-single-main-entry`（merged）  
- `07-04` 矩阵债 · `07-15-webui-business-parity-exe` AC 修订  
