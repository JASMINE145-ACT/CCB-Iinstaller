# CCB-Wanding 更新服务器部署说明

## 服务器目录结构

```
/var/www/ccb-wanding/
├── version.json              ← 版本清单（每次发布只改这一个文件）
├── CCB-Wanding-1.1.1.exe
└── CCB-Wanding-1.1.2.exe    ← 上传新包后更新 version.json
```

## version.json 格式（多版本 + 自动更新）

```json
{
  "latest": "1.1.2",
  "url": "https://YOUR_DOMAIN/ccb-wanding/CCB-Wanding-1.1.2.exe",
  "notes": "修复 Accurate MCP 查询稳定性问题",
  "versions": [
    {
      "version": "1.1.2",
      "url": "https://YOUR_DOMAIN/ccb-wanding/CCB-Wanding-1.1.2.exe",
      "notes": "修复 Accurate MCP 查询稳定性",
      "date": "2026-06-10",
      "size_mb": 308
    },
    {
      "version": "1.1.1",
      "url": "https://YOUR_DOMAIN/ccb-wanding/CCB-Wanding-1.1.1.exe",
      "notes": "自动更新 + 多版本选择",
      "date": "2026-06-09",
      "size_mb": 308
    },
    {
      "version": "1.0.9",
      "url": "https://YOUR_DOMAIN/ccb-wanding/CCB-Wanding-1.0.9.exe",
      "notes": "稳定版",
      "date": "2026-05-20",
      "size_mb": 305
    }
  ]
}
```

**字段说明：**

| 字段 | 必填 | 说明 |
|------|------|------|
| `latest` | 是 | 自动更新跟踪的目标版本 |
| `url` | 是 | 顶层 URL 供旧版客户端（无 versions 字段）回退 |
| `notes` | 否 | 顶层备注，显示在自动更新提示中 |
| `versions` | 否 | 版本列表，供用户手动选择安装；缺失时 `-Select` 降级为单条目 |
| `versions[].size_mb` | 否 | 显示在版本列表中；无此字段则不显示 |

## Nginx 配置（最小化）

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name YOUR_DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;

    location /ccb-wanding/ {
        alias /var/www/ccb-wanding/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        types {
            application/json json;
            application/octet-stream exe;
        }
        autoindex off;
    }
}
```

## 发布新版本流程

```bash
# 1. 上传安装包
scp CCB-Wanding-1.1.2.exe user@server:/var/www/ccb-wanding/

# 2. 更新清单（最后一步，客户端才会看到新版本）
ssh user@server "cat > /var/www/ccb-wanding/version.json << 'EOF'
{
  \"latest\": \"1.1.2\",
  \"url\": \"https://YOUR_DOMAIN/ccb-wanding/CCB-Wanding-1.1.2.exe\",
  \"notes\": \"更新说明\",
  \"versions\": [
    {\"version\": \"1.1.2\", \"url\": \"https://YOUR_DOMAIN/ccb-wanding/CCB-Wanding-1.1.2.exe\",
     \"notes\": \"更新说明\", \"date\": \"2026-06-10\", \"size_mb\": 308},
    {\"version\": \"1.1.1\", \"url\": \"https://YOUR_DOMAIN/ccb-wanding/CCB-Wanding-1.1.1.exe\",
     \"notes\": \"自动更新\", \"date\": \"2026-06-09\", \"size_mb\": 308}
  ]
}
EOF"
```

## 用户如何选择版本

安装后桌面 / 开始菜单会有 **"CCB-Wanding 版本选择"** 快捷方式，
点击后会拉取版本列表，用数字选择目标版本，确认后静默安装。

也可在已安装目录下直接运行：
```cmd
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ccb-check-update.ps1 -Select
```

## 配置客户端 URL

在 `ccb-check-update.ps1` 第 26 行替换：
```
$BuiltInUrl = "https://YOUR_SERVER_DOMAIN/ccb-wanding/version.json"
```

或在用户机器上设置环境变量跳过内置 URL（测试用）：
```
CCB_UPDATE_MANIFEST_URL=https://YOUR_DOMAIN/ccb-wanding/version.json
```

## 禁用自动更新

用户可在启动前设置 `CCB_NO_UPDATE=1` 跳过所有更新检查。
版本选择快捷方式不受此变量影响（它是显式触发的）。
