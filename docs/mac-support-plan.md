# CCB Mac 支持计划

**目标：** 让非技术 Mac 用户能一键安装 CCB / CCB-Wanding，体验与 Windows 版一致。  
**约束：** 开发者无 Mac 实体机，使用 GitHub Actions + tmate 构建和测试。

---

## 一、架构映射

| Windows 组件 | Mac 等价物 | 说明 |
|-------------|-----------|------|
| NSIS `.nsi` 打包脚本 | `pkgbuild` + `productbuild` shell 脚本 | Apple 内置，免费 |
| `.exe` 安装包 | `.pkg` 安装包 | 双击 → 下一步 → 完成，体验一致 |
| `.cmd` 启动脚本 | `.sh` Bash 脚本 | 逻辑完全对等移植 |
| `ccb-check-update.ps1` | `ccb-check-update.sh` | `curl` + `jq` 替代 WebClient |
| `launch-ccb-wt.ps1` (WT 启动器) | `launch-ccb-mac.sh` (Terminal.app 启动器) | `open -a Terminal` |
| 桌面快捷方式 `.lnk` | `.app` bundle | 标准目录结构，无需第三方工具 |
| 注册表 `HKCU:\Software\CCB-Wanding` | `~/.config/ccb-wanding/state.json` | 纯文件存储 |
| Windows Terminal profile | 系统默认 Terminal.app / iTerm2 | 不强绑定终端 |

---

## 二、文件结构（新增）

```
ccb-installer/
├── mac/
│   ├── scripts/
│   │   ├── ccb-check-update.sh      # 更新检查（bash 版）
│   │   ├── launch-ccb-mac.sh        # 打开 Terminal 并运行 ccb
│   │   └── launch-ccb-wanding-mac.sh
│   ├── app-bundles/
│   │   ├── CCB-Wanding.app/         # 手工构建的 .app bundle
│   │   │   └── Contents/
│   │   │       ├── Info.plist
│   │   │       ├── MacOS/CCB-Wanding   # 可执行 shell 脚本
│   │   │       └── Resources/AppIcon.icns
│   │   └── CCB-Wanding-版本选择.app/
│   ├── pkg/
│   │   ├── build-wanding-pkg.sh     # pkgbuild + productbuild 打包脚本
│   │   ├── distribution.xml         # 安装界面描述（欢迎/许可/安装目录）
│   │   └── scripts/
│   │       ├── preinstall           # 安装前检查（Node.js / npm 是否存在）
│   │       └── postinstall          # 安装后：创建软链 /usr/local/bin/ccb
└── .github/
    └── workflows/
        └── build-mac-wanding.yml    # CI/CD：构建 .pkg + 上传产物
```

---

## 三、分阶段实施

### Phase 1 — Bash 脚本移植（核心逻辑）

**目标：** 把所有 Windows 专属逻辑用 bash 重写，无需 Mac 实体机即可完成。

**`mac/scripts/ccb-check-update.sh`：**
- `curl -sf URL` 替代 `System.Net.WebClient`
- `jq` 解析 JSON（fallback：纯 bash grep/sed 应对无 jq 环境）
- 版本号存 `~/.config/ccb-wanding/installed_version`
- 箭头键 TUI 用 `tput` + ANSI 转义序列（逻辑与 PS 版一致）
- 后台检查模式：`nohup ... &` 替代 `Start-Process -WindowStyle Hidden`

**`mac/scripts/launch-ccb-mac.sh`：**
```bash
# 打开 Terminal.app 并运行 ccb
open -a Terminal.app
# 或：osascript -e 'tell application "Terminal" to do script "ccb"'
```

**完成标志：** 脚本在 GitHub Actions macOS runner 上能正确运行。

---

### Phase 2 — .app Bundle（桌面图标）

**目标：** 非技术用户双击图标即可启动，不需要打开终端。

**实现方式：** 手工创建标准 `.app` bundle 目录结构，无第三方依赖。

**`CCB-Wanding.app/Contents/MacOS/CCB-Wanding`（可执行脚本）：**
```bash
#!/bin/bash
osascript -e 'tell application "Terminal"
    activate
    do script "source /usr/local/lib/ccb-wanding/ccb-wanding.sh"
end tell'
```

**关键细节：**
- `Info.plist` 设置 `CFBundleIdentifier`、`CFBundleName`、图标名
- `AppIcon.icns` 用现有 CCB 图标转换（`iconutil`，CI 里转换）
- `.app` bundle 放入 `.pkg` 的 `/Applications` 安装目录

---

### Phase 3 — PKG 安装包

**目标：** 产出 `CCB-Wanding-{version}.pkg`，双击即可安装。

**`mac/pkg/build-wanding-pkg.sh` 构建流程：**
```bash
# 1. 准备 payload 目录
mkdir -p payload/usr/local/lib/ccb-wanding
cp mac/scripts/*.sh payload/usr/local/lib/ccb-wanding/

# 2. 打包组件
pkgbuild \
  --root payload \
  --identifier com.ccb.wanding \
  --version $VERSION \
  --scripts mac/pkg/scripts \
  CCB-Wanding-component.pkg

# 3. 合成带 UI 的安装器
productbuild \
  --distribution mac/pkg/distribution.xml \
  --package-path . \
  CCB-Wanding-$VERSION.pkg
```

**`postinstall` 脚本做的事：**
1. 检查 Node.js 是否已安装，否则提示用户安装
2. `npm install -g @anthropic-ai/claude-code`（如未安装）
3. 复制 `.app` bundle 到 `/Applications`
4. 创建桌面快捷方式（symlink 到 `~/Desktop`）
5. 设置 `~/.config/ccb-wanding/installed_version`

---

### Phase 4 — GitHub Actions CI/CD

**目标：** 推送 tag 自动构建 `.pkg`，无需本地 Mac。

**`.github/workflows/build-mac-wanding.yml`：**
```yaml
name: Build Mac Wanding PKG
on:
  push:
    tags: ['wanding-*']

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build PKG
        run: bash mac/pkg/build-wanding-pkg.sh ${{ github.ref_name }}
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: CCB-Wanding-mac
          path: "*.pkg"
```

**tmate 交互测试（按需启用）：**
```yaml
      - name: Interactive debug session
        uses: mxschmitt/action-tmate@v3
        if: failure()   # 或手动触发
```
推送后 SSH 进 Mac runner，手动测试安装流程和 TUI。

---

### Phase 5 — 服务器 & MCP 更新

**服务器新增目录：**
```
/var/www/html/
├── ccb-wanding/        # 现有 Windows
└── ccb-wanding-mac/    # 新增 Mac
    ├── version.json
    └── CCB-Wanding-1.1.2.pkg
```

**MCP server.py 新增 app 类型：**
```python
REMOTE_ROOTS = {
    "CCB-Wanding":     "/var/www/html/ccb-wanding",
    "CCB":             "/var/www/html/ccb",
    "CCB-Wanding-Mac": "/var/www/html/ccb-wanding-mac",  # 新增
    "CCB-Mac":         "/var/www/html/ccb-mac",           # 新增
}
```

**`ccb-check-update.sh` 指向 Mac manifest：**
```bash
MANIFEST_URL="http://67.216.206.3/ccb-wanding-mac/version.json"
```

---

### Phase 6 — 测试策略

| 测试类型 | 方式 | 覆盖内容 |
|---------|------|---------|
| 脚本逻辑 | GitHub Actions 自动 | update check、版本解析、TUI 渲染 |
| 安装包结构 | CI `pkgutil --check-signature` | .pkg 合法性 |
| 交互式 TUI | tmate SSH 进 runner | 箭头键选择、中文显示 |
| 完整安装流程 | Beta Mac 用户 | 双击安装、启动、更新 |

---

## 四、关键风险与对策

| 风险 | 对策 |
|------|------|
| `jq` 在用户 Mac 未安装 | `postinstall` 用 Homebrew 安装；或写纯 bash JSON 解析 fallback |
| Node.js 未安装 | `postinstall` 检测，提示用户先装 Node.js，给出链接 |
| macOS Gatekeeper 阻止运行 | 用 Apple Developer ID 对 `.pkg` 公证（notarize）；或提示用户右键→打开 |
| Terminal.app vs iTerm2 | 检测 iTerm2 是否存在，优先使用；fallback Terminal.app |
| tmate 6小时限制 | 分批测试，主要流程控制在 1 小时内 |

---

## 五、里程碑

| 阶段 | 产出 | 预估工时 |
|------|------|---------|
| Phase 1 | bash 脚本可在 CI 运行 | 1.5 天 |
| Phase 2 | `.app` bundle 可双击启动 | 0.5 天 |
| Phase 3 | `.pkg` 可安装 | 1 天 |
| Phase 4 | CI 自动构建 | 0.5 天 |
| Phase 5 | 服务器 + MCP 支持 Mac | 0.5 天 |
| Phase 6 | Beta 用户验证 | 按需 |
| **合计** | | **约 4 天** |

---

## 六、不在本次范围内

- macOS 代码签名 / Apple Developer ID（可后续添加）
- Homebrew tap（规模大后再做）
- Linux 支持（架构相同，bash 脚本可复用，仅安装包格式不同）
