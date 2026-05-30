# CCB 门户 v1 上线设计

**日期**：2026-05-30  
**状态**：已批准  
**范围**：修下载按钮 · 留言板加固 · SEO/分享/favicon · VPS 部署清单

---

## 背景与目标

CCB 门户（`portal/`）已有首页、文档阅读器、留言板三个页面，本地可跑。v1 上线需要解决四类问题：
- 下载按钮全部是 `href="#"`，访客点了没有反应
- 留言板会话重启丢失、JSON 并发写有损坏风险、无速率限制
- 缺 favicon / og:image / meta，分享链接没有预览
- 没有运行在 VPS 上的部署指引

**不在本次范围**：汉化版截图替换 hero（上线后迭代）、域名与 HTTPS（无域名，先用 IP）、SQLite 迁移（量级不需要）。

---

## 架构原则

保持零依赖的 Node 内置模块哲学（`http` / `fs` / `crypto`）。所有加固不引入任何 npm 包，VPS 上 `node server.js` 即可运行。

---

## 第 1 节 · 修好下载按钮

### 问题
`portal/index.html` 中有三处下载入口，URL 均为 `#` 或滚动锚点而非真实文件：
- `index.html:508` — nav CTA「下载 v1.0.7」→ `#download`（滚动到下载区，**保留**，UX 正确）
- `index.html:528` — hero 按钮「下载安装包 (.exe)」→ `#download`（滚动到下载区，**保留**）
- `index.html:768` — 下载区真实按钮「下载 CCB v1.0.7 (.exe)」→ `href="#"`（**需修复**）

### 方案

**installer 托管**：`CCB-Setup-1.0.7.exe`（179 MB）上传到 GitHub Release，不占 VPS 带宽。

**Release URL 格式**：
```
https://github.com/JASMINE145-ACT/CCB-Iinstaller/releases/download/v1.0.7/CCB-Setup-1.0.7.exe
```

**代码变更**：
- `server.js` 顶部添加 `const DOWNLOAD_URL` 常量
- 添加 `GET /api/download` 路由，返回 `302 Location: DOWNLOAD_URL` 并计数（可选日志）
- `index.html:768` 改为 `href="/api/download"`
- 下载区副文本同步更新版本号、文件大小（~179 MB）

**你需要手动执行一次**（在有 `gh auth login` 的终端）：
```bash
gh release create v1.0.7 \
  ccb-installer/CCB-Setup-1.0.7.exe \
  --repo JASMINE145-ACT/CCB-Iinstaller \
  --title "CCB v1.0.7" \
  --notes "全面汉化 + Git Bash 修复 + 安装选项优化"
```

---

## 第 2 节 · 留言板加固

### 2.1 会话持久化（HMAC Signed Cookie）

**现状**：`sessions = new Map()` 保存 `token → wxid`，重启服务器所有用户掉线。

**修复**：改用 **HMAC 签名 Cookie**，无需服务端存储。

```
cookie 格式：  ccb_session=<payload>.<signature>
payload：      base64(JSON { wxid, iat })
signature：    HMAC-SHA256(payload, SESSION_SECRET)
```

- `SESSION_SECRET` 从环境变量 `CCB_SESSION_SECRET` 读取，启动时若不存在则**自动生成并保存**到 `portal/data/session.key`
- 验证时：重新计算 signature，`timingSafeEqual` 比较，过期时间 7 天
- 删除 `const sessions = new Map()`，所有 `getUser()` 改用新验证函数

### 2.2 原子写 + 并发保护

**现状**：`saveJSON` 直接 `fs.writeFileSync`，两个请求同时写会交错损坏文件。

**修复**：
1. **写队列**：进程内单一 Promise 链，所有写操作串行排队：
   ```js
   let writeChain = Promise.resolve();
   function enqueueWrite(file, data) {
     writeChain = writeChain.then(() => atomicWrite(file, data));
     return writeChain;
   }
   ```
2. **原子替换**：先写 `.tmp` 文件再 `fs.renameSync`，保证写入完整性：
   ```js
   function atomicWrite(file, data) {
     const tmp = file + '.tmp';
     fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
     fs.renameSync(tmp, file);
   }
   ```

### 2.3 速率限制

**修复**：内存计数器，按 wxid 限制（已登录用户）或按 IP（未登录）。

- 发布留言：10 条 / 60 秒
- 点赞：30 次 / 60 秒
- 计数器每 60 秒清空

实现：`const rateLimits = new Map()` 保存 `key → { count, resetAt }`。

### 2.4 XSS 校验确认

- `feedback.html:748` 已有 `esc(msg.content)` — ✅
- 需确认 `msg.nickname` 和 `msg.wxid` 在模板字符串中也走 `esc()` — 实现时校验并修复

---

## 第 3 节 · SEO / 分享 / Favicon

### 3.1 Favicon

生成一个与 nav `logo-mark`（橙紫渐变 + "C" 字）视觉一致的 SVG favicon：

```html
<link rel="icon" type="image/svg+xml" href="/portal/assets/favicon.svg">
<link rel="icon" type="image/png" href="/portal/assets/favicon.png" sizes="32x32">
```

SVG 直接内联渐变，无需额外文件处理。

### 3.2 Meta 标签（三个页面都加）

```html
<meta name="description" content="CCB — Windows 最佳 Claude Code 增强工具。全面汉化、Git Bash 自动检测、多种启动模式，5 分钟上手。">
<meta property="og:title" content="Claude Code Best（CCB）">
<meta property="og:description" content="让 Claude Code 真正为中文用户服务。">
<meta property="og:image" content="{SITE_URL}/portal/assets/og-image.png">
<meta property="og:url" content="{SITE_URL}">
<meta name="twitter:card" content="summary_large_image">
```

### 3.3 SITE_URL 常量

`server.js` 顶部添加：
```js
const SITE_URL = process.env.CCB_SITE_URL || 'http://localhost:3000';
```

og:image 用绝对 URL，VPS 上设置环境变量 `CCB_SITE_URL=http://你的IP`。有域名后改成 `https://` 即可。

### 3.4 og:image

用首页 hero 截图（`portal/assets/ccb-hero.png`）作为 og:image 基础，裁剪为 1200×630 或直接用原图（942×260 会被平台自动适配，功能正常但比例非标准）。  
如果觉得不满意，后续可专门设计一张 1200×630 的宣传图替换。

---

## 第 4 节 · VPS 部署清单

### 前置条件
- Ubuntu 20.04+ 或 Debian 11+ VPS
- Node.js 18+（`curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install nodejs`）
- `nginx`（`sudo apt install nginx`）

### systemd Service

创建 `/etc/systemd/system/ccb-portal.service`：
```ini
[Unit]
Description=CCB Portal
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/claude-code-best
Environment=CCB_SITE_URL=http://你的IP
ExecStart=/usr/bin/node portal/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启动：`sudo systemctl enable --now ccb-portal`

### nginx 反向代理

创建 `/etc/nginx/sites-enabled/ccb`：
```nginx
server {
    listen 80;
    server_name 你的IP;  # 有域名后改为域名

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

测试并重载：`sudo nginx -t && sudo systemctl reload nginx`

### 防火墙
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp   # 备用，有域名后启用
sudo ufw allow 22/tcp    # SSH 保持
sudo ufw enable
```

### 数据持久化
- `portal/data/` 目录不在 git 中（`.gitignore`），手动备份：
  ```bash
  # 每天 cron 备份
  0 3 * * * tar czf /home/ubuntu/backup/ccb-data-$(date +%F).tar.gz /home/ubuntu/claude-code-best/portal/data
  ```
- 建议至少 7 天滚动保留

### 部署步骤总结
1. `git clone https://github.com/JASMINE145-ACT/CCB-Iinstaller.git` 到 VPS
2. 创建并启动 systemd service
3. 配置 nginx
4. 开放防火墙端口
5. 浏览器访问 `http://你的IP` 验证

---

## 验收标准

- [ ] 点击「下载 CCB v1.0.7」触发 302 跳转到 GitHub Release 文件
- [ ] 服务器重启后登录状态保留（HMAC Cookie）
- [ ] 同时发送 5 条留言不损坏 `messages.json`
- [ ] 连续发 11 条留言收到速率限制错误
- [ ] 浏览器 tab 显示 favicon（橙紫渐变 logo）
- [ ] 微信/微博分享链接时显示 og:title 和 og:description
- [ ] `http://你的IP` 可访问，所有页面和 API 正常

---

## 未在本次范围内（上线后迭代）

- 汉化版 CCB 截图替换 hero（等截图准备好）
- HTTPS / Let's Encrypt（等域名）
- 移动端导航菜单（hamburger）
- 下载计数统计面板
