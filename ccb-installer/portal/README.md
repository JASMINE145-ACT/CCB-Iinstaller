# CCB Portal

CCB 门户网站静态版，围绕 `ccb-installer` 提供下载、更新公告、使用文档、FAQ、反馈和讨论入口。

## 本地预览

直接打开：

```text
ccb-installer\portal\index.html
```

或用任意静态服务器：

```powershell
cd D:\Projects\claude-code-best\ccb-installer\portal
python -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

## 当前定位

这是第一版 MVP：

- 不需要数据库
- 不需要登录
- 不依赖 Node/Vite/Next
- 可以直接部署到 GitHub Pages、Cloudflare Pages、Nginx、对象存储

## 后续可接入

- GitHub Releases：自动读取最新安装包
- GitHub Issues：反馈入口
- GitHub Discussions：用户讨论
- 后端工单系统：企业客户反馈
- 简单埋点：下载量、文档点击、失败反馈
