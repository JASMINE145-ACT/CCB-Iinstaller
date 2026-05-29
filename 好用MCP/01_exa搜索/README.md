# exa - 神经网络搜索 MCP

##这是什么

纯 HTTP 类型的 MCP server，无需安装任何东西，直接配置即可使用。

**功能**：
- `web_search_exa` — 神经网络搜索（网页、代码、公司、人物）
- `web_fetch_exa` — 获取任意 URL 的内容，智能提取关键信息
- 无需 API Key，免费使用基础功能

## 使用方法

1. 打开你的 Claude Code 项目目录
2. 打开或创建 `.mcp.json` 文件（项目根目录）
3. 将本目录下的 `mcp.json` 内容复制进去
4. 重启 Claude Code
5. 输入 `/mcp` 确认 `exa` 状态为 `✔ connected`

## 验证是否生效

在 Claude Code 对话框中尝试：

```
搜索一下 React 最新文档
```

或者

```
抓取 https://github.com 的内容
```

## 依赖

**无。** 纯 HTTP 连接，Windows/Mac/Linux 均可，无需 Node.js。

## 常见问题

**Q: 显示 `✘ failed`？**
检查网络是否可达 `https://mcp.exa.ai/mcp`，可能需要代理。

**Q: 需要 API Key 吗？**
基础搜索和抓取无需 Key，免费使用。如需高级功能可在 https://exa.ai 申请。

**Q: 速度慢？**
HTTP MCP 依赖网络质量，亚洲用户可能需要配置代理。

## 更多信息

- 官方文档：https://github.com/affaan-m/everything-claude-code
- MCP 官方列表：https://modelcontextprotocol.io