# Execution Plan — `07-06-employee-profile-settings-prompt`

| Field | Value |
|-------|--------|
| **Status** | `completed` |
| **Approved** | 2026-07-05 — profile tab above system; auth prefill; dev-only |
| **P9 plan** | 2026-07-05 approved via「执行」— subagent injection |
| **Scenario** | D (cross-repo lite) → P9 is **backend-only** (claude-code-B) |
| **Plan depth** | Full |
| **Verification profile** | UI (v1/P8) · **Standard + manual** (P9) |
| **Repos** | `aionui-src` (P1–P8) + `claude-code-B` (`runAgent` P9) + `claude-code-best` (spec/Trellis) |
| **Active phase** | **completed** — AC1–AC9 PASS (user smoke 2026-07-05) |

**PRD:** [`prd.md`](./prd.md) · **Smoke:** [`p5-dev-smoke-done.md`](./p5-dev-smoke-done.md) · **Explore:** [`research/explore-subagent-employee-profile-2026-07-05.md`](./research/explore-subagent-employee-profile-2026-07-05.md) · **Test records:** [`test-records.md`](./test-records.md)

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements / PRD | `trellis-brainstorm` | available | This explore session + `prd.md` |
| Spec read | `trellis-before-dev` | available | Read `frontend/index.md`, `acp-session-flow.md` |
| UI implementation | TDD → inline edit | available | Manual component + `bun test` |
| Backend ACP merge | `trellis-implement` | available | Inline edit `agentSessionProfile.ts` |
| Code review | `code-reviewer` agent | available | Inline review checklist |
| Spec compliance | `trellis-check` | available | Manual AC walk |
| route-b deploy | `build-deploy-verify.md` | available | Manual `route-b-sync` |
| Packaging | `build-wanding.ps1` | available | Defer to user-chosen release |

---

## Scenario classification

**Scenario D-lite** — two implementation repos with a **serial merge** at the handoff contract:

| Workstream | Repo | Risk tags |
|------------|------|-----------|
| A — Settings UI + storage | aionui-src | `ui` |
| B — Profile sync handoff | aionui-src (main) | `cross-repo` |
| C — Backend prompt merge | claude-code-B | `cross-repo`, `security` (PII) |
| D — Spec + docs | claude-code-best | — |

---

## Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| User approves plan | — | `Status: approved` |
| `task.py start 07-06-employee-profile-settings-prompt` | Trellis | `in_progress` |
| `trellis-before-dev` | spec | Notes: Settings tab pattern §6, acp-session-flow § assistant profile handoff |
| Confirm open questions in PRD | user | Tab id, prefill, release target |

---

## Phase 1…N — Workstreams

| Phase | Priority | Workstream | Risk | Tool / agent | Files | Required output | Profile | Notes |
|-------|----------|------------|------|--------------|-------|-----------------|---------|-------|
| **P1** | P0 | **A — Settings tab + form** | ui | TDD | `SettingsSider.tsx`, `SettingsPageWrapper.tsx`, `Router.tsx`, `EmployeeProfile*`, `configKeys.ts`, i18n | Form saves `user.employeeProfile`; nav entry visible | UI | Insert before `system` under `settings.groupApp` |
| **P2** | P0 | **B — Sync to CCB config dir** | cross-repo | TDD | `ccbEmployeeProfileSession.ts`, `warmupConversation.ts`, call on `configService.set` | JSON at `.claude/employee-profile.json`; warmup re-stages | Standard | Mirror `ccbAssistantProfileSession.ts` |
| **P3** | P0 | **C — Backend merge into prompt** | cross-repo, security | TDD → trellis-implement | `employeeProfile.ts`, `agentSessionProfile.ts`, `agent.ts` | `userContextOverride.claudeMd` includes `## 当前用户` block | Standard | **Merge**, not replace assistant context |
| **P4** | P1 | **D — Tests** | — | bun test / vitest | `employeeProfile.test.ts` (both repos) | RED→GREEN evidence | UI | Include specialist-session coexistence case |
| **P5** | P1 | **E — route-b + manual smoke** | packaging | route-b-sync | dist deploy | New chat knows user identity | UI | Kill aioncore; new conversation |
| **P6** | P2 | **F — Optional prefill from auth** | ui | defer OK | `AuthContext`, form init | Username → displayName suggestion | UI | Only if user wants in v1 |
| **P7** | P2 | **G — NSIS ship** | packaging | defer | `build-wanding.ps1` | Installer artifact | Release | User decides 1.1.6 or later |
| **P8** | P1 | **H — 日常称呼内化** | ui | TDD | `employeeProfileShared.ts`, `employeeProfile.ts`, optional `addressName` in form + i18n | Prompt block mandates natural name use; smoke:「好的嘉诚…」 | UI | See §P8 design below |
| **P9** | P0 | **I — Subagent 注入** | cross-repo | TDD → trellis-implement | `employeeProfile.ts` (idempotent merge), `runAgent.ts`, sync script | Agent-tool subagents get `# 当前用户` block | Standard | See §P9; **await approve** |

---

## P9 — Employee profile for all Agent-tool subagents (draft)

**User request (2026-07-05):** Profile must inject into **main agent and all subagents**, not only session main.

**Explore:** [`research/explore-subagent-employee-profile-2026-07-05.md`](./research/explore-subagent-employee-profile-2026-07-05.md)

### Design (Option A)

1. **`mergeEmployeeProfileIntoResolvedUserContext(resolved, configDir?)`** in `employeeProfile.ts`
   - If `claudeMd` already contains `# 当前用户 / Current user` → return as-is (idempotent)
   - Else `appendEmployeeProfileToUserContext(resolved, configDir)`
2. **`runAgent.ts`** — after `resolvedUserContext` (post-`omitClaudeMd`), assign:
   `resolvedUserContext = mergeEmployeeProfileIntoResolvedUserContext(resolvedUserContext) ?? resolvedUserContext`
3. **Sync script** — copy `runAgent.ts` from overlay path:
   `ccb-installer/claude-code-b-src/packages/builtin-tools/src/tools/AgentTool/runAgent.ts`
   → `D:\claude-code-B\packages\builtin-tools\src\tools\AgentTool\runAgent.ts`
4. **No aionui change** — same `employee-profile.json` handoff
5. **Do not** pass full parent orchestrator `claudeMd` (avoids L0 bleed)

### P9 acceptance (AC9)

- [ ] Unit: merge idempotent; empty profile no-op; works when base has no `claudeMd` (omitClaudeMd path)
- [ ] Deploy: dist Agent path includes employee merge (or marker after profile file present)
- [ ] Manual: orchestrator delegates to specialist → subagent path knows address name / identity
- [ ] No regression: session/new main agent still works; specialist direct session still works
- [ ] Spec: `acp-session-flow.md` + `agents-unified-model.md` note subagent merge
- [ ] Row in [`test-records.md`](./test-records.md)

### P9 TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| Idempotent merge | unit | second merge doubles block | `employeeProfile.test.ts` | marker skip |
| omitClaudeMd base | unit | no profile when only currentDate | same | employee becomes sole `claudeMd` |
| Sync copies runAgent | script/smoke | deploy without runAgent | sync script lists file | dist rebuild |
| Manual delegate | manual | subagent unaware of 嘉诚 | UI smoke § test-records P9 | main-only path unchanged |

### P9 gate chain

**Selected: Standard + manual**

1. code-reviewer on `employeeProfile.ts` + `runAgent.ts` + sync script
2. Backend unit tests (employeeProfile) + deploy build suite
3. Manual smoke per `test-records.md` § P9
4. `trellis-update-spec` → `acp-session-flow.md`, `agents-unified-model.md` (context asymmetry row)
5. `implement.jsonl` + `check.jsonl` + PRD AC9 `[x]` + `test-records.md` rows
6. `/trellis:finish-work` when AC8+AC9 both PASS — **no commit unless asked**

### P9 recovery

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Circular import `builtin-tools` → `acp` | Extract shared helper under `src/services/acp` only; import path `src/services/acp/employeeProfile.js` | If move to new package |
| Sync omits runAgent | Fix script; redeploy | No |
| Double block in transcripts | Strengthen idempotent marker | No |
| User wants Explore/Plan excluded | Filter by `agentType` | Yes (AC change) |

---

## P8 — Name-aware conversational tone (planned)

**User request (2026-07-05):** Agent should address user by name in normal dialogue (e.g. 好的嘉诚，还有什么事情么), not only when asked「我是谁」.

### Design (minimal diff)

1. **`formatEmployeeProfileClaudeMd`** — replace weak line with behavior contract:
   - Derive **日常称呼** from optional `addressName` field, else last 2 chars of Chinese `displayName`, else full `displayName`.
   - Instruct: use address name in greetings, confirmations, handoffs; **do not** repeat full profile table unless user asks identity/who-am-i.
   - Cap frequency: natural (1–2 per turn max), avoid robotic repetition.

2. **Settings UI (optional)** — field「日常称呼」under 姓名, placeholder「留空则自动取姓名后两字（如 祐嘉诚 → 嘉诚）」.

3. **No orchestrator system_prompt edit** — keep injection in employee profile block only (same merge path).

4. **Tests** — `employeeProfileShared.test.ts`: address derivation + behavior lines present.

5. **Deploy** — same as P5: sync overlay → build → route-b → new chat smoke.

### P8 acceptance

- [ ] New chat, user says「查一下库存」→ assistant reply includes 嘉诚 (or configured address) without listing full profile
- [ ] User asks「我是谁」→ still returns structured fields (no regression)
- [ ] Empty profile → generic 您/你, no fake name

---

## TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| A — form + config key | unit | missing key throws / form validation | `cd aionui-src && bun test employeeProfile` | configService typed keys |
| B — handoff write | unit | file not written when CCB dir missing | same + mock fs | assistant profile handoff unchanged |
| C — markdown merge | unit | assistant claudeMd lost when employee set | `vitest agentSessionProfile.test.ts` (backend) | specialist session still gets date + employee |
| C — empty profile | unit | no override when all fields empty | same | default getUserContext unchanged |
| UI smoke | manual | — | dev: fill profile → new chat → ask「我是谁」 | chat bubble has no profile text |
| P8 address tone | unit + manual | missing behavior line | `employeeProfileShared.test.ts` + new chat task prompt | no profile dump on mundane turns |

---

## Verification profile and gate

**Selected: UI**

Gate chain (serial):

1. **code-reviewer** agent on full diff (aionui-src + backend)
2. `cd D:\Projects\aionui-src && bun test` (targeted + no regressions on settings tests)
3. Backend unit tests for `resolveSessionUserContextOverride` / new merge helper
4. **Manual UI smoke** (required):
   - 设置 → 个人信息 → 填写 → 保存
   - 新开对话 → 「请用一句话说明我是谁、什么部门」
   - 确认回复正确；F12 可见用户消息无 profile 原文
5. route-b sync + repeat smoke on packaged path (if shipping)
6. `trellis-update-spec` → `file-map.md` + `acp-session-flow.md`
7. `implement.jsonl` + `check.jsonl` + PRD AC `[x]`
8. `/trellis:finish-work` — **no git commit unless user asks**

---

## Parallelization (Scenario D-lite)

| Agent | Scope | Merge rule |
|-------|-------|------------|
| **A** | aionui-src: Settings UI + configKeys + i18n | Land first |
| **B** | aionui-src: handoff sync module + warmup hook | After A defines `EmployeeProfile` type |
| **C** | claude-code-B: read file + merge in agentSessionProfile | **After B** documents JSON schema in PRD |
| **Parent** | Spec updates + integration smoke | Serial after C |

**Never** parallel-edit `agentSessionProfile.ts` and `ccbEmployeeProfileSession.ts` without frozen JSON schema.

---

## Manual steps (human)

- [x] UI smoke: 设置 → 个人信息 → 保存 → 新对话验证 — **PASS** 2026-07-05
- [x] Confirm PII disclaimer copy acceptable
- [x] Dev-only ship (no 1.1.6 NSIS yet)
- [x] P8 / P9 manual smoke — **PASS** 2026-07-05 (user)

---

## Recovery and re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| aioncore starts ignoring handoff | P2 — try `_meta` path or extend handoff TTL | logged warmup + file mtime | If architecture changes |
| Assistant profile clobbered | P3 — fix merge order | failing unit test | No |
| Profile in chat bubble | P1 — remove sendMessage prepend | screenshot | No |
| User wants SSO prefill | P6 or new task | updated PRD | Yes |
| RED test blocked by missing CCB dir in CI | mock `resolveCcbClaudeConfigDir` | test log | No |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 Explore | done | `prd.md` + plan approved 2026-07-05 |
| P1 Settings UI | done | `profile` tab, form, i18n, auth prefill |
| P2 Handoff sync | done | `ccbEmployeeProfileBridge`, warmup hook |
| P3 Backend merge | done | `employeeProfile.ts`, `agentSessionProfile.ts` |
| P4 Tests | done | aionui vitest **8/8** pass |
| P5 Smoke | done | AC3 PASS — `p5-dev-smoke-done.md` |
| P8 Name tone | **done** | user smoke PASS 2026-07-05 |
| P9 Subagent inject | **done** | user smoke PASS 2026-07-05; 54/54; review PASS |
| Gate v1 | done | code-review + deploy + smoke |

---

## Defer / out of scope

- Org-wide admin-managed profiles (HR master data)
- Per-tenant policy enforcement
- Encrypt-at-rest beyond existing client settings store
- WeCom / channel identity linking (see `07-05-wecom-channel-integration`)
- Injecting full parent orchestrator / specialist `claudeMd` into subagents (L0 bleed risk)
- P9 NSIS packaging (dev/route-b only unless user asks)
