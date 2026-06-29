# dev-parity: align dev launcher to 1.1.2 installed state + completeness test script

## Goal

创建一个明确的 dev 启动脚本，使 `bun run dev` 的 AionUI 呈现与 1.1.2 NSIS 安装后的状态完全一致：org SSO 登录页、WanD Guid 卡、MCP 模型、组织数据库。当前 `start-aionui-dev.ps1` 因 `AIONUI_BYPASS_AUTH=1` 跳过登录，且 dev 路径 `AionUi-Dev\aionui\` 没有 org-server.json，导致三个可见缺陷。

## What I Already Know (从代码读取)

### 当前 dev 启动脚本的三个缺陷

| 缺陷 | 根因 | 代码位置 |
|------|------|---------|
| 没有登录系统 | `$env:AIONUI_BYPASS_AUTH = '1'` | `start-aionui-dev.ps1:89` |
| 没有组织数据库 | bypass auth → org SSO 从未发生 → org workspace 不加载 | 逻辑链条 |
| Settings 没有模型 | dev aioncore DB (`%APPDATA%\AionUi-Dev\`) 全新空库；`/api/assistants/quotation-agent` → 404 | 日志确认 |

### AionUi-Dev 路径缺少 org-server.json

`ensure-wanding-settings.ps1:51` 只写 production 路径：
```
$destDir = Join-Path $env:APPDATA "AionUi\aionui"   # ← 只有生产路径
```
dev 路径 `%APPDATA%\AionUi-Dev\aionui\org-server.json` 从未被 bootstrap 写入。

### 1.1.2 安装包的正确启动状态

- Org SSO 登录页（http://67.216.206.3:13401，用户名 yjc）
- 登录后：Mixing UI + WanD Guid 卡（万鼎报价专家、准确通用）
- Settings → Models：CCB 模型列表（来自 ccbAcpModelInfo.ts + aioncore DB）
- Org knowledge 可见（来自 org server）
- MCP 工具已配置（quotation, accurate, excel, office-word）

### 源码文件确认（全部存在）

```
packages/desktop/src/common/config/ccbAcpModelInfo.ts   ✓
packages/desktop/src/common/config/ccbAgentCatalog.ts   ✓
packages/desktop/src/common/config/ccbModelSettings.ts  ✓
packages/desktop/src/renderer/hooks/context/AuthContext.tsx (modified) ✓
```

Route B 补丁在 dev 日志中确认工作正常（ccb-native-acp-route, WanD MCP warmup 成功）。

### 可用的 org 认证机制

- Org server: `http://67.216.206.3:13401`，endpoint `POST /login`，凭证在 `ccb-installer/scripts/org-phase0/env.local`（未提交）
- Session token 可以写入 `%APPDATA%\AionUi-Dev\aionui\org-session.token`

## Decisions

| 决定 | 选择 | 理由 |
|------|------|------|
| 登录模式 | **选项 A — 手动 org SSO** | 与 1.1.2 安装包体验完全一致；完整性测试最高 |

## Open Questions

_已全部解决。_

## Requirements (初稿)

1. 创建 `ccb-installer/scripts/start-dev-full.ps1`（新脚本，不改 `start-aionui-dev.ps1` 的 bypass 行为）
2. 该脚本在启动前向 `%APPDATA%\AionUi-Dev\aionui\org-server.json` 写入正确的 org server URL
3. 不设置 `AIONUI_BYPASS_AUTH`（让登录页正常显示）
4. 运行完整 bootstrap（route B + seed agents + ensure-wanding-settings）
5. 在脚本头部注释中文档化 "完整性 checklist"

## Acceptance Criteria (初稿)

- [ ] `start-dev-full.ps1` 启动后显示 org SSO 登录页
- [ ] 用 yjc 登录后，Mixing 品牌 UI 加载，左侧有 WanD Guid 卡（万鼎报价专家）
- [ ] Settings → Tools 显示 quotation/accurate/excel MCP 配置
- [ ] Settings 的 Model 区域显示 CCB 模型（不是空的）
- [ ] `GET /api/assistants/quotation-agent` 返回 200（aioncore 种子 agent 已注册）
- [ ] Route B 日志：`[ccb-native-acp-route] install=D:\\CCB-Wanding`

## Out of Scope

- 修改 `start-aionui-dev.ps1` 现有行为（保持 bypass 供快速 UI 调试使用）
- 新 NSIS 构建（Phase 4 在 recovery 任务里）
- 自动化 CI 测试

## Technical Notes

- dev aioncore DB 路径：`%APPDATA%\AionUi-Dev\aionui\`（SQLite）
- production aioncore DB 路径：`%APPDATA%\AionUi\aionui\`
- `ensure-wanding-settings.ps1` 写 `%APPDATA%\AionUi\aionui\org-server.json`（production）
- `ccbAssistantCatalog.ts` / `ccbAssistantProfileSeedShared.ts` 可能控制 aioncore DB 中的 assistant 种子
- Org credentials 在 `scripts/org-phase0/env.local`（已排除 git）
