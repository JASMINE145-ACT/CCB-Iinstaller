#!/bin/bash
# AionUI + CCB-Wanding 服务器部署脚本
# 服务器: root@67.216.206.3 -p 39222
# 架构: Browser → Nginx → AionUI web-cli → CCB-Wanding (--ccb-acp) → ccb-runtime → MiniMax
set -e

SERVER="root@67.216.206.3"
SSH_PORT=39222
CCB_DIR="/opt/ccb-wanding"
AIONUI_DIR="/opt/aionui"
LOG_DIR="/var/log/ccb-wanding"

echo ""
echo "═══════════════════════════════════════════"
echo "  CCB-Wanding + AionUI 服务器部署"
echo "═══════════════════════════════════════════"
echo ""

# ─── 第 1 步：服务器基础环境 ───────────────────────────────────────────────
echo ">>> [1/6] 安装基础依赖..."
ssh -p $SSH_PORT $SERVER bash <<'REMOTE'
  set -e
  apt-get update -q
  apt-get install -y nginx git curl unzip

  # 安装 Bun
  if ! command -v bun &>/dev/null; then
    curl -fsSL https://bun.sh/install | bash
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.bun/bin:$PATH"
  fi

  # 安装 Node.js 20
  if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi

  # 安装 PM2
  npm install -g pm2 2>/dev/null || true

  mkdir -p $CCB_DIR $AIONUI_DIR $LOG_DIR
  echo "  基础依赖安装完成"
REMOTE

# ─── 第 2 步：上传 CCB-Wanding ─────────────────────────────────────────────
echo ">>> [2/6] 上传 CCB-Wanding..."
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
tar czf /tmp/ccb-wanding.tar.gz \
  -C "$SCRIPT_DIR" \
  --exclude='web-data' \
  --exclude='*.log' \
  --exclude='ccb-wanding-web' \
  dist vendor ccb-mcp.json deploy/ecosystem.config.js

scp -P $SSH_PORT /tmp/ccb-wanding.tar.gz $SERVER:/tmp/
ssh -p $SSH_PORT $SERVER bash <<REMOTE
  set -e
  tar xzf /tmp/ccb-wanding.tar.gz -C $CCB_DIR
  rm /tmp/ccb-wanding.tar.gz
  chmod +x $CCB_DIR/vendor/bun/bun.exe 2>/dev/null || \
  chmod +x $CCB_DIR/vendor/bun/bun 2>/dev/null || true
  echo "  CCB-Wanding 上传完成"
REMOTE
rm /tmp/ccb-wanding.tar.gz

# ─── 第 3 步：克隆 & 构建 AionUI ─────────────────────────────────────────
echo ">>> [3/6] 克隆并构建 AionUI..."
ssh -p $SSH_PORT $SERVER bash <<REMOTE
  set -e
  export PATH="\$HOME/.bun/bin:\$PATH"

  if [ ! -d "$AIONUI_DIR/.git" ]; then
    git clone https://github.com/iOfficeAI/AionUi.git $AIONUI_DIR
  else
    cd $AIONUI_DIR && git pull
  fi

  cd $AIONUI_DIR
  bun install
  bun run build 2>&1 | tail -5
  echo "  AionUI 构建完成"
REMOTE

# ─── 第 4 步：配置 AionUI 环境 ────────────────────────────────────────────
echo ">>> [4/6] 配置 AionUI 环境..."
ssh -p $SSH_PORT $SERVER bash <<REMOTE
  cat > $AIONUI_DIR/.env.production <<'ENV'
# AionUI 生产配置
NODE_ENV=production
AIONUI_PORT=3000
AIONUI_HOST=127.0.0.1
AIONUI_DATA_DIR=/opt/aionui-data
AIONUI_LOG_DIR=/var/log/ccb-wanding

# 指向 CCB-Wanding 作为默认 ACP agent
AIONUI_DEFAULT_AGENT_CMD=$CCB_DIR/vendor/bun/bun
AIONUI_DEFAULT_AGENT_ARGS=$CCB_DIR/dist/cli.js --ccb-acp

# CCB-Wanding 环境（透传给 ACP 子进程）
ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
ANTHROPIC_AUTH_TOKEN=YOUR_MINIMAX_TOKEN
ANTHROPIC_DEFAULT_OPUS_MODEL=minimax-m3
ANTHROPIC_DEFAULT_SONNET_MODEL=minimax-m3
ANTHROPIC_DEFAULT_HAIKU_MODEL=minimax-m3
CLAUDE_CONFIG_DIR=/opt/aionui-data/.claude
ENABLE_SEARCH_EXTRA_TOOLS=auto:100
CCB_NO_PAUSE=1
FORCE_COLOR=0
NO_COLOR=1
ENV
  mkdir -p /opt/aionui-data
  echo "  AionUI 环境配置完成"
REMOTE

# ─── 第 5 步：PM2 启动 AionUI ─────────────────────────────────────────────
echo ">>> [5/6] 启动 AionUI..."
ssh -p $SSH_PORT $SERVER bash <<REMOTE
  export PATH="\$HOME/.bun/bin:\$PATH"

  # PM2 配置
  cat > $AIONUI_DIR/ecosystem.aionui.js <<'PM2'
module.exports = {
  apps: [{
    name: 'aionui-web',
    script: '/root/.bun/bin/bun',
    args: 'run packages/web-cli/src/index.ts',
    cwd: '$AIONUI_DIR',
    env_file: '.env.production',
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
    },
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    log_file: '/var/log/ccb-wanding/aionui-combined.log',
    out_file: '/var/log/ccb-wanding/aionui-out.log',
    error_file: '/var/log/ccb-wanding/aionui-error.log',
  }],
}
PM2

  pm2 delete aionui-web 2>/dev/null || true
  pm2 start $AIONUI_DIR/ecosystem.aionui.js
  pm2 save
  pm2 startup systemd -u root --hp /root 2>/dev/null | grep -v "^$" | tail -1 | bash || true
  echo "  AionUI 启动完成"
REMOTE

# ─── 第 6 步：Nginx 配置 ───────────────────────────────────────────────────
echo ">>> [6/6] 配置 Nginx..."
scp -P $SSH_PORT "$(dirname "$0")/nginx-aionui.conf" $SERVER:/etc/nginx/sites-available/ccb-wanding
ssh -p $SSH_PORT $SERVER bash <<REMOTE
  ln -sf /etc/nginx/sites-available/ccb-wanding /etc/nginx/sites-enabled/ccb-wanding
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  echo "  Nginx 配置完成"
REMOTE

# ─── 验证 ──────────────────────────────────────────────────────────────────
echo ""
echo ">>> 验证部署..."
sleep 5
ssh -p $SSH_PORT $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ || echo 'not ready yet'"

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo ""
echo "  访问地址: http://67.216.206.3"
echo ""
echo "  首次使用："
echo "  1. 打开 http://67.216.206.3"
echo "  2. Settings → Agent Management → Custom Agents"
echo "  3. 添加 CCB-Wanding："
echo "     名称: CCB-Wanding"
echo "     命令: $CCB_DIR/vendor/bun/bun"
echo "     参数: $CCB_DIR/dist/cli.js --ccb-acp"
echo ""
echo "  日志查看: ssh -p $SSH_PORT $SERVER 'pm2 logs aionui-web'"
echo "═══════════════════════════════════════════"
