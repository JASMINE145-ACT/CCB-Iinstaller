const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const PORT     = 3000;
const ROOT     = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

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


// ─── Helpers ────────────────────────────────────────────────
function loadJSON(file, def) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return def; }
}
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
function parseCookies(header = '') {
    return Object.fromEntries(
        header.split(';').map(c => {
            const [k, ...v] = c.trim().split('=');
            return [k.trim(), v.join('=')];
        }).filter(([k]) => k)
    );
}
function parseBody(req) {
    return new Promise((res, rej) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => { try { res(JSON.parse(body || '{}')); } catch { res({}); } });
        req.on('error', rej);
    });
}
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
function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

const rateLimits = new Map();
function checkRateLimit(key, limit, windowMs) {
    const now   = Date.now();
    const entry = rateLimits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
    entry.count++;
    rateLimits.set(key, entry);
    return entry.count <= limit;
}

// ─── Seed demo data ─────────────────────────────────────────
if (!fs.existsSync(FILES.users)) saveJSON(FILES.users, []);
if (!fs.existsSync(FILES.messages)) {
    saveJSON(FILES.messages, [
        {
            id: 'demo001',
            wxid: 'zhangsan_demo',
            nickname: '张三',
            avatar: 'Z',
            content: '汉化做得非常好！之前用英文版总是要翻译，现在直接用中文很方便。希望后续可以支持繁体中文选项。',
            type: 'request',
            version: 'v1.0.7',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            likes: ['lisi_demo'],
        },
        {
            id: 'demo002',
            wxid: 'wangwu_dev',
            nickname: '小王同学',
            avatar: 'W',
            content: 'Git Bash 自动检测终于修好了，之前每次都要手动设置路径，很烦。这次更新解决了我最大的痛点！👍',
            type: 'feedback',
            version: 'v1.0.7',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            likes: ['zhangsan_demo', 'lisi_demo', 'user123'],
        },
        {
            id: 'demo003',
            wxid: 'lisi_demo',
            nickname: 'LiSi',
            avatar: 'L',
            content: '建议增加一个暗色模式选项，在晚上用眼睛会舒服一些。另外安装包能不能做个便携版，不用安装直接运行？',
            type: 'request',
            version: 'general',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            likes: ['wangwu_dev'],
        },
    ]);
}

// ─── MIME types ─────────────────────────────────────────────
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.md':   'text/plain; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff2':'font/woff2',
};

// ─── Server ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const url    = new URL(req.url, `http://localhost:${PORT}`);
    const urlPath = decodeURIComponent(url.pathname);
    const method  = req.method.toUpperCase();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ── API ────────────────────────────────────────
    if (urlPath.startsWith('/api/')) {

        // GET /api/download — redirect to GitHub Release
        if (urlPath === '/api/download' && method === 'GET') {
            const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            console.log(`[download] ${new Date().toISOString()} ${ip}`);
            res.writeHead(302, { 'Location': DOWNLOAD_URL });
            res.end();
            return;
        }

        // POST /api/auth/login
        if (urlPath === '/api/auth/login' && method === 'POST') {
            const body     = await parseBody(req);
            const wxid     = (body.wxid || '').trim().replace(/\s/g, '');
            const nickname = (body.nickname || '').trim() || wxid;
            if (!wxid || wxid.length < 2) return json(res, 400, { error: '微信号至少 2 位字符' });
            if (wxid.length > 40)         return json(res, 400, { error: '微信号过长' });
            const users = loadJSON(FILES.users, []);
            let user = users.find(u => u.wxid === wxid);
            if (!user) {
                user = { wxid, nickname, avatar: nickname[0].toUpperCase(), createdAt: new Date().toISOString() };
                users.push(user);
            } else {
                user.nickname = nickname;
                user.avatar   = nickname[0].toUpperCase();
            }
            await enqueueWrite(FILES.users, users);
            const token = createSessionToken(wxid);
            res.setHeader('Set-Cookie', `ccb_session=${token}; Path=/; HttpOnly; Max-Age=604800`);
            return json(res, 200, { ok: true, user });
        }

        // POST /api/auth/logout
        if (urlPath === '/api/auth/logout' && method === 'POST') {
            res.setHeader('Set-Cookie', 'ccb_session=; Path=/; HttpOnly; Max-Age=0');
            return json(res, 200, { ok: true });
        }

        // GET /api/auth/me
        if (urlPath === '/api/auth/me' && method === 'GET') {
            return json(res, 200, { user: getUser(req) });
        }

        // GET /api/messages
        if (urlPath === '/api/messages' && method === 'GET') {
            let msgs = loadJSON(FILES.messages, []);
            const type    = url.searchParams.get('type');
            const version = url.searchParams.get('version');
            if (type    && type    !== 'all') msgs = msgs.filter(m => m.type    === type);
            if (version && version !== 'all') msgs = msgs.filter(m => m.version === version);
            return json(res, 200, msgs.slice().reverse());
        }

        // POST /api/messages
        if (urlPath === '/api/messages' && method === 'POST') {
            const user = getUser(req);
            if (!user) return json(res, 401, { error: '请先登录' });
            if (!checkRateLimit(`msg:${user.wxid}`, 10, 60_000))
                return json(res, 429, { error: '留言太频繁，请 1 分钟后再试' });
            const body    = await parseBody(req);
            const content = (body.content || '').trim();
            if (!content || content.length < 2)  return json(res, 400, { error: '内容至少 2 个字' });
            if (content.length > 500)             return json(res, 400, { error: '内容不超过 500 字' });
            const validTypes = ['feedback', 'request', 'bug'];
            const msgs = loadJSON(FILES.messages, []);
            const msg = {
                id:        crypto.randomBytes(8).toString('hex'),
                wxid:      user.wxid,
                nickname:  user.nickname,
                avatar:    user.avatar,
                content,
                type:      validTypes.includes(body.type) ? body.type : 'feedback',
                version:   body.version || 'general',
                createdAt: new Date().toISOString(),
                likes:     [],
            };
            msgs.push(msg);
            await enqueueWrite(FILES.messages, msgs);
            return json(res, 201, msg);
        }

        // POST /api/messages/:id/like
        const m = urlPath.match(/^\/api\/messages\/([a-f0-9]+)\/like$/);
        if (m && method === 'POST') {
            const user = getUser(req);
            if (!user) return json(res, 401, { error: '请先登录' });
            if (!checkRateLimit(`like:${user.wxid}`, 30, 60_000))
                return json(res, 429, { error: '操作太频繁，请稍后再试' });
            const msgs = loadJSON(FILES.messages, []);
            const msg  = msgs.find(x => x.id === m[1]);
            if (!msg) return json(res, 404, { error: '找不到该留言' });
            if (!msg.likes) msg.likes = [];
            const idx = msg.likes.indexOf(user.wxid);
            if (idx === -1) msg.likes.push(user.wxid);
            else msg.likes.splice(idx, 1);
            await enqueueWrite(FILES.messages, msgs);
            return json(res, 200, { likes: msg.likes.length, liked: idx === -1 });
        }

        return json(res, 404, { error: 'API not found' });
    }

    // ── Static files ───────────────────────────────
    let filePath = urlPath;
    if (filePath === '/' || filePath === '')   filePath = '/portal/index.html';
    if (filePath === '/feedback')              filePath = '/portal/feedback.html';
    if (filePath === '/doc')                   filePath = '/portal/doc.html';
    // Portal pages are served at / but reference ./assets/ which resolves to /assets/;
    // remap /assets/ → /portal/assets/ so relative paths in portal HTML work.
    if (filePath.startsWith('/assets/'))       filePath = '/portal' + filePath;

    const absPath = path.join(ROOT, filePath);
    if (!absPath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

    fs.readFile(absPath, (err, data) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404: ' + urlPath); return; }
        const ext = path.extname(absPath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(data);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  🚀  Claude Code Best Portal`);
    console.log(`  ➜  首页     http://localhost:${PORT}/`);
    console.log(`  ➜  留言板   http://localhost:${PORT}/feedback\n`);
});
