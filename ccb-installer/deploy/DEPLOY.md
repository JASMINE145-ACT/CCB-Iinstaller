# CCB-Wanding Web 部署指南

## 架构概览

```
用户浏览器
    ↓ HTTP/WebSocket (port 80)
Nginx（反向代理）
    ↓
AionUI web-cli（port 3000）
  ├── 前端 React UI（Cursor/Claude Desktop 风格）
  ├── 会话管理（多用户）
  └── ACP 协议
        ↓
    CCB-Wanding（--acp 模式）
      ├── MiniMax API
      ├── Exa 搜索 MCP
      ├── Excel MCP
      └── 自定义业务工具
```

## 方案 A：AionUI + CCB-Wanding（推荐）

AionUI 提供完整 Web UI，CCB-Wanding 作为 ACP agent 提供 AI 能力。

### 部署步骤

```bash
# 1. 在本机执行（会远程 SSH 完成所有操作）
bash ccb-installer/deploy/setup-aionui.sh

# 2. 在 AionUI 界面注册 CCB-Wanding
# Settings → Agent Management → Custom Agents → Add
# 名称: CCB-Wanding
# 命令: /opt/ccb-wanding/vendor/bun/bun
# 参数: /opt/ccb-wanding/dist/cli.js --acp
```

### 功能

- ✅ 多用户独立会话
- ✅ 侧边栏会话管理
- ✅ 文件上传与处理
- ✅ 代码高亮 + Markdown 渲染
- ✅ 定时任务（Cron）
- ✅ 移动端支持

---

## 方案 B：独立 API 服务（轻量）

仅使用我们自建的 serve-wanding.js，前端使用 ccb-wanding-web。

### 启动后端

```bash
# 开发测试
cd ccb-installer
ccb-wanding.cmd serve --port=3000

# 或直接用 bun
vendor\bun\bun.exe dist\cli.js serve --port=3000
```

### 启动前端

```bash
cd ccb-wanding-web
npm install
npm run dev          # 开发
npm run build        # 构建生产版本
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | /api/health | 健康检查 |
| GET  | /api/sessions?userId=xxx | 获取会话列表 |
| POST | /api/sessions | 创建会话 |
| DELETE | /api/sessions/:id | 删除会话 |
| GET  | /api/sessions/:id | 获取会话详情（含消息） |
| PATCH | /api/sessions/:id/title | 重命名会话 |
| WS   | /ws?userId=xxx | WebSocket 实时通信 |

### WebSocket 消息格式

```json
// 发送消息
{ "type": "chat", "sessionId": "uuid", "message": "你好" }

// 中断生成
{ "type": "interrupt", "sessionId": "uuid" }

// 服务端响应
{ "type": "start",   "sessionId": "uuid" }
{ "type": "chunk",   "sessionId": "uuid", "content": "..." }
{ "type": "done",    "sessionId": "uuid", "duration": 1234 }
{ "type": "error",   "error": "..." }
```

---

## 服务器信息

- **地址**: 67.216.206.3
- **SSH**: `ssh -p 39222 root@67.216.206.3`
- **日志**: `/var/log/ccb-wanding/`
- **CCB 安装目录**: `/opt/ccb-wanding/`
- **AionUI 目录**: `/opt/aionui/`

## 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs aionui-web
pm2 logs ccb-wanding-serve

# 重启服务
pm2 restart aionui-web

# 更新 CCB-Wanding（本机执行）
bash ccb-installer/deploy/setup-aionui.sh
```
