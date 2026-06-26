#!/bin/bash
# CCB-Wanding 服务器部署脚本
# 目标: root@67.216.206.3 -p 39222
# 用法: bash setup-server.sh

set -e

SERVER="root@67.216.206.3"
PORT=39222
DEPLOY_DIR="/opt/ccb-wanding"
WEB_DIR="/opt/ccb-wanding/web"
LOG_DIR="/var/log/ccb-wanding"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== CCB-Wanding 服务器部署 ==="

# ── 1. 安装依赖 ──────────────────────────────────────────────────────────────
echo ">>> 安装依赖..."
ssh -p $PORT $SERVER "
  set -e
  apt-get update -q
  apt-get install -y nginx unzip curl
  # Install Bun (Linux runtime)
  if ! command -v bun &>/dev/null; then
    curl -fsSL https://bun.sh/install | bash
    echo 'export PATH=\$HOME/.bun/bin:\$PATH' >> /root/.bashrc
    export PATH=\$HOME/.bun/bin:\$PATH
  fi
  # Install pm2 via bun's node or system node
  if ! command -v pm2 &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    npm install -g pm2
  fi
  mkdir -p $DEPLOY_DIR $WEB_DIR $LOG_DIR
"

# ── 2. 上传 CCB-Wanding JS 文件 ──────────────────────────────────────────────
echo ">>> 上传 CCB-Wanding dist..."
tar czf /tmp/ccb-wanding-dist.tar.gz \
  -C "$SCRIPT_DIR" \
  --exclude='web-data' \
  --exclude='*.log' \
  dist

scp -P $PORT /tmp/ccb-wanding-dist.tar.gz $SERVER:/tmp/
ssh -p $PORT $SERVER "
  tar xzf /tmp/ccb-wanding-dist.tar.gz -C $DEPLOY_DIR
  rm /tmp/ccb-wanding-dist.tar.gz
"
rm /tmp/ccb-wanding-dist.tar.gz

# ── 3. 上传 MCP 配置（如有）──────────────────────────────────────────────────
if [ -f "$SCRIPT_DIR/ccb-mcp.json" ]; then
  echo ">>> 上传 ccb-mcp.json..."
  scp -P $PORT "$SCRIPT_DIR/ccb-mcp.json" $SERVER:$DEPLOY_DIR/
fi

# ── 4. 上传前端构建产物 ──────────────────────────────────────────────────────
FRONTEND_DIST="$(cd "$(dirname "$0")/../../ccb-wanding-web" && pwd)/dist"
if [ -d "$FRONTEND_DIST" ]; then
  echo ">>> 上传前端..."
  tar czf /tmp/ccb-web.tar.gz -C "$FRONTEND_DIST" .
  scp -P $PORT /tmp/ccb-web.tar.gz $SERVER:/tmp/
  ssh -p $PORT $SERVER "
    rm -rf $WEB_DIR/*
    tar xzf /tmp/ccb-web.tar.gz -C $WEB_DIR
    rm /tmp/ccb-web.tar.gz
  "
  rm /tmp/ccb-web.tar.gz
else
  echo "⚠  前端 dist 未找到，需要先运行: cd ccb-wanding-web && bun run build"
fi

# ── 5. 上传 PM2 和 Nginx 配置 ─────────────────────────────────────────────────
echo ">>> 上传配置..."
scp -P $PORT "$(dirname "$0")/ecosystem.config.js" $SERVER:$DEPLOY_DIR/
scp -P $PORT "$(dirname "$0")/nginx.conf" $SERVER:/etc/nginx/sites-available/ccb-wanding
ssh -p $PORT $SERVER "
  ln -sf /etc/nginx/sites-available/ccb-wanding /etc/nginx/sites-enabled/ccb-wanding
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
"

# ── 6. 启动 CCB-Wanding 服务 ─────────────────────────────────────────────────
echo ">>> 启动服务..."
ssh -p $PORT $SERVER "
  export PATH=\$HOME/.bun/bin:\$PATH
  cd $DEPLOY_DIR
  pm2 delete ccb-wanding-serve 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup systemd -u root --hp /root | tail -1 | bash || true
"

# ── 7. 验证 ──────────────────────────────────────────────────────────────────
echo ">>> 验证部署..."
sleep 5
ssh -p $PORT $SERVER "curl -s http://localhost:3000/api/health"

echo ""
echo "✅ 部署完成！"
echo "   前端:   http://67.216.206.3"
echo "   API:    http://67.216.206.3/api/health"
echo ""
echo "   查看日志: ssh -p $PORT $SERVER 'pm2 logs ccb-wanding-serve'"
echo "   重启服务: ssh -p $PORT $SERVER 'pm2 restart ccb-wanding-serve'"
