#!/bin/bash
# AionUI Web 一键部署脚本
# 目标: root@67.216.206.3 -p 39222, port 80
set -e

SERVER="root@67.216.206.3"
PORT=39222
INSTALL_DIR="/opt/aionui-web"
LOG_DIR="/var/log/aionui"
VERSION="2.1.16"

echo "=== AionUI Web 部署 v${VERSION} ==="

# ── 1. 安装基础依赖 ───────────────────────────────────────────────────────────
echo ">>> [1/5] 安装依赖..."
ssh -p $PORT $SERVER bash <<'REMOTE'
set -e
apt-get update -q
apt-get install -y nginx curl
# Node.js 20 + PM2
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2 2>/dev/null || true
mkdir -p /opt/aionui-web /var/log/aionui
echo "  依赖安装完成"
REMOTE

# ── 2. 下载并安装 aionui-web ──────────────────────────────────────────────────
echo ">>> [2/5] 安装 aionui-web..."
ssh -p $PORT $SERVER bash <<REMOTE
set -e
cd /tmp
if [ ! -f "aionui-web-${VERSION}-linux-x86_64.tar.gz" ]; then
  echo "  下载 aionui-web ${VERSION}..."
  curl -L -o aionui-web-${VERSION}-linux-x86_64.tar.gz \
    "https://github.com/iOfficeAI/AionUi/releases/download/v${VERSION}/aionui-web-${VERSION}-linux-x86_64.tar.gz"
fi
echo "  解压..."
tar xzf aionui-web-${VERSION}-linux-x86_64.tar.gz -C /opt/aionui-web --strip-components=1 2>/dev/null || \
tar xzf aionui-web-${VERSION}-linux-x86_64.tar.gz -C /opt/aionui-web
chmod +x /opt/aionui-web/aionui-web 2>/dev/null || \
find /opt/aionui-web -name "aionui-web" -type f -exec chmod +x {} \;
echo "  安装完成: $(find /opt/aionui-web -name 'aionui-web' | head -1)"
REMOTE

# ── 3. PM2 配置 ────────────────────────────────────────────────────────────────
echo ">>> [3/5] 配置 PM2..."
ssh -p $PORT $SERVER bash <<'REMOTE'
cat > /opt/aionui-web/ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'aionui-web',
    script: '/opt/aionui-web/aionui-web',
    args: '',
    cwd: '/opt/aionui-web',
    env: {
      NODE_ENV: 'production',
      AIONUI_PORT: '3000',
      AIONUI_HOST: '127.0.0.1',
      AIONUI_DATA_DIR: '/opt/aionui-data',
      AIONUI_LOG_DIR: '/var/log/aionui',
      AIONUI_ALLOW_REMOTE: '1',
    },
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 3000,
    out_file: '/var/log/aionui/out.log',
    error_file: '/var/log/aionui/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
}
EOF
mkdir -p /opt/aionui-data
echo "  PM2 配置完成"
REMOTE

# ── 4. Nginx 配置 ─────────────────────────────────────────────────────────────
echo ">>> [4/5] 配置 Nginx..."
ssh -p $PORT $SERVER bash <<'REMOTE'
cat > /etc/nginx/sites-available/aionui <<'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/aionui /etc/nginx/sites-enabled/aionui
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/ccb-wanding
nginx -t && systemctl reload nginx
echo "  Nginx 配置完成"
REMOTE

# ── 5. 启动服务 ────────────────────────────────────────────────────────────────
echo ">>> [5/5] 启动 AionUI..."
ssh -p $PORT $SERVER bash <<'REMOTE'
cd /opt/aionui-web
pm2 delete aionui-web 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash || true

echo "  等待启动..."
sleep 5

# 获取初始密码
echo ""
echo "  初始管理员密码:"
pm2 logs aionui-web --lines 20 --nostream 2>/dev/null | grep -i "password\|admin\|初始\|pass" || true
REMOTE

echo ""
echo "✅ AionUI Web 部署完成！"
echo ""
echo "  访问: http://67.216.206.3"
echo ""
echo "  首次配置步骤："
echo "  1. 打开 http://67.216.206.3，用 admin 账号登录"
echo "  2. Settings → Models → Add Model → 选 MiniMax"
echo "     API Key: (你的 MiniMax key)"
echo "  3. 开始使用！"
echo ""
echo "  查看初始密码: ssh -p $PORT $SERVER 'pm2 logs aionui-web --lines 30 --nostream'"
echo "  重置密码:     ssh -p $PORT $SERVER '/opt/aionui-web/aionui-web resetpass'"
