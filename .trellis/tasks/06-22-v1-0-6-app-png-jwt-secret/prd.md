# v1.0.6 — 修复 app.png 缺失 + JWT_SECRET 安装预填

## Goal

修复两个安装/构建 bug，让 v1.0.6 能 `-SkipVite` 直接打包并安装后员工账号登录成功。

## What I already know

### Fix 1: app.png 缺失

- `electron.vite.config.ts` L110-119：`viteStaticCopy` 只有一个 target：
  ```ts
  { src: 'packages/desktop/src/renderer/assets/logos/*', dest: 'static/images' }
  ```
- `logos/` 下只有一个子目录 `brand/`，`brand/` 下只有 `app.png`
- `logos/*` 匹配到 `brand` 目录，但 `structured: false` 下该目录 contents 未被写入 `out/main/static/images/brand/`
- 结果：`electron-builder --dir` 找不到 `out/main/static/images/brand/app.png` → ENOENT crash
- v1.0.5 临时修复：手动 `Copy-Item resources/app.png → out/main/static/images/brand/app.png`
- 根本修复：在 `electron.vite.config.ts` 补一个显式 target 或修正 glob

### Fix 2: JWT_SECRET 为空

- `ensure-wanding-settings.ps1` L84-101：`Ensure-SsoEnvFile` 检查 `%LOCALAPPDATA%\CCB-Wanding\config\sso.env` 不存在时复制 template
- Template 来源：`ccb-installer/resources/sso.env.example`（内容：`JWT_SECRET=`，空值）
- 安装后 `sso.env` 被创建但 JWT_SECRET 为空 → 员工 org-idp 登录 401
- 正确值在 `scripts/org-phase0/env.local`（gitignored）中：`JWT_SECRET=nUGIBanC8Wdg8XATnbkiqJnOvVDQ5fS9kM7lT/HhX8w2BzSqeBKEx1XtO+lPkNGP`

## Feasible Approaches — Fix 2

**方案 A：构建时从 env.local 读取并写入 sso.env.example（推荐）**
- `build-wanding.ps1` 在 Step 3 staging 阶段读取 `scripts/org-phase0/env.local`，提取 JWT_SECRET，写入 staging 的 `sso.env.example`
- 安装后 `ensure-wanding-settings.ps1` 复制包含正确 JWT_SECRET 的 template
- 优：零手动运维步骤；缺：secret 打包进 exe（公司内网可接受）；轮换 secret 需重打包

**方案 B：NSIS 安装向导页面输入 JWT_SECRET**
- 安装时弹 GUI 输入框让管理员填入
- 优：secret 不进 exe；缺：需改 NSI 脚本复杂度高，silent install `/S` 下无法输入

**方案 C：安装后首次启动弹提示（如果 JWT_SECRET 为空）**
- `ensure-wanding-settings.ps1` 检测 JWT_SECRET 为空时 Write-Warning；用户手动填
- 现状其实已经这样做了（L100 的 Warning），只是用户不知道

## Decision (ADR-lite)

**推荐方案 A**：构建时从 `env.local` 注入。理由：小团队内网部署，secret rotation 频率低，零运维负担 > 构建时打包透明度。

## Requirements

- [ ] `electron.vite.config.ts`：viteStaticCopy 补全 `brand/app.png` 的复制 target，使 `out/main/static/images/brand/app.png` 在 Vite 编译后存在
- [ ] `build-wanding.ps1`：Step 3 staging 阶段读取 `scripts/org-phase0/env.local` 中 JWT_SECRET，写入 staging/resources/sso.env.example
- [ ] `-SkipVite` 时 app.png 的 workaround 应变为非必要（因为 Vite 已正确生成文件）
- [ ] v1.0.6 安装后 `yjc / Yjc@2026` 登录成功

## Acceptance Criteria

- [ ] 运行 `build-wanding.ps1 -Version 1.0.6 -SkipVite` 无 ENOENT app.png 错误
- [ ] 安装 v1.0.6 后 `%LOCALAPPDATA%\CCB-Wanding\config\sso.env` 中 JWT_SECRET 非空
- [ ] 用 `yjc / Yjc@2026` 登录后不弹回登录页

## Out of Scope

- NSIS 安装向导 GUI（方案 B）
- JWT_SECRET 轮换自动化
- Vite renderer 重编（-SkipVite 保持）

## Technical Notes

- `electron.vite.config.ts` L110-119：viteStaticCopy config
- `build-wanding.ps1`：Step 3 staging 段 (~L280+)
- `ensure-wanding-settings.ps1` L84-101：Ensure-SsoEnvFile
- `ccb-installer/resources/sso.env.example`：template 源文件
- `scripts/org-phase0/env.local`：gitignored，含正确 JWT_SECRET
