# Dev Runtime Layers — 全貌：改什么要 build、什么能热加载

> **Read this when:** 不清楚「我改了 X，为什么 dev 没变」、不知道要不要 build、或 Codex/别人在 build 时你还能改哪一层。
>
> **Operational runbook（命令、hash 验证、smoke）：** [`dev-sync-playbook.md`](./dev-sync-playbook.md) — 先懂本文全貌，再按 playbook 执行。

---

## 1. 一句话心智模型

**Repo 是图纸，dev 是工地。**

| | Repo（你编辑） | Live（dev 实际跑） |
|---|----------------|-------------------|
| 前端 UI | `D:\Projects\aionui-src\` | 同路径，Vite 直接编译（**少数同址**） |
| 报价 Python | `claude-code-best\python\` | `D:\CCB-Wanding\vendor\wanding\python\` |
| 价库 / 业务 md | `claude-code-best\data\` | `D:\CCB-Wanding\vendor\wanding\data\` |
| ACP 运行时 | `AionCore\crates\` | `AionCore\target\release\aioncore.exe` |
| Claude Code B | `claude-code-B\src\` 或 `ccb-installer\claude-code-b-src\` | `D:\CCB-Wanding\dist\` |
| route-b 胶水 | `ccb-installer\patches\aionui-ccb-route-b\` | 3 目录（bundled + AppData AionUi + AionUi-Dev），各写 `index.js` + `acp-agent.js` — 见 [`route-b-sync.md`](./route-b-sync.md) §2 |

**Save ≠ Deploy。** 只有 `aionui-src/renderer` 接近「保存即生效」；其余层都要 **sync** 或 **build** 把图纸运到工地。

---

## 2. 发一条聊天消息时的七层链

```text
你在 Electron 输入框打字
        │
        ▼
┌─ ① AionUI renderer (aionui-src) ─────────────────────────┐
│  聊天 UI、hooks、AskUserQuestion 卡片、消息列表合并          │
│  机制：Vite HMR（热更新）                                   │
└───────────────────────────┬────────────────────────────────┘
                            │ IPC / HTTP
                            ▼
┌─ ② aioncore.exe (Rust, AionCore) ─────────────────────────┐
│  会话、warmup、replay suppression、消息落库、WS 广播        │
│  机制：cargo build --release → PATH 上第一个 aioncore       │
└───────────────────────────┬────────────────────────────────┘
                            │ spawn ACP
                            ▼
┌─ ③ route-b patch (index.js) ──────────────────────────────┐
│  决定 spawn 谁、CLAUDE_CONFIG_DIR、CCB 安装路径             │
│  机制：sync-aionui-ccb-route-b.ps1（无 compile）            │
└───────────────────────────┬────────────────────────────────┘
                            ▼
┌─ ④ CCB-Wanding dist (cli.js --acp) ───────────────────────┐
│  agent.ts、permissions、MCP 注册、greeting、tool loop       │
│  机制：bun run build → deploy-claude-code-b-to-wanding.ps1  │
└───────────────────────────┬────────────────────────────────┘
                            │ stdio MCP
                            ▼
┌─ ⑤ quotation MCP (bun → dist/index.js) ───────────────────┐
│  工具列表、调 Python 子进程                                  │
│  机制：robocopy dist → vendor\mcp-servers\quotation-server  │
└───────────────────────────┬────────────────────────────────┘
                            ▼
┌─ ⑥ vendor python + data ───────────────────────────────────┐
│  match_quotation、价库 xlsx、业务 knowledge md              │
│  机制：sync-dev-wanding-vendor.ps1                          │
└───────────────────────────┬────────────────────────────────┘
                            ▼
┌─ ⑦ Agent SOP / settings（配置层）────────────────────────────┐
│  quotation-agent.md、settings.json 里 MCP env               │
│  机制：deploy-seed-agents / ensure-wanding-settings         │
└─────────────────────────────────────────────────────────────┘
```

默认 dev 启动：**`ccb-installer/scripts/start-dev-full.ps1`**（bootstrap + route-b + **vendor sync 默认** + aioncore 注入 + org SSO）；把 **`AionCore\target\release` 放在 PATH 最前**。纯 UI：`-SkipVendorSync`。废弃：`start-aionui-dev.ps1`（仅 redirect）。

---

## 3. 三类改动（最常用分类）

### 🟢 A 类 — 保存后基本生效（热加载 / 轻重启）

| 改什么 | 机制 | 额外注意 |
|--------|------|----------|
| `aionui-src/.../renderer/**` | **Vite HMR** | `main` / `preload` 要整进程重启 |
| 聊天文案、组件样式、AskUserQuestion UI | 通常自动刷新 | 怀疑缓存 → `start-dev-full.ps1 -Clean` |
| `.trellis/spec/**`、纯文档 | **不影响运行时** | 给人 / Agent 读 |

### 🟡 B 类 — 要同步（copy），不一定要 compile

| 改什么 | 一键命令 | 验证后还要 |
|--------|----------|------------|
| `python/inventory/**`、`python/quotation/**` | `sync-dev-wanding-vendor.ps1` | **新开对话** 或重启 aioncore（MCP 子进程缓存） |
| `data/*.xlsx`、`wanding_business_knowledge.md` | 同上 | 同上 |
| `mcp_servers/quotation-server/dist/**` | 同上 | 同上 |
| `ccb-installer/config/agents/*.md` | `deploy-seed-agents.ps1` | **新建** 专家 / Guid 会话 |
| MCP `settings.json` env | `ensure-wanding-settings.ps1 -InstallDir D:\CCB-Wanding` | 重启 ACP 链 |

### 🔴 C 类 — 必须 build + 重启（无热加载）

| 改什么 | Build | 部署 | 之后 |
|--------|-------|------|------|
| **`AionCore/crates/**`**（replay、warmup、会话） | `scripts/build-aioncore-work-tasks.cmd` | `target\release\aioncore.exe` | 重启 dev；**`cargo test` ≠ 更新 release** |
| **claude-code-B / `claude-code-b-src`**（permissions、agent） | `bun run build` | `deploy-claude-code-b-to-wanding.ps1` | + `sync-aionui-ccb-route-b.ps1` |
| **route-b `patches/.../index.js`** | 无 | `sync-aionui-ccb-route-b.ps1` | 杀 aioncore |
| **NSIS / `dist:win` exe** | 整套打包 | 安装槽 | 日常 dev 可跳过 |

---

## 4. 决策树（改完保存之后）

```text
改完并保存
    │
    ├─ 只动了 aionui-src/renderer？
    │     └─ 看窗口是否热更新 → 没有则重启 dev（-Clean 可选）
    │
    ├─ 动了 python/ 或 data/ 或 quotation-server/dist？
    │     └─ sync-dev-wanding-vendor.ps1 → 新开报价会话再测
    │
    ├─ 动了 AionCore/？
    │     └─ build-aioncore-work-tasks.cmd → 重启 dev → 再测
    │
    ├─ 动了 claude-code-b-src / permissions / agent.ts？
    │     └─ bun build → deploy CCB dist → route-b sync → 新会话
    │
    └─ 动了 quotation-agent.md / agents seed？
          └─ deploy-seed-agents → 新建专家会话
```

---

## 5. 近期真实症状 → 应对层（对照表）

| 你看到的 | 最可能缺 sync 的层 | 主 fix 位置 |
|----------|-------------------|-------------|
| 查价只有 2 条、缺 `8010036693` | ⑥ vendor python + data | 新价库 + 禁 legacy fallback |
| `HDPE 0.6MPa` 查不到 | ⑥ python（PN 解析） | `wanding_fuzzy_matcher.py` |
| 发「很好」后旧 greeting/价表倒灌 | ② aioncore replay guard | `ReplaySuppressionGuard` / `session/new` resume |
| 同上仍有漏网 | ① 前端 `useAcpMessage` / cache | 兜底，非主因 |
| AskUserQuestion 点了不认 | ④ CCB `permissions.ts` + ① 前端 | build deploy + HMR |
| Agent 又念完整 greeting | ④ SOP 或 ② replay | 分开验：新会话 + 新 aioncore |
| UI 改了完全没变 | ① 是否改到 renderer / 是否 -Clean | — |
| 仍是 vanilla Claude Code | ③ route-b MISMATCH | sync route-b |

细节命令与 hash 检查：[`dev-sync-playbook.md`](./dev-sync-playbook.md) §5–§7。

---

## 6. `cargo test` vs `cargo build --release`

| 命令 | 产出 | dev 是否用到 |
|------|------|--------------|
| `cargo test -p aionui-ai-agent …` | `target\debug\` 下测试二进制 | ❌ 不更新 dev 用的 aioncore |
| `build-aioncore-work-tasks.cmd` | `target\release\aioncore.exe` | ✅ `start-dev-full.ps1` PATH 优先读这个 |

Windows 上跑 test/build 前若 dev 开着，`aioncore.exe` 可能锁文件 → 先停 `electron` / `aioncore`（playbook §4.1）。

---

## 7. 别人在 build AionCore 时你能改什么

| 可以并行 | 建议先别碰 |
|----------|-----------|
| `python/`、`data/`、SOP md | `AionCore/` 源文件（抢编译 / 锁） |
| `aionui-src` renderer | 用 dev 验 replay（等新 release aioncore） |
| Trellis 文档、测试脚本 | 同一 Rust 文件的大改 |

---

## 8. 两个环境不要混

| 环境 | AppData / 数据 | 用途 |
|------|----------------|------|
| **`bun run dev`** | `%APPDATA%\AionUi-Dev\` | 日常开发（本文 + playbook） |
| **Roaming 安装的 exe** | `%APPDATA%\AionUi\` | `dist:win` 后验证；与 Dev **不互通** |

---

## 9. 日常最少记忆（两条命令）

**动了报价 / MCP 业务：** 默认 `start-dev-full.ps1` 已 sync vendor；或单独：

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -UpdateSettings -Smoke
```

**动了 AionCore / CCB / route-b，或要清缓存重启：**

```powershell
.\ccb-installer\scripts\start-dev-full.ps1 -Clean
# 纯 UI：可加 -SkipVendorSync
```

全层对齐顺序：[`dev-sync-playbook.md`](./dev-sync-playbook.md) §4.6。

---

## 10. 相关文档

| 文档 | 角色 |
|------|------|
| [`dev-sync-playbook.md`](./dev-sync-playbook.md) | **操作手册**：sync 命令、指纹、smoke |
| [`route-b-sync.md`](./route-b-sync.md) | route-b 五个拷贝目标 |
| [`../backend/build-deploy-verify.md`](../backend/build-deploy-verify.md) | CCB `bun run build`、OOM、smoke |
| [`../frontend/dev-test-ship.md`](../frontend/dev-test-ship.md) | 前端症状表、HMR、-Clean |
| [`../frontend/chat-acp-flow.md`](../frontend/chat-acp-flow.md) | Idle replay、AskUserQuestion |
| [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) | 打包 exe 时的文件 whitelist |

---

**Recorded:** 2026-06-18 — 由 dev sync 排查与「build vs 热加载」讨论沉淀；与 [`dev-sync-playbook.md`](./dev-sync-playbook.md) 分工：本文 = 全貌与分类，playbook = 怎么跑。
