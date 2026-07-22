# Feature matrix — 2.0.1 (delta on 2.0.0)

> Template: `wanding-release-standard.md` §8.1. Baseline matrix: `07-18-release-2.0.0/feature-matrix-2.0.0.md`.

## Carry-forward (must stay IN)

| # | Feature | Contract | Preflight |
|---|---------|----------|-----------|
| F0a | Stale-purge installer | `WANd.INSTALL.STALE_PURGE.001` | `test-purge-packaging-wiring.ps1` PASS; NSI DirectoryLeave + File cmds present |
| F0b | InstallDir resolve | `WANd.INSTALL.RESOLVE.001` | shipped via AionUi pack (2.0.0+) |
| F1–F11 | 2.0.0 full bundle rows | — | inherit wiring; rebuild staging |

## 2.0.1 delta

| # | Feature | Source | ①–③ | Notes |
|---|---------|--------|-----|-------|
| D1 | learn-by-data select-first | `quotation-learn-by-data/SKILL.md` + L1 | seed skill + agents | gen 9 refresh |
| D2 | inventory multi-code batch | `quotation-agent.md` | agents seed | |
| D3 | accurate readonly / ROE | accurate L1 + `accurate-agent.json` ROE | agents + subagent-gate skill | |
| D4 | field-rule `/` phrase parse | `wanding_fuzzy_matcher.py` | vendor python | Elbow 3" |
| D5 | config_generation 9 | `seed/config-ship-manifest.json` | seed | forces agent/skill reset on upgrade |

## config_generation

8 → **9**
