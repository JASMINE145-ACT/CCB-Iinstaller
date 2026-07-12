# PRD — Work Tasks RBAC 闭环（Manager / Employee）

> **Task:** `07-12-work-tasks-rbac-closed-loop`  
> **Status:** ready_to_implement (Q1=B + Q2=A locked 2026-07-12)  
> **Priority:** P1  
> **Date:** 2026-07-12  
> **Parent:** `07-09-agent-work-tasks-collaboration-system`  
> **Related:** `07-12-work-tasks-accept-acl`（ACCEPT_ACTOR.001 Option A 已落地）

## Goal

从**完整逻辑闭环**定义「谁可以做什么 / 谁不可以」，统一：

1. **角色** `manager` | `employee`
2. **关系** `creator` | `assignee` | `unrelated`
3. **生命周期** 创建 → 接受 → 执行 → 完成/未完成/推迟
4. **人机双通道** UI `/tasks` + MCP `work-tasks-agent` 同一后端契约

产出：一张可测试的权限矩阵 + 契约 `WANd.TASKS.RBAC_MATRIX.001`，再对照代码补齐缺口（含 UI 门禁与 VPS）。

## What I already know

* Accept = assignee-only（`WANd.TASKS.ACCEPT_ACTOR.001` Option A）已实现；UI smoke 可验；API Forbidden 需 VPS 部署
* 粗粒度 `TaskAccess` 在 `rbac.rs`；状态边额外 `can_apply_status_transition`
* Org 真源 = VPS `org-server.json`；employee `/tasks` 走 `orgHttpBridge`
* MCP 矩阵见 07-09（create/edit/query）

## Assumptions (temporary)

* 不引入部门树 / `is_admin` 公司级 scope（仍归 EIL 07-14）
* 不引入「代接受」按钮（已否决 Option C）
* Agent 不得绕过后端 RBAC（JWT actor only）

## Open Questions

* **Q1** — **LOCKED = B**（任意 Manager 团队运维）
* **Q2** — **LOCKED = A**（任意 manager 可关单）

## Requirements (locked MVP)

* R1: AS-IS 矩阵文档 — done
* R2: TO-BE = Q1=B + Q2=A + Accept assignee-only
* R3: Backend：任意 manager → Read / UpdateMeta / Delete / UpdateStatus（除 accept 边）
* R4: UI helpers 同构；MCP 不越权
* R5: Spec `RBAC_MATRIX.001` + `MANAGER_READ.001`；VPS 部署后 smoke

## Status

**ready_to_implement** — 说「执行」后按 `execution-plan.md` P1→P5 开工。

## Out of scope (v1)

* Department-scoped query
* Bulk accept / force-accept
* Cron / team_tasks merge
* Changing JWT / SSO identity model
