# Audit — Purge / NSIS 能否真正解决现场 A+B？(2026-07-16)

## Smoke re-run (installer side)

```text
PASS test-purge-packaging-wiring
PASS test-purge-stale-wanding-installs (6 behavioral + pack wiring)
```

## Original symptoms

| ID | Symptom | Root mechanism |
|----|---------|----------------|
| **A** | `无法读取当前安装版本` | Authority=settings 在；`getContinuitySnapshot` null ← **InstallDir/CLI resolve 失败或错树** |
| **B** | `config check failed: …/.env.accurate, price-library/…` | Health 在 **解析到的 InstallDir** 上查 `required_paths` 失败 |

## What Purge + DirectoryLeave **does** solve

| Scenario | After 2.0.0 NSIS + confirm purge |
|----------|----------------------------------|
| 多根：`Programs` Keep + `D:\CCB-Wanding` / 旧盘符有 VERSION | 其它树 owned 足迹清除；只留 Keep |
| 误装在 `%LOCALAPPDATA%\CCB-Wanding\dist`（与 `.claude` 并列） | dist/vendor 可清；`.claude` 保留 |
| 员工不再从错误快捷方式启动残树 | 减轻 B（不再盯残树缺文件）|

Installer smokes prove purge **behavior**; NSI wiring proves it runs **at directory leave**.

## What Purge alone **does not** solve

### Gap 1 — AionUI resolve 缺 `Programs`（**曾未修；本轮已补**）

`resolveCcbWandingCliPath` 旧候选顺序：

1. `%LOCALAPPDATA%\CCB-Wanding\dist\cli.js`（非官方）
2. `D:\CCB-Wanding\...`
3. **没有** `%LOCALAPPDATA%\Programs\CCB-Wanding\...`

因此即使用户只剩正确 Programs 树：

- Purge 删掉 D:\ / 误装 dist 后  
- resolve 仍可能 **找不到 CLI** → snapshot null → **A 仍可复现**（甚至更纯）

**Fix shipped this audit:** `listCcbWandingCliCandidates` 顺序改为  
env → registry InstallDir → **Programs\CCB-Wanding** → legacy 残留。  
Vitest: `tests/unit/common-config/ccbWandingRuntimeNode.test.ts` → **2/2 PASS**.

### Gap 2 — `.env.accurate`（Symptom B 部分）

该文件靠 **bootstrap `ensure-wanding-settings`**，不是 purge。  
NSIS Full bootstrap 正常完成时会生成；若装半截仍会缺 → B 可单独出现。

### Gap 3 — 价库文件真漏包（H2）

若 `missing:` 绝对路径已在完整 Programs 树下仍缺 → packaging 问题，purge 无效。需 staging / Check Install 对照。

## End-to-end effectiveness matrix

| 现场构型 | 仅 Purge NSIS | Purge + resolve 修（本轮） | 还需 |
|----------|---------------|---------------------------|------|
| 多根残树 + Programs 完整 + bootstrap OK | 部分（清残） | **应能消 A+B（H1）** | 员工用新 AionUI/2.0.0 包 |
| 只剩 Programs，但旧 AionUI resolve | ❌ A | ✅ A | 发带 resolve 修的桌面包 |
| Programs 完整但未跑 bootstrap | B 仍可能缺 `.env` | 同上 | 重跑 Check Install / ensure-settings |
| 漏打价库 vendor | ❌ | ❌ | 修白名单 / 重打包 |

## Verdict

| Question | Answer |
|----------|--------|
| Purge 机制本身是否有效？ | **是** — smoke GREEN；适合作为 2.0.0 安装一步清理 |
| **单独**是否保证解决 A+B？ | **否** — 缺 AionUI Programs resolve 时 A 仍挂；B 还依赖 bootstrap/包完整 |
| 合 resolve 修之后呢？ | **对「残留错树」主因：是可闭环的**；H2/H3 另轨 |
| 与打包冲突？ | **无** — ship/devOnly 分流；staging File 路径 smoke PASS |

## Required ship for employee claim「解决了」

1. **Full NSIS 2.0.0**（含 DirectoryLeave purge）  
2. **AionUI 含本轮 `ccbWandingRuntimeNode` resolve 修**（同包或热更桌面）  
3. 装完 bootstrap 成功；可选 `ccb-check-install`  
4. 现场确认：更新面板不再 INTERNAL；Guid banner 无三条 missing（或只有可解释的 env）
