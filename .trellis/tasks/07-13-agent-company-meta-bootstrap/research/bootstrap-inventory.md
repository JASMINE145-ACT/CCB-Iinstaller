# Bootstrap inventory — what to copy vs forbid

**Date:** 2026-07-13（修订：System Review Phase 1 门禁）  
**Task:** `07-13-agent-company-meta-bootstrap`

## Copy into meta and/or platform (tooling only)

| Source (CCB) | Target | Notes |
|--------------|--------|-------|
| `.agents/skills/trellis-*` | `meta/.agents/skills/` (+ optional platform) | Workflow spine only |
| `.cursor/agents/code-reviewer.md` | meta + platform | **Must retarget** Layer A/B paths → platform `.trellis/spec/...` |
| `.cursor/rules/code-reviewer-agent.mdc` | meta + platform | Retarget absolute Superpowers path OK if machine-local |
| `.cursor/skills/trellis-*` | meta | Cursor opens meta |
| `.cursor/commands/trellis-*.md` | meta | plan-execution / finish-work |
| `.trellis/scripts/` | platform (+ optional meta) | `task.py`, lint, get_context |
| `.trellis/workflow.md` | platform | Rewrite product name; strip WanD release Scenario J as required |

### Retarget acceptance (TOOLING_BOOTSTRAP)

After copy, produce `platform/docs/bootstrap-retarget-report.md` listing:

1. Every file copied (source → dest)  
2. Every path string rewritten (old → new)  
3. Explicit **not copied**: `.trellis/spec/backend/**`, `ccb-installer/**`, WanD agent md  

GREEN: report exists; `check-no-wanding-core-terms` PASS on `platform/.trellis/spec` and `platform/AGENTS.md`.

## Do NOT copy as platform core

| Source | Why |
|--------|-----|
| `ccb-installer/packages/vertical/com.wanding.trade/**` | L4 later, not core |
| CCB `AGENTS.md` wholesale | Rewrite L1–L3 |
| `.trellis/spec/backend/**` / `frontend/**` WanD paths as mandatory core | New product specs only |
| Fixed Agent/MCP IDs in platform allowlists | §0.1 L3 |
| `D:\CCB-Wanding` assumptions | Sample only |
| NSIS / build-wanding as platform release | Deferred |

## Forbidden terms (platform core — scan scope)

Scan these roots (fail on match unless allowlisted file):

- `platform/packages/`
- `platform/control-plane/`
- `platform/runtime-adapters/`
- `platform/scripts/` (**except** allowlisted scanner + fixture paths below)
- `platform/.trellis/spec/`
- `platform/AGENTS.md`
- `platform/package.json` / `Cargo.toml` / `pyproject.toml` if present

### Scanner self-scan allowlist (P1 — mandatory)

Boundary scripts **must not fail on themselves**. Default exclude (always):

| Path | Why |
|------|-----|
| `platform/scripts/check-no-sample-import.mjs` | Contains patterns it searches for |
| `platform/scripts/check-no-wanding-core-terms.mjs` | Contains forbidden-term list as data |
| `platform/scripts/__fixtures__/**` | RED fixtures only; scanned when `--include-fixtures` |

Implementation rule: build file list → **drop allowlisted paths** → then match. Do not `rg` the whole `scripts/` tree blindly.

Optional later: `platform/scripts/lib/scan-allowlist.json` shared by both scripts.

**Forbidden substrings (minimum):**

```text
quotation-agent
accurate-agent
price-library
wanding_business_knowledge
D:\CCB-Wanding
D:/CCB-Wanding
com.wanding.trade
```

Note: `com.wanding.trade` is forbidden in **platform core** paths above; it **is** allowed later under `platform/packages/com.wanding.trade/` once L4 extract task lands. During bootstrap, do not create that package body yet — only empty `packages/.gitkeep`.

## Docs migrate (MVP = snapshot copy)

| Doc | Target | Policy |
|-----|--------|--------|
| `docs/platform-system-business-decoupling-optimization.md` | `platform/docs/platform-system-business-decoupling-optimization.md` | **Copy snapshot** + header source path + date |
| `公司组织/prd.md` | `platform/docs/company-org/prd.md` | Same |
| — | `platform/docs/source-map.md` | Lists each copy source → dest → date |

No live symlink to CCB for MVP (avoids path coupling). Future: optional docs submodule.

## Boundary lint — sample-ccb / claude-code-best

### Scan scope (FAIL)

| Globs / dirs | Patterns |
|--------------|----------|
| `platform/packages/**` | `sample-ccb`, `claude-code-best` |
| `platform/control-plane/**` | same |
| `platform/runtime-adapters/**` | same |
| `platform/scripts/**` except `__fixtures__` | same |
| `**/package.json`, `**/Cargo.toml`, `**/pyproject.toml`, `**/.gitmodules` under platform | path refs to sample-ccb / absolute CCB |

Also fail on: `require(`, `import `, `from '`, `from "`, `include!`, `path =` lines that contain those patterns.

### Allowlist (OK)

| Path | Why |
|------|-----|
| `platform/README.md` | Document L4 reference |
| `platform/AGENTS.md` | Explicit “CCB is L4 only” narrative |
| `platform/docs/**` | Authority docs may name CCB |
| `platform/docs/source-map.md` | Provenance |
| `platform/scripts/check-no-sample-import.mjs` | **Self-scan allowlist** |
| `platform/scripts/check-no-wanding-core-terms.mjs` | **Self-scan allowlist** |
| `platform/scripts/__fixtures__/**` | Only via `--include-fixtures` |

### RED fixture

Plant `platform/scripts/__fixtures__/bad-import.mjs` containing `require('../../sample-ccb/foo')` — script must **detect** when run with `--include-fixtures`; default run excludes fixtures and stays GREEN on clean tree.

## sample-ccb read-only smoke

```powershell
git -C sample-ccb status --short   # MUST be empty after bootstrap
# README: never commit from meta for sample-ccb content; only bump submodule pointer intentionally
```

## Three-repo git status checklist

| Repo | Expected after clean bootstrap |
|------|--------------------------------|
| `agent-company-meta` | clean or only intentional meta files |
| `platform` | clean after initial commit |
| `sample-ccb` | `status --short` empty (read-only) |
