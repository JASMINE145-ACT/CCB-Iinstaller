# FE-P0-1 Verification — 2026-07-03

> Task: `06-28-app-startup-readiness-gate` / execution-plan **P2**  
> Parent: `06-30-full-system-review`  
> Spec: `06-28/prd.md` AC 1–5  
> Step 3 audit: `reviews/step-03-frontend.md` (7/10)

---

## Automated pre-checks (done)

| Check | Result |
|-------|--------|
| `ccbStartupReadinessShared.test.ts` | PASS 4/4 |
| `ccbMcpHealthDiagnosis.test.ts` | PASS 9/9 |
| `test-mcp-health.ps1` (quick) | PASS exit 0 |
| Renderer `ccbMcpHealth` import guard | 0 matches |

---

## Manual smoke checklist

### Smoke A — baseline UI

- [ ] `start-dev-full.ps1 -SkipBootstrap` — no main exit 255 / renderer white screen
- [ ] Login → Guid page renders
- [ ] Settings → **能力扩展** — Skills + Tools tabs have content (7/3 white-screen fix)
- [ ] Settings → 模型 / Agents open

### Smoke B — FE-P0-1 AC

| AC | Check | Pass? | Evidence (log path / screenshot) |
|----|-------|-------|--------------------------------|
| **1** | After login, within 2 min: `WanD MCP warmup done: quotation` **before** first `conversation create` | ⏳ | main log: |
| **2** | Guid banner: 配置检查 → MCP 预热 → ready; send disabled until ready | ⏳ | UI: |
| **3** | First message「查询 直接50 价格」— no `Failed to fetch` / `AIONUI_INTERNAL_ERROR` | ⏳ | chat + log: |
| **4** | Config error visible; **one-click repair** available | ⚠️ partial | Banner shows error only — **no repair CTA** (Step 3 P0 gap) |
| **5** | `test-mcp-health.ps1` still PASS after session | ⏳ | run `-Probe` optional |

---

## Gap summary (pre-manual)

| ID | Gap | Severity | P3 candidate? |
|----|-----|----------|---------------|
| G1 | AC1–3 unverified without dev smoke | P0 | No — verify first |
| G2 | AC4 repair CTA missing on Guid banner | P0 | **Yes** — minimal `repairHealth` button |
| G3 | No dedicated startup-readiness smoke script | P1 | Optional script in ccb-installer |
| G4 | BE-P0-2 AUQ orphan UI | P0 doc | P4 or spec-only |

---

## Verdict

| Outcome | Condition |
|---------|-----------|
| **Close FE-P0-1** | AC 1–3 pass + AC5 CLI pass + AC4 accepted or fixed |
| **Enter P3** | G2 fix (repair CTA) + re-smoke |
| **Defer BE-P0-2** | Spec decision before any AUQ code |

---

## Commands to run manual session

```powershell
cd D:\Projects\claude-code-best\ccb-installer\scripts
.\start-dev-full.ps1 -SkipBootstrap -BuildAioncore:$false
# After login — observe Guid banner; capture main process log
# Then: Settings → 能力扩展 smoke
.\test-mcp-health.ps1 -Probe
```

**Operator:** _pending user/dev session_
