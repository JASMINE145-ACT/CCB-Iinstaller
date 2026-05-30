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
