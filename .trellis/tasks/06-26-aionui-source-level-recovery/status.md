# AionUi Recovery Status — 2026-06-26

## Summary

**Runtime recovery: ~complete.** Bundled 1.1.2 (Mixing UI + 万鼎 Guid cards) is restorable and usable from `D:\CCB-Wanding`.

**Source-level pipeline: Phase 3 staging validation passed (2026-06-26).** `build-wanding.ps1 -Version 1.1.3-dev -SkipNsis -SkipBuild -SkipAionUiBuild -SkipPipMcp -SkipStagingClear` → manifest validation OK; staging includes `python/system/tool_dispatch.py`.

**Canonical doc**: [`.trellis/spec/guides/mixing-meta-repo.md`](../../spec/guides/mixing-meta-repo.md)

---

## What Was Broken

| Symptom | Root cause |
|--------|------------|
| Old upstream UI (AionUi / Aion CLI / 3D游戏 cards) | Dev launcher (`start-aionui-dev.ps1`) or CCB authority inactive path |
| New UI missing 万鼎报价专家 | Same — need bundled + CCB `settings.json` + agent sidecars |
| Mixing login「连接失败」 | `org-server.json` written with UTF-8 BOM → `JSON.parse` failed → `__orgServerUrl` empty |
| `git restore` aftermath | Architecture refactor lost; `aionui-src` CCB integration mostly untracked |

---

## What Works Now

- `D:\CCB-Wanding\AionUi\` matches `ccb-installer/staging/AionUi` (app.asar SHA256 identical).
- Bootstrap + route-b sync + seed agents deploy OK.
- Agent sidecar: `quotation-agent.aionui.json` → `display_name: 万鼎报价专家`, `guid_primary: true`.
- Org VPS `http://67.216.206.3:13401` reachable; `yjc` login POST succeeds.
- Bundled launch: `D:\CCB-Wanding\ccb-launch-aionui.cmd` → window title **Mixing**, org SSO login.
- One-click recovery script: `ccb-installer/scripts/recover-aionui-new-ui.ps1`.

---

## Fixes Applied This Session

| Change | Location |
|--------|----------|
| Recovery launcher script | `ccb-installer/scripts/recover-aionui-new-ui.ps1` |
| `ORG_SERVER_URL` env fallback | `ccb-installer/ccb-launch-aionui.cmd` (+ synced to `D:\CCB-Wanding`) |
| Strip UTF-8 BOM on read | `aionui-src/.../orgServerConfig.ts` |
| Rewrite `org-server.json` without BOM | `%APPDATA%\AionUi\aionui\`, `%APPDATA%\AionUi-Dev\aionui\` |
| Guid loader matches bundled 1.1.2 | `aionui-src/.../useCustomAgentsLoader.ts` (`isAuthorityActive` branch) |

---

## How To Run (Daily)

```powershell
# Preferred — bundled Mixing UI
D:\CCB-Wanding\ccb-launch-aionui.cmd
# or
.\ccb-installer\scripts\recover-aionui-new-ui.ps1

# Login: org SSO (yjc + employee password from scripts/org-phase0/env.local)
# Do NOT use start-aionui-dev.ps1 for the WanD Guid UI (upstream dev shell)
```

---

## Remaining (Source-Level — Phase 4+)

1. **Full cold build** (no `-SkipBuild`/`-SkipAionUiBuild`): rebuild CCB dist + AionUi win-unpacked from pinned SHAs, then NSIS.
2. **MCP pip on clean build**: run without `-SkipPipMcp` (or document copy-from-runtime for dev iteration).
3. **Dev parity**: bundled shows Mixing branding; dev source may still differ until full rebuild.
4. **Optional**: fix `D:\CCB-Wanding\scripts\ccb-update-auto.ps1` encoding parse error (non-blocking).
5. **Mixing clone smoke**: `git clone --recurse-submodules https://github.com/JASMINE145-ACT/Mixing.git` on a second machine.

---

## Verification Evidence

See `check.jsonl` phases: `baseline`, `source-gap`, `dev-parity`, `ui-recovery`, `org-login-fix`.

Key commands that passed:

- `Get-FileHash` staging vs `D:\CCB-Wanding` app.asar — match
- `POST http://67.216.206.3:13401/login` (yjc) — success
- `bun test tests/unit/common-config/ccbAgentCatalog.test.ts` — pass
- User confirmed: **恢复的差不多** (2026-06-26)

### Git snapshots (2026-06-26, all pushed)

| Repo | Branch | Commit | Remote |
|------|--------|--------|--------|
| `aionui-src` | `ccb-wanding-1.1.2-recovered` | `109aa15` | [JASMINE145-ACT/AionUi](https://github.com/JASMINE145-ACT/AionUi/tree/ccb-wanding-1.1.2-recovered) |
| `CCB-Iinstaller` | `main` | `f8ab39ae` | [JASMINE145-ACT/CCB-Iinstaller](https://github.com/JASMINE145-ACT/CCB-Iinstaller) |
| `claude-code` | `ccb-wanding-1.1.2-recovered` | `238f4635` | [JASMINE145-ACT/claude-code](https://github.com/JASMINE145-ACT/claude-code/tree/ccb-wanding-1.1.2-recovered) |
| `Mixing` | `master` | `5513401` | [JASMINE145-ACT/Mixing](https://github.com/JASMINE145-ACT/Mixing) + tag `v1.1.2-recovered` (real submodules) |

Phase 3 build log: `build-1.1.3-dev-pass2.log` in this task folder.

See `aionui-src-commit-audit.md` for file-level commit/ignore audit.  
Meta-repo templates: `meta-repo/` in claude-code-best; local Mixing at `D:\Projects\Mixing`.  
**Trellis guide**: [`.trellis/spec/guides/mixing-meta-repo.md`](../../spec/guides/mixing-meta-repo.md)

