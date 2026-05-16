# 报价 MCP 迁移清单

## 迁移目录

```
源项目/
├── mcp_servers/quotation-server/    # MCP Server (TypeScript)
├── python/                          # Python 逻辑
├── data/                            # 价格库/映射表/业务知识
└── CLAUDE.md                        # 报价规则（末尾报价专用段落）
```

## 步骤

### 1. 复制文件

| 文件/目录 | 说明 | 必须 |
|---|---|---|
| `mcp_servers/quotation-server/` | MCP Server 本体 | ✅ |
| `python/` | Python 逻辑（main.py 等） | ✅ |
| `data/wanding_price_lib.xlsx` | 价格库 | ✅ |
| `data/mapping_table.xlsx` | 映射表 | ✅ |
| `data/wanding_business_knowledge.md` | 业务知识 | ✅ |
| `CLAUDE.md`（报价段落） | 工具路由规则/档位映射 | ✅（如需报价功能） |

### 2. 目标机器安装依赖

```bash
cd mcp_servers/quotation-server
bun install
```

### 3. 配置环境变量

| 变量 | 说明 | 来源 |
|---|---|---|
| `AOL_ACCESS_TOKEN` | Accurate API 凭证 | 原项目 `.mcp.json` |
| `AOL_DATABASE_ID` | Accurate 数据库 ID | 原项目 `.mcp.json` |
| `AOL_SIGNATURE_SECRET` | Accurate 签名密钥 | 原项目 `.mcp.json` |
| `PYTHON_EXECUTABLE` | Python 路径（可选，默认 python） | 按需 |

### 4. 配置目标 Agent 的 `.mcp.json`

```json
{
  "mcpServers": {
    "quotation": {
      "command": "bun",
      "args": ["run", "mcp_servers/quotation-server/dist/index.js"],
      "env": {
        "AOL_ACCESS_TOKEN": "xxx",
        "AOL_DATABASE_ID": "xxx",
        "AOL_SIGNATURE_SECRET": "xxx"
      }
    }
  }
}
```

> 如果目标 agent 不支持 Bun，改为：
> `"command": "node"` + `"args": ["mcp_servers/quotation-server/dist/index.js"]`

### 5. 验证

```bash
# 测试 MCP 是否启动成功
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | bun run mcp_servers/quotation-server/dist/index.js

# 或者在 agent 中直接调用工具测试
```

## 依赖清单

| 依赖 | 最低要求 | 说明 |
|---|---|---|
| Node.js / Bun | Bun 推荐，Node.js 也支持 | 已做 `import.meta.require` 兼容 |
| Python | 3.x | 运行 main.py |
| openpyxl | latest | Python 读 xlsx |
| xlsx | latest | MCP server 读 Excel |

## 如需迁移 Python 依赖

```bash
pip install -r python/requirements.txt
```

常见依赖：`openpyxl`, `anthropic`, `faiss-cpu`（如用到向量匹配）

## 注意事项

- `python/main.py` 路径通过 `config.ts` 动态查找 PROJECT_ROOT，迁移后确保三者目录结构不变（或通过 `CCB_PROJECT_ROOT` 环境变量指定根路径）
- API 凭证有效期有限，迁移后检查是否过期
- 目标 agent 需支持 stdio 模式的 MCP Server