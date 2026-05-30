# CCB 门户 v1 上线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 CCB 门户具备可用的下载按钮、生产级留言板（会话持久化、原子写、速率限制）、完整 SEO/分享元信息，以及 VPS 部署指引。

**Architecture:** 零依赖 Node.js 内置模块服务器；所有加固在 `portal/server.js` 完成；HTML 通过服务端 `{{SITE_URL}}` 占位替换注入绝对 URL；留言板会话改为 HMAC 签名 Cookie，无需服务端存储。

**Tech Stack:** Node.js 18+ 内置模块（`http` / `fs` / `crypto` / `path`），无 npm 依赖。

---

## 文件地图

| 文件 | 操作 | 说明 |
|------|------|------|
| `portal/server.js` | 修改 | 5 处改动：常量、下载路由、HMAC 会话、原子写队列、速率限制、HTML 模板替换 |
| `portal/index.html` | 修改 | 下载按钮 href + favicon + meta 标签 |
| `portal/feedback.html` | 修改 | favicon + meta 标签（XSS 已 OK，无需修） |
| `portal/doc.html` | 修改 | favicon + meta 标签 |
| `portal/assets/favicon.svg` | 新建 | 橙紫渐变 SVG favicon |

---

## Task 1：server.js — 添加顶层常量

**Files:**
- Modify: `portal/server.js` — FILES 对象之后，`const sessions` 之前

- [ ] **Step 1：确认测试基准（服务器当前可启动）**

```bash
node portal/server.js &
curl -s http://localhost:3000/ | grep -c "Claude Code"
kill %1
```

Expected: 输出 `1`（首页返回内容含 "Claude Code"）

- [ ] **Step 2：替换 server.js 顶部常量区**

将 `portal/server.js` 中这段：

```javascript
const FILES = {
    users:    path.join(DATA_DIR, 'users.json'),
    messages: path.join(DATA_DIR, 'messages.json'),
};

// In-memory sessions: token → wxid
const sessions = new Map();
```

替换为：

```javascript
const FILES = {
    users:    path.join(DATA_DIR, 'users.json'),
    messages: path.join(DATA_DIR, 'messages.json'),
    sessionKey: path.join(DATA_DIR, 'session.key'),
};

// ─── Runtime config ──────────────────────────────────────────
const DOWNLOAD_URL = process.env.CCB_DOWNLOAD_URL ||
    'https://github.com/JASMINE145-ACT/CCB-Iinstaller/releases/download/v1.0.7/CCB-Setup-1.0.7.exe';

const SITE_URL = (process.env.CCB_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

// SESSION_SECRET：从文件加载，不存在则生成并保存
let SESSION_SECRET;
try {
    SESSION_SECRET = fs.readFileSync(FILES.sessionKey, 'utf8').trim();
} catch {
    SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(FILES.sessionKey, SESSION_SECRET, 'utf8');
}
```

- [ ] **Step 3：验证服务器仍可启动**

```bash
node portal/server.js &
sleep 1
curl -s http://localhost:3000/api/auth/me
kill %1
```

Expected: `{"user":null}`

- [ ] **Step 4：Commit**

```bash
git add portal/server.js
git commit -m "feat: add DOWNLOAD_URL, SITE_URL, SESSION_SECRET constants to server"
```

---

## Task 2：server.js — 添加 /api/download 路由 + 修复下载按钮

**Files:**
- Modify: `portal/server.js` — API 路由区开头
- Modify: `portal/index.html:768` — 下载按钮 href

- [ ] **Step 1：写失败测试**

```bash
node portal/server.js &
sleep 1
curl -v http://localhost:3000/api/download 2>&1 | grep "Location\|302\|404"
kill %1
```

Expected: 看到 `404`（路由还不存在）

- [ ] **Step 2：在 server.js API 区块最开头插入下载路由**

在 `// POST /api/auth/login` 这行之前插入：

```javascript
        // GET /api/download — redirect to GitHub Release
        if (urlPath === '/api/download' && method === 'GET') {
            const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            console.log(`[download] ${new Date().toISOString()} ${ip}`);
            res.writeHead(302, { 'Location': DOWNLOAD_URL });
            res.end();
            return;
        }
```

- [ ] **Step 3：在 portal/index.html 中修复下载按钮**

找到（`index.html` 下载区那个按钮）：

```html
        <a href="#" class="btn btn-white">⬇&nbsp; 下载 CCB v1.0.7 (.exe)</a>
```

替换为：

```html
        <a href="/api/download" class="btn btn-white">⬇&nbsp; 下载 CCB v1.0.7 (.exe)</a>
```

- [ ] **Step 4：运行测试**

```bash
node portal/server.js &
sleep 1
curl -v http://localhost:3000/api/download 2>&1 | grep "Location\|302"
kill %1
```

Expected:
```
< HTTP/1.1 302 Found
< Location: https://github.com/JASMINE145-ACT/CCB-Iinstaller/releases/download/v1.0.7/CCB-Setup-1.0.7.exe
```

- [ ] **Step 5：Commit**

```bash
git add portal/server.js portal/index.html
git commit -m "feat: add /api/download redirect route and fix download button"
```

---

## Task 3：server.js — HMAC 签名 Cookie 替换内存 Session

**Files:**
- Modify: `portal/server.js` — Helpers 区 + 登录/登出处理器

- [ ] **Step 1：写失败测试（登录后重启服务器，会话应保留）**

```bash
node portal/server.js &
sleep 1
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wxid":"testhmac","nickname":"测试"}' \
  -c /tmp/ccb_test_cookies.txt | grep -c '"ok":true'
# 重启服务器
kill %1
node portal/server.js &
sleep 1
curl -s http://localhost:3000/api/auth/me \
  -b /tmp/ccb_test_cookies.txt | grep "testhmac"
kill %1
```

Expected 第二个 curl: 返回 `""` 或空（现在重启后会话丢失）

- [ ] **Step 2：在 server.js 的 Helpers 区中替换 getUser 及添加 HMAC 辅助函数**

将：

```javascript
function getUser(req) {
    const token = parseCookies(req.headers.cookie || '')['ccb_session'];
    if (!token) return null;
    const wxid = sessions.get(token);
    if (!wxid) return null;
    return loadJSON(FILES.users, []).find(u => u.wxid === wxid) || null;
}
```

替换为：

```javascript
function createSessionToken(wxid) {
    const payload = Buffer.from(JSON.stringify({ wxid, iat: Date.now() })).toString('base64url');
    const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}

function verifySessionToken(tokenStr) {
    if (!tokenStr) return null;
    const dot = tokenStr.lastIndexOf('.');
    if (dot === -1) return null;
    const payload = tokenStr.slice(0, dot);
    const sig     = tokenStr.slice(dot + 1);
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    try {
        if (sig.length !== expected.length) return null;
        if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    } catch { return null; }
    try {
        const { wxid, iat } = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (Date.now() - iat > 7 * 24 * 60 * 60 * 1000) return null;
        return wxid;
    } catch { return null; }
}

function getUser(req) {
    const token = parseCookies(req.headers.cookie || '')['ccb_session'];
    const wxid  = verifySessionToken(token);
    if (!wxid) return null;
    return loadJSON(FILES.users, []).find(u => u.wxid === wxid) || null;
}
```

- [ ] **Step 3：更新登录处理器中的 token 生成**

将：

```javascript
            const token = crypto.randomBytes(24).toString('hex');
            sessions.set(token, wxid);
            res.setHeader('Set-Cookie', `ccb_session=${token}; Path=/; HttpOnly; Max-Age=604800`);
```

替换为：

```javascript
            const token = createSessionToken(wxid);
            res.setHeader('Set-Cookie', `ccb_session=${token}; Path=/; HttpOnly; Max-Age=604800`);
```

- [ ] **Step 4：更新登出处理器（删除 sessions.delete 行）**

将：

```javascript
        if (urlPath === '/api/auth/logout' && method === 'POST') {
            const token = parseCookies(req.headers.cookie || '')['ccb_session'];
            sessions.delete(token);
            res.setHeader('Set-Cookie', 'ccb_session=; Path=/; Max-Age=0');
            return json(res, 200, { ok: true });
        }
```

替换为：

```javascript
        if (urlPath === '/api/auth/logout' && method === 'POST') {
            res.setHeader('Set-Cookie', 'ccb_session=; Path=/; HttpOnly; Max-Age=0');
            return json(res, 200, { ok: true });
        }
```

- [ ] **Step 5：运行测试（重启后会话保留）**

```bash
node portal/server.js &
sleep 1
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wxid":"testhmac","nickname":"测试"}' \
  -c /tmp/ccb_test_cookies.txt > /dev/null
kill %1
node portal/server.js &
sleep 1
curl -s http://localhost:3000/api/auth/me -b /tmp/ccb_test_cookies.txt
kill %1
```

Expected: `{"user":{"wxid":"testhmac","nickname":"测试",...}}`（重启后仍有用户）

- [ ] **Step 6：Commit**

```bash
git add portal/server.js portal/data/session.key
git commit -m "feat: replace in-memory sessions with HMAC signed cookies"
```

---

## Task 4：server.js — 原子写队列

**Files:**
- Modify: `portal/server.js` — saveJSON + 3 处 API 写入调用

- [ ] **Step 1：写失败测试（确认并发写不报错，先验证当前行为）**

```bash
node portal/server.js &
sleep 1
# 发 5 个并发请求（先登录拿 cookie）
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wxid":"conctest","nickname":"并发测试"}' \
  -c /tmp/ccb_conc.txt > /dev/null
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost:3000/api/messages \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"并发测试消息 $i\",\"type\":\"feedback\"}" \
    -b /tmp/ccb_conc.txt &
done
wait
curl -s http://localhost:3000/api/messages | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d),'messages')"
kill %1
```

Expected: 所有消息都存在（无丢失），但当前实现理论上有竞争风险。

- [ ] **Step 2：在 server.js 中替换 saveJSON，新增 atomicWrite + enqueueWrite**

将：

```javascript
function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
```

替换为：

```javascript
function atomicWrite(file, data) {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
}
function saveJSON(file, data) { atomicWrite(file, data); }  // startup only

let writeChain = Promise.resolve();
function enqueueWrite(file, data) {
    writeChain = writeChain.then(() => atomicWrite(file, data));
    return writeChain;
}
```

- [ ] **Step 3：将登录处理器中的 saveJSON 改为 await enqueueWrite**

将（在登录 handler 中）：

```javascript
            saveJSON(FILES.users, users);
            const token = createSessionToken(wxid);
```

替换为：

```javascript
            await enqueueWrite(FILES.users, users);
            const token = createSessionToken(wxid);
```

- [ ] **Step 4：将 POST /api/messages 中的 saveJSON 改为 await enqueueWrite**

将（在 POST /api/messages handler 中）：

```javascript
            msgs.push(msg);
            saveJSON(FILES.messages, msgs);
            return json(res, 201, msg);
```

替换为：

```javascript
            msgs.push(msg);
            await enqueueWrite(FILES.messages, msgs);
            return json(res, 201, msg);
```

- [ ] **Step 5：将 POST /api/messages/:id/like 中的 saveJSON 改为 await enqueueWrite**

将（在 like handler 中）：

```javascript
            if (idx === -1) msg.likes.push(user.wxid);
            else msg.likes.splice(idx, 1);
            saveJSON(FILES.messages, msgs);
            return json(res, 200, { likes: msg.likes.length, liked: idx === -1 });
```

替换为：

```javascript
            if (idx === -1) msg.likes.push(user.wxid);
            else msg.likes.splice(idx, 1);
            await enqueueWrite(FILES.messages, msgs);
            return json(res, 200, { likes: msg.likes.length, liked: idx === -1 });
```

- [ ] **Step 6：验证并发写正常**

```bash
node portal/server.js &
sleep 1
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wxid":"conctest2","nickname":"并发测试2"}' \
  -c /tmp/ccb_conc2.txt > /dev/null
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost:3000/api/messages \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"原子写测试 $i\",\"type\":\"feedback\"}" \
    -b /tmp/ccb_conc2.txt &
done
wait
node -e "const d=require('./portal/data/messages.json'); console.log(d.length,'records, valid JSON ✓')"
kill %1
```

Expected: 输出 `N records, valid JSON ✓`（无 JSON parse 错误）

- [ ] **Step 7：Commit**

```bash
git add portal/server.js
git commit -m "feat: add atomic write queue for concurrent-safe JSON persistence"
```

---

## Task 5：server.js — 速率限制

**Files:**
- Modify: `portal/server.js` — 添加 checkRateLimit + 2 处 API 调用点

- [ ] **Step 1：写失败测试（第 11 条留言应该被拒绝，当前不会）**

```bash
node portal/server.js &
sleep 1
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wxid":"ratelimitest","nickname":"限速测试"}' \
  -c /tmp/ccb_rl.txt > /dev/null
for i in $(seq 1 11); do
  RESP=$(curl -s -X POST http://localhost:3000/api/messages \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"限速测试消息 $i\",\"type\":\"feedback\"}" \
    -b /tmp/ccb_rl.txt)
  echo "$i: $RESP" | grep -o '"error":[^}]*\|"id":[^,]*'
done
kill %1
```

Expected 当前：11 条都成功（没有错误），无速率限制。

- [ ] **Step 2：在 server.js Helpers 区末尾（json 函数之后）添加 checkRateLimit**

在 `function json(res, status, data) {` 块之后添加：

```javascript
const rateLimits = new Map();
function checkRateLimit(key, limit, windowMs) {
    const now   = Date.now();
    const entry = rateLimits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
    entry.count++;
    rateLimits.set(key, entry);
    return entry.count <= limit;
}
```

- [ ] **Step 3：在 POST /api/messages 中加速率限制检查**

将：

```javascript
        if (urlPath === '/api/messages' && method === 'POST') {
            const user = getUser(req);
            if (!user) return json(res, 401, { error: '请先登录' });
            const body    = await parseBody(req);
```

替换为：

```javascript
        if (urlPath === '/api/messages' && method === 'POST') {
            const user = getUser(req);
            if (!user) return json(res, 401, { error: '请先登录' });
            if (!checkRateLimit(`msg:${user.wxid}`, 10, 60_000))
                return json(res, 429, { error: '留言太频繁，请 1 分钟后再试' });
            const body    = await parseBody(req);
```

- [ ] **Step 4：在 POST /api/messages/:id/like 中加速率限制检查**

将：

```javascript
        if (m && method === 'POST') {
            const user = getUser(req);
            if (!user) return json(res, 401, { error: '请先登录' });
            const msgs = loadJSON(FILES.messages, []);
```

替换为：

```javascript
        if (m && method === 'POST') {
            const user = getUser(req);
            if (!user) return json(res, 401, { error: '请先登录' });
            if (!checkRateLimit(`like:${user.wxid}`, 30, 60_000))
                return json(res, 429, { error: '操作太频繁，请稍后再试' });
            const msgs = loadJSON(FILES.messages, []);
```

- [ ] **Step 5：运行速率限制测试**

```bash
node portal/server.js &
sleep 1
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wxid":"ratelimitest2","nickname":"限速测试2"}' \
  -c /tmp/ccb_rl2.txt > /dev/null
for i in $(seq 1 12); do
  RESP=$(curl -s -X POST http://localhost:3000/api/messages \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"测试 $i\",\"type\":\"feedback\"}" \
    -b /tmp/ccb_rl2.txt)
  echo "req $i: $(echo $RESP | grep -o '"error":[^}]*\|"id":[^,]*')"
done
kill %1
```

Expected: req 1–10 返回 `"id":...`，req 11–12 返回 `"error":"留言太频繁..."`

- [ ] **Step 6：Commit**

```bash
git add portal/server.js
git commit -m "feat: add rate limiting (10 msg/min, 30 likes/min per user)"
```

---

## Task 6：server.js — HTML 模板替换（SITE_URL 注入）

**Files:**
- Modify: `portal/server.js` — 静态文件 readFile 回调

- [ ] **Step 1：写失败测试（SITE_URL 占位符不会被替换）**

```bash
# 先在某个 HTML 里手动加占位符再测（Task 7 做完后才有，这里先验证替换逻辑）
node portal/server.js &
sleep 1
# 临时测试：直接检查首页是否含原始占位符
echo '{{SITE_URL}}' > /tmp/test_placeholder.txt
cat /tmp/test_placeholder.txt
kill %1
```

> 注：此 task 的完整验证在 Task 7 加完 meta 标签后进行。

- [ ] **Step 2：在 server.js 静态文件 readFile 回调中加 HTML 模板替换**

将：

```javascript
    fs.readFile(absPath, (err, data) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404: ' + urlPath); return; }
        const ext = path.extname(absPath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(data);
    });
```

替换为：

```javascript
    fs.readFile(absPath, (err, data) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404: ' + urlPath); return; }
        const ext = path.extname(absPath).toLowerCase();
        const content = ext === '.html'
            ? Buffer.from(data.toString('utf8').replace(/\{\{SITE_URL\}\}/g, SITE_URL))
            : data;
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(content);
    });
```

- [ ] **Step 3：Commit**

```bash
git add portal/server.js
git commit -m "feat: inject SITE_URL into HTML via template substitution"
```

---

## Task 7：创建 SVG favicon + 三个页面加 meta/og 标签

**Files:**
- Create: `portal/assets/favicon.svg`
- Modify: `portal/index.html` — `<head>` 区
- Modify: `portal/feedback.html` — `<head>` 区
- Modify: `portal/doc.html` — `<head>` 区

- [ ] **Step 1：创建 SVG favicon**

新建 `portal/assets/favicon.svg`，内容为：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4502B"/>
      <stop offset="100%" stop-color="#9333EA"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#g)"/>
  <text x="16" y="23" font-family="system-ui,-apple-system,sans-serif"
        font-size="20" font-weight="900" text-anchor="middle"
        fill="white" letter-spacing="-1">C</text>
</svg>
```

- [ ] **Step 2：在 index.html `<head>` 的 `</title>` 之后插入 meta + favicon**

找到：

```html
    <title>Claude Code Best — Windows 最佳 Claude Code 增强工具</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
```

替换为：

```html
    <title>Claude Code Best — Windows 最佳 Claude Code 增强工具</title>
    <meta name="description" content="CCB — Windows 最佳 Claude Code 增强工具。全面汉化、Git Bash 自动检测、多种启动模式，5 分钟上手。">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Claude Code Best（CCB）— Windows 最佳 Claude Code 增强工具">
    <meta property="og:description" content="让 Claude Code 真正为中文用户服务。100% 汉化覆盖，Git Bash 自动检测，一键安装。">
    <meta property="og:image" content="{{SITE_URL}}/assets/ccb-hero.png">
    <meta property="og:url" content="{{SITE_URL}}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
```

- [ ] **Step 3：在 feedback.html `<head>` 的 `</title>` 之后插入 meta + favicon**

找到 feedback.html 中的 `<title>` 标签（通常是"CCB 留言板"或类似），在其后插入：

```html
    <meta name="description" content="CCB 留言板 — 提交功能反馈、需求建议和 Bug 报告。">
    <meta property="og:title" content="CCB 留言板">
    <meta property="og:description" content="向 CCB 团队提交你的反馈和建议。">
    <meta property="og:image" content="{{SITE_URL}}/assets/ccb-hero.png">
    <meta property="og:url" content="{{SITE_URL}}/feedback">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
```

- [ ] **Step 4：在 doc.html `<head>` 的 `</title>` 之后插入 meta + favicon**

找到 doc.html 中的 `<title>` 标签，在其后插入：

```html
    <meta name="description" content="CCB 文档 — 快速开始、功能介绍、启动模式、MCP 配置、汉化机制等完整指南。">
    <meta property="og:title" content="CCB 文档">
    <meta property="og:description" content="Claude Code Best 完整使用文档。">
    <meta property="og:image" content="{{SITE_URL}}/assets/ccb-hero.png">
    <meta property="og:url" content="{{SITE_URL}}/doc">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
```

- [ ] **Step 5：启动服务器验证 favicon 和 meta 标签**

```bash
node portal/server.js &
sleep 1
# 验证 favicon 可访问
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/assets/favicon.svg
echo " ← favicon HTTP status (expect 200)"
# 验证 SITE_URL 模板被替换
curl -s http://localhost:3000/ | grep "og:image" | grep -v "{{SITE_URL}}"
echo " ← og:image line (should show http://localhost:3000/...)"
kill %1
```

Expected:
```
200 ← favicon HTTP status (expect 200)
<meta property="og:image" content="http://localhost:3000/assets/ccb-hero.png"> ← og:image line
```

- [ ] **Step 6：Commit**

```bash
git add portal/assets/favicon.svg portal/index.html portal/feedback.html portal/doc.html
git commit -m "feat: add SVG favicon and og/meta tags to all pages"
```

---

## Task 8：VPS 部署清单（文档）

**Files:**
- Create: `docs/superpowers/plans/vps-deploy-checklist.md`

- [ ] **Step 1：新建 VPS 部署清单文档**

创建 `docs/superpowers/plans/vps-deploy-checklist.md`：

```markdown
# CCB 门户 VPS 部署清单

## 前置条件

- Ubuntu 20.04+ 或 Debian 11+ VPS
- 公网 IP（假设 `1.2.3.4`，按实际替换）

## 1. 安装 Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # 确认 v18+
```

## 2. 上传代码

```bash
# 在 VPS 上 clone（或 git pull 已有 repo）
git clone https://github.com/JASMINE145-ACT/CCB-Iinstaller.git /home/ubuntu/ccb
# 确认 portal/ 目录存在
ls /home/ubuntu/ccb/portal/
```

## 3. 创建 GitHub Release（本地执行一次）

```bash
# 在本地 D:\Projects\claude-code-best\ccb-installer 目录
gh auth login
gh release create v1.0.7 CCB-Setup-1.0.7.exe \
  --repo JASMINE145-ACT/CCB-Iinstaller \
  --title "CCB v1.0.7 — 全面汉化 + Git Bash 修复" \
  --notes "- 100% 界面汉化\n- Git Bash 自动检测\n- 安装选项优化"
```

## 4. 安装 nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

## 5. 创建 systemd Service

```bash
sudo tee /etc/systemd/system/ccb-portal.service > /dev/null <<'EOF'
[Unit]
Description=CCB Portal
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ccb
Environment=CCB_SITE_URL=http://1.2.3.4
Environment=NODE_ENV=production
ExecStart=/usr/bin/node portal/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ccb-portal
sudo systemctl status ccb-portal  # 确认 active (running)
```

## 6. 配置 nginx 反向代理

```bash
sudo tee /etc/nginx/sites-available/ccb > /dev/null <<'EOF'
server {
    listen 80;
    server_name 1.2.3.4;

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/ccb /etc/nginx/sites-enabled/
sudo nginx -t          # 确认 syntax OK
sudo systemctl reload nginx
```

## 7. 开放防火墙

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS（备用，有域名后启用）
sudo ufw --force enable
sudo ufw status
```

## 8. 验证上线

```bash
# 在本地或 VPS 运行
curl -s -o /dev/null -w "%{http_code}" http://1.2.3.4/
# Expected: 200

curl -v http://1.2.3.4/api/download 2>&1 | grep "Location"
# Expected: Location: https://github.com/.../CCB-Setup-1.0.7.exe
```

## 9. 数据目录备份（可选，推荐）

```bash
# 在 VPS 上添加 cron 每日备份
crontab -e
# 添加这一行：
0 3 * * * tar czf /home/ubuntu/backup/ccb-data-$(date +\%F).tar.gz /home/ubuntu/ccb/portal/data 2>/dev/null
```

## 域名（有了之后）

1. DNS A 记录指向 `1.2.3.4`
2. 更新 nginx `server_name` 为域名
3. `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d yourdomain.com`
4. 更新 systemd service 中 `CCB_SITE_URL=https://yourdomain.com`
5. `sudo systemctl daemon-reload && sudo systemctl restart ccb-portal`

## 常用运维命令

```bash
sudo systemctl status ccb-portal    # 查看状态
sudo journalctl -u ccb-portal -f    # 实时日志
sudo systemctl restart ccb-portal   # 重启
cd /home/ubuntu/ccb && git pull && sudo systemctl restart ccb-portal  # 更新部署
```
```

- [ ] **Step 2：Commit**

```bash
git add docs/superpowers/plans/vps-deploy-checklist.md docs/superpowers/plans/2026-05-30-portal-v1-launch.md
git commit -m "docs: add VPS deployment checklist and v1 launch implementation plan"
```

---

## 验收清单

在 VPS 上执行以下检查，全部通过则 v1 上线完成：

- [ ] `curl -v http://IP/api/download` → `302 Location: https://github.com/.../CCB-Setup-1.0.7.exe`
- [ ] 登录后重启 `ccb-portal` 服务，`/api/auth/me` 仍返回用户信息
- [ ] 连续 POST 11 条 `/api/messages`，第 11 条返回 429
- [ ] `curl http://IP/assets/favicon.svg` → 200，内容含 `<svg`
- [ ] `curl http://IP/ | grep og:image` → 含 `http://IP/assets/ccb-hero.png`（非 `{{SITE_URL}}`）
- [ ] 浏览器访问 `http://IP`，标签页显示橙紫渐变 "C" 图标
- [ ] 留言板：发留言、点赞、重启服务器后数据仍在
