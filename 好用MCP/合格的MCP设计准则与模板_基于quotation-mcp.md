# 合格 MCP 设计准则与开发模板

> 基于当前 `quotation-server` / `quotation MCP` 的实战经验整理。本文不是单纯记录一个报价工具，而是作为以后开发本地 MCP 的标准：什么逻辑该放进工具，什么判断该交给 Claude Code，目录如何组织，错误如何返回，如何测试，如何避免后期维护失控。

---

## 0. 对 quotation MCP 的判断

结论：**quotation MCP 是一个很好的“架构模板”，但不是一个完美的“源码模板”。**

它值得作为标准模板的原因：

1. **职责边界清楚**：MCP 负责把确定性的业务检索、Excel 解析、库存查询封装成工具；最终“选哪个候选”交给 Claude Code，而不是在 MCP 内部再调用一个 LLM。
2. **工具描述写得足够强**：`match_quotation` 的 description 明确告诉 Claude Code：返回的是候选和选择上下文，默认不要把候选列表暴露给用户。
3. **输入 schema 比较规范**：`customer_level` 使用 enum/default，批量工具使用 `maxItems: 50`，这能减少模型乱填参数。
4. **通信方式稳**：Node MCP 入口通过 stdio 连接 Claude Code，再按 JSON-lines 调 Python，stdout 最后一行作为协议结果，stderr 放日志。
5. **错误不直接炸进程**：Node 和 Python 两层都尽量把错误包成 `{ success: false, error }`，对 Claude Code 友好。
6. **路径可迁移**：通过 `CCB_PROJECT_ROOT`、`CLAUDE.md` 标记和 cwd fallback 解析项目根目录，没有把绝对路径写死。
7. **业务知识外置**：`data/wanding_business_knowledge.md` 由 Agent **按需 Read**（`selection_context.knowledge_source`）；**不要**在每次 tool 返回里内联全文。

它不适合原样作为源码模板的原因：

1. **当前仓库里的 `mcp_servers/quotation-server` 只有 `dist`，缺少 `src` 源码**。它能作为运行产物参考，但新项目不能只照着 dist 改。
2. **存在历史残留模块**：例如 `dist/services/llm_selector.js` 和 `dist/tools/match_quotation.js` 仍保留旧的内部 LLM selector 思路。当前主入口 `dist/index.js` 没有走这条链路，但新模板应删除这种残留，避免误用。
3. **Python 业务层较厚**：报价、库存、Excel、询价解析混在同一个项目内，对业务项目合理，但作为通用模板需要拆成“协议层”和“业务层”。
4. **部分 Python 旧模块仍可能直接调用 OpenAI 类接口**：如果是业务解析 fallback 可以接受，但必须在文档中声明；如果是最终选择器，则不符合本标准。

所以推荐定位是：

> quotation MCP 作为“本地业务 MCP 的设计样板”是合格的；作为“直接复制粘贴的干净脚手架”还需要清理源码、删除旧 selector、补齐 README / CLAUDE.md / .mcp.example.json / smoke tests。

---

## 1. 合格 MCP 的五条底线

一个合格的本地业务 MCP 至少满足这五条：

1. **领域单一**：只解决一个明确领域，比如报价匹配、库存查询、Excel 填充、文档检索、合同审查。不要把互不相关的工具塞进同一个 MCP。
2. **逻辑和判断分离**：确定性检索、解析、计算放在 MCP/Python；最终选择、解释、追问交给 Claude Code。
3. **零密钥入库**：真实 token、cookie、数据库 ID、签名密钥全部走环境变量或本机未入库配置。仓库只保留 `.example`。
4. **可调试但不污染协议**：日志走 stderr；stdout 只输出 MCP 协议或最后一行 JSON 结果。
5. **有给 LLM 看的说明**：必须有 `CLAUDE.md`，告诉 Claude Code 什么时候调用工具、怎么理解输出、什么时候追问、什么时候不要暴露中间候选。

---

## 2. 核心设计原则

### 原则 1：MCP 不做最终主观选择

反模式：

- MCP 内部再调用 GPT/Claude/其他模型来选最终结果。
- MCP 返回一个“它认为最好”的结果，却不告诉 Claude Code 候选和判断依据。
- 用户改了 Claude Code 的回答风格，但 MCP 里的内部模型不受影响。

推荐模式：

- Python/MCP 负责找候选、打分、提取字段、整理业务知识。
- 返回 `selection_context`，由 Claude Code 基于上下文做最终选择。
- 明确写出 `selection_owner: "claude_code"`。

示例：

```python
DEFAULT_SELECTION_CANDIDATE_LIMIT = 7
EXPLICIT_SELECTION_CANDIDATE_LIMIT = 15  # show_candidates=true


def build_selection_payload(keywords: str, candidates: list[dict], show_candidates: bool = False) -> dict:
    total = len(candidates)
    limit = EXPLICIT_SELECTION_CANDIDATE_LIMIT if show_candidates else DEFAULT_SELECTION_CANDIDATE_LIMIT
    visible = candidates[:limit]
    return {
        "keywords": keywords,
        "unmatched": not bool(candidates),
        "needs_selection": bool(candidates),
        "candidate_count": total,
        "candidates_returned": len(visible),
        "candidates_truncated": total > len(visible),
        "candidates": visible,
        "show_candidates_requested": bool(show_candidates),
        "selection_owner": "claude_code",
        "selection_context": {
            "mode": "claude_code_auto_select",
            "knowledge_source": str(BUSINESS_KNOWLEDGE_PATH),  # Agent Read on demand — do not inline full text
            "instructions": [
                "Read knowledge_source once per session before multi-candidate selection.",
                "Use candidates plus business knowledge to select one best item.",
                "Do not show candidates unless the user explicitly asked.",
                "If candidates_truncated or user unsatisfied, re-run match_quotation for that keywords with show_candidates=true.",
            ],
        },
    }
```

### 原则 2：工具 description 要像调用手册

Claude Code 是否会正确调用 MCP，很大程度取决于工具 description。

每个工具 description 至少写清：

1. 这个工具解决什么问题。
2. 什么时候应该调用，什么时候不该调用。
3. 默认行为是什么。
4. 输出是给 Claude Code 判断，还是直接给用户展示。
5. 是否允许暴露候选、日志、原始数据。

示例：

```ts
{
  name: "match_quotation",
  description:
    "Match quotation items using local Python business logic. " +
    "Default behavior is Claude Code auto-selection: the tool returns candidates " +
    "plus business knowledge as selection context; Claude Code must choose one result " +
    "and not show candidates unless requested. No internal selector model is called.",
  inputSchema: {
    type: "object",
    properties: {
      keywords: {
        type: "string",
        description: "Product name/specification, e.g. PVC-U pipe DN25."
      },
      customer_level: {
        type: "string",
        enum: ["A", "B", "C", "D", "E"],
        default: "B",
        description: "Customer price level."
      },
      show_candidates: {
        type: "boolean",
        description: "Set true only when the user explicitly asks to see candidates."
      }
    },
    required: ["keywords"]
  }
}
```

### 原则 3：批量工具必须有上限

所有数组入参都必须限制：

- schema 层：`maxItems`
- 业务层：再次切片兜底
- 文档层：说明超过上限要分批

示例：

```ts
keywords_list: {
  type: "array",
  items: { type: "string" },
  maxItems: 50
}
```

```python
for keyword in (params.get("keywords_list") or [])[:50]:
    ...
```

经验值：

- 快速查询：50 条以内。
- 涉及 Excel 或复杂计算：10-30 条。
- 涉及网络 API：按接口限流决定，宁可小批量多次调用。

### 原则 4：本地 MCP 优先 stdio，不轻易开 HTTP 服务

本地工具推荐：

- `StdioServerTransport`
- Claude Code 拉起即用
- 不占端口
- 不需要用户管理服务生命周期

只有在以下情况才考虑 HTTP/SSE：

- 多客户端共享一个长期服务。
- 工具有大型缓存或常驻连接，频繁启动成本太高。
- 需要浏览器或外部系统主动回调。

### 原则 5：Node 只做协议层，Python 做业务层

推荐职责：

- Node/TypeScript：MCP 协议、工具 schema、参数规范化、spawn Python、错误包装。
- Python：Excel、数据库、检索、算法、业务规则、文件处理。

这样做的好处：

- MCP 协议层薄，容易稳定。
- Python 业务逻辑可以单独 smoke test。
- 后续换 Claude Code、换 MCP 客户端时，业务逻辑不用重写。

### 原则 6：错误是响应，不是崩溃

错误返回必须对 Claude Code 可读：

```json
{
  "success": false,
  "error": "File not found: D:\\example.xlsx"
}
```

不要让用户只看到：

- connection closed
- process exited
- JSON parse error
- traceback 刷满屏

Node 层要捕获：

- Python 启动失败
- Python 超时
- stdout 无 JSON
- JSON 解析失败
- Python 非 0 退出

Python 层要捕获：

- 参数缺失
- 文件不存在
- Excel 解析失败
- API 鉴权失败
- 业务模块异常

### 原则 7：路径解析必须可迁移

路径解析优先级：

1. 环境变量，例如 `CCB_PROJECT_ROOT`
2. 向上查找项目标记文件，例如 `CLAUDE.md`
3. 当前工作目录

示例：

```ts
function findProjectRoot() {
  const marker = "CLAUDE.md";
  let dir = process.cwd();
  while (dir !== resolve(dir, "..")) {
    if (existsSync(resolve(dir, marker))) return dir;
    dir = resolve(dir, "..");
  }
  return process.cwd();
}
```

不要在代码里写死：

```ts
const root = "D:\\Projects\\some-user\\some-mcp";
```

### 原则 8：密钥和本机配置不入库

允许入库：

- `.env.example`
- `.mcp.example.json`
- README 里的配置示例

禁止入库：

- `.env`
- `.env.accurate`
- 真实 token
- 真实 cookie
- 私有数据库 ID
- 私有 API base url，除非它本来就是公开服务

`.gitignore` 必须包含：

```gitignore
.env
.env.*
!.env.example
!.env.*.example
```

### 原则 9：CLAUDE.md 是工具行为契约

`README.md` 给人看，`CLAUDE.md` 给 Claude Code 看。

`CLAUDE.md` 必须写：

- 什么时候调用哪些工具。
- 工具输出如何解释。
- 是否自动选择。
- 是否展示候选。
- 什么时候追问用户。
- 哪些行为禁止做。

示例：

```markdown
# Claude Code behavior for quotation MCP

When using `match_quotation` or `match_quotation_batch`:

- Treat tool output as selection context, not as final user-facing text.
- Read `selection_context.knowledge_source` plus `candidates` to select one best item.
- Do not show the full candidate list unless the user explicitly asks.
- If all candidates conflict with the user's keywords, report unmatched.
- If candidates remain indistinguishable, ask one focused clarification question.
- Do not call an additional selector model from Python/MCP.
```

### 原则 10：保留 smoke test，不依赖 Claude Code 才能测

每个 MCP 至少有一个最小 smoke 输入：

```json
{"tool":"match_quotation","params":{"keywords":"PVC-U pipe DN25"}}
```

可以直接跑：

```bash
python python/main.py < smoke-match-quotation.json
```

目标是不用打开 Claude Code，也能确认 Python 业务逻辑没有坏。

---

## 3. 推荐项目结构

```text
my-mcp/
├─ .gitignore
├─ .mcp.example.json
├─ CLAUDE.md
├─ README.md
├─ package.json
├─ tsconfig.json
├─ smoke-match.json
├─ src/
│  ├─ index.ts
│  ├─ config.ts
│  ├─ python-spawner.ts
│  ├─ tools/
│  │  └─ match.ts
│  └─ services/
├─ python/
│  ├─ main.py
│  ├─ requirements.txt
│  └─ domain/
│     ├─ __init__.py
│     └─ service.py
├─ data/
│  ├─ business_knowledge.md
│  └─ sample.xlsx
└─ dist/
```

说明：

- `src/` 是 MCP 协议层源码。
- `python/` 是业务逻辑。
- `data/` 放可公开的样例数据和业务知识；真实敏感数据不要入库。
- `dist/` 是构建产物，不应作为唯一源码。

---

## 4. 最小 TypeScript 模板

### 4.1 package.json

```json
{
  "name": "my-mcp",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "description": "Local MCP server for one business domain.",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "smoke": "python python/main.py < smoke-match.json"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 4.2 src/config.ts

```ts
import { existsSync } from "fs";
import { resolve } from "path";

function findProjectRoot() {
  const marker = "CLAUDE.md";
  let dir = process.cwd();
  while (dir !== resolve(dir, "..")) {
    if (existsSync(resolve(dir, marker))) return dir;
    dir = resolve(dir, "..");
  }
  return process.cwd();
}

const PROJECT_ROOT = process.env.CCB_PROJECT_ROOT
  ? resolve(process.env.CCB_PROJECT_ROOT)
  : findProjectRoot();

const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(PROJECT_ROOT, "data");

export const config = {
  projectRoot: PROJECT_ROOT,
  pythonEntry: resolve(PROJECT_ROOT, "python", "main.py"),
  dataDir: DATA_DIR,
  businessKnowledge: resolve(DATA_DIR, "business_knowledge.md"),
  pythonTimeoutMs: Number(process.env.MY_MCP_PYTHON_TIMEOUT_MS ?? 90000),
  maxBatchSize: 50
};
```

### 4.3 src/python-spawner.ts

```ts
import { spawn } from "child_process";
import { config } from "./config.js";

type PythonResult = {
  success: boolean;
  result?: unknown;
  error?: string;
};

function parseLastJsonLine(stdout: string): PythonResult {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const last = lines.at(-1);
  if (!last) return { success: false, error: "Python produced no JSON output" };
  return JSON.parse(last);
}

export async function callPythonTool(tool: string, params: unknown): Promise<PythonResult> {
  return new Promise((resolveResult) => {
    const pythonCmd = process.env.PYTHON_EXECUTABLE
      ?? (process.platform === "win32" ? "python" : "python3");

    const proc = spawn(pythonCmd, [config.pythonEntry], {
      cwd: config.projectRoot,
      env: {
        ...process.env,
        PYTHONIOENCODING: process.env.PYTHONIOENCODING ?? "utf-8",
        PYTHONUTF8: process.env.PYTHONUTF8 ?? "1",
        DATA_DIR: process.env.DATA_DIR ?? config.dataDir,
        BUSINESS_KNOWLEDGE_PATH: process.env.BUSINESS_KNOWLEDGE_PATH ?? config.businessKnowledge
      },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result: PythonResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult(result);
    };

    const timer = setTimeout(() => {
      proc.kill();
      finish({ success: false, error: `Python call timed out after ${config.pythonTimeoutMs}ms` });
    }, config.pythonTimeoutMs);

    proc.stdout.on("data", (data) => stdout += data.toString());
    proc.stderr.on("data", (data) => stderr += data.toString());

    proc.on("error", (err) => {
      finish({
        success: false,
        error: `Failed to spawn Python: ${err.message}. Set PYTHON_EXECUTABLE if Python is not on PATH.`
      });
    });

    proc.on("close", (code) => {
      if (settled) return;
      try {
        const parsed = parseLastJsonLine(stdout);
        if (!parsed.success && stderr) {
          parsed.error = `${parsed.error ?? "Python tool failed"}\n${stderr.trim()}`;
        }
        finish(parsed);
      } catch (err) {
        finish({
          success: false,
          error: `Failed to parse Python output (exit ${code ?? "unknown"}): ${String(err)}\nstdout=${stdout}\nstderr=${stderr}`
        });
      }
    });

    proc.stdin.write(`${JSON.stringify({ tool, params })}\n`);
    proc.stdin.end();
  });
}
```

### 4.4 src/index.ts

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { callPythonTool } from "./python-spawner.js";

const server = new Server(
  { name: "my-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [
    {
      name: "match_item",
      description:
        "Match items using local Python business logic. The tool returns candidates plus selection context; Claude Code owns final selection and should not show candidates unless explicitly requested.",
      inputSchema: {
        type: "object",
        properties: {
          keywords: { type: "string", description: "User's item name/specification." },
          show_candidates: {
            type: "boolean",
            description: "Set true only when the user explicitly asks to see candidates."
          }
        },
        required: ["keywords"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  try {
    const result = await callPythonTool(name, rawArgs ?? {});
    if (!result.success) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: result.error }, null, 2) }],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result.result, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: String(error) }, null, 2) }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error(error);
  process.exit(1);
});
```

---

## 5. 最小 Python 模板

```python
#!/usr/bin/env python3
"""JSON-lines entry point used by my MCP server."""
from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s", stream=sys.stderr)
logger = logging.getLogger(__name__)


def load_business_knowledge() -> str:
    configured = os.getenv("BUSINESS_KNOWLEDGE_PATH", "").strip()
    path = Path(configured) if configured else PROJECT_ROOT / "data" / "business_knowledge.md"
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        logger.exception("Failed to load business knowledge: %s", path)
        return ""


def build_selection_payload(keywords: str, candidates: list[dict[str, Any]], show_candidates: bool = False) -> dict[str, Any]:
    total = len(candidates)
    limit = 15 if show_candidates else 7
    visible = candidates[:limit]
    return {
        "keywords": keywords,
        "unmatched": not bool(candidates),
        "needs_selection": bool(candidates),
        "candidate_count": total,
        "candidates_returned": len(visible),
        "candidates_truncated": total > len(visible),
        "candidates": visible,
        "show_candidates_requested": bool(show_candidates),
        "selection_owner": "claude_code",
        "selection_context": {
            "mode": "claude_code_auto_select",
            "knowledge_source": str(path),
            "instructions": [
                "Read knowledge_source on demand; do not expect inline business_knowledge in tool JSON.",
                "Use candidates plus business knowledge to select one best item.",
                "Do not show candidates unless the user explicitly asked.",
                "If candidates_truncated, re-run single match with show_candidates=true.",
            ],
        },
    }


def dispatch(tool: str, params: dict[str, Any]) -> Any:
    if tool == "match_item":
        keywords = str(params["keywords"])
        candidates = [
            {"id": "demo-1", "name": keywords, "score": 0.9}
        ]
        return build_selection_payload(
            keywords,
            candidates,
            show_candidates=bool(params.get("show_candidates", False)),
        )

    raise ValueError(f"Unknown tool: {tool}")


def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    tool = str(request.get("tool", ""))
    params = request.get("params", {}) or {}
    logger.info("Dispatching: %s", tool)
    return {"success": True, "result": dispatch(tool, params)}


def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            response = handle_request(json.loads(line.lstrip("\ufeff")))
        except Exception as exc:
            logger.exception("Tool dispatch failed")
            response = {"success": False, "error": str(exc)}
        print(json.dumps(response, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
```

---

## 6. .mcp.example.json 模板

```json
{
  "mcpServers": {
    "my-mcp": {
      "command": "bun",
      "args": ["--cwd", "<absolute path>/my-mcp", "run", "start"],
      "env": {
        "CCB_PROJECT_ROOT": "<absolute path>/my-mcp",
        "PYTHON_EXECUTABLE": "",
        "BUSINESS_KNOWLEDGE_PATH": "<absolute path>/my-mcp/data/business_knowledge.md",
        "API_TOKEN": ""
      }
    }
  }
}
```

规则：

- `.mcp.example.json` 可以入库。
- 真实 `.mcp.json` 不入库。
- 路径必须是绝对路径，避免 Claude Code 从不同 cwd 启动时找不到文件。

---

## 7. README.md 应该写什么

README 面向开发者和部署者，至少包含：

```markdown
# My MCP

Local MCP server for <domain>.

## Tools

- `match_item`: match one item.
- `match_item_batch`: match up to 50 items.

## Behavior

- Python retrieves candidates.
- MCP does not call an internal selector model.
- Claude Code receives candidates plus business knowledge and performs final selection.
- Candidate lists are not shown unless the user explicitly asks.

## Install

```bash
bun install
bun run build
python -m pip install -r python/requirements.txt
```

## Smoke test

```bash
python python/main.py < smoke-match.json
```

## Claude Code config

Copy `.mcp.example.json`, fill absolute paths and local secrets, then register it in Claude Code.
```

---

## 8. 上线前检查清单

协议层：

- [ ] 使用 `StdioServerTransport`，除非有明确理由使用 HTTP/SSE。
- [ ] 所有工具都有清晰 description。
- [ ] 所有工具都有完整 `inputSchema`。
- [ ] 数组参数有 `maxItems`。
- [ ] `CallTool` 不把异常直接抛给 MCP 客户端。
- [ ] 工具返回 JSON 字符串，结构稳定。

Python 层：

- [ ] stdin 每次读一行 JSON。
- [ ] stdout 最后一行是 JSON 响应。
- [ ] 日志只走 stderr。
- [ ] 设置 UTF-8 输出。
- [ ] 单次失败返回 `{ success: false, error }`。
- [ ] 批量工具有业务层兜底上限。
- [ ] 文件路径不存在时返回清晰错误。

路径和配置：

- [ ] `CCB_PROJECT_ROOT` 优先。
- [ ] 不写死开发者机器路径。
- [ ] `.env`、真实 `.mcp.json`、token 不入库。
- [ ] `.mcp.example.json` 可复制即用。

LLM 行为：

- [ ] MCP 不调用内部 LLM 做最终选择。
- [ ] `selection_context` 含 `knowledge_source` 路径 + 指令；候选默认封顶（如 7）；**不**内联整份业务知识库。
- [ ] 明确 `selection_owner: "claude_code"`。
- [ ] 默认不展示候选列表。
- [ ] 模糊时要求 Claude Code 问一个聚焦问题。

文档和测试：

- [ ] 有 README.md。
- [ ] 有 CLAUDE.md。
- [ ] 有 smoke JSON。
- [ ] 不打开 Claude Code 也能单测 Python 入口。
- [ ] 有至少一个真实样例或脱敏样例。

安全：

- [ ] 不使用 shell 字符串拼接执行用户输入。
- [ ] spawn 使用数组参数。
- [ ] 限制文件读写范围，避免 `../../` 越界。
- [ ] 网络 API token 走环境变量。
- [ ] 错误信息不泄露密钥。

---

## 9. 反模式清单

| 反模式 | 问题 | 正确做法 |
| --- | --- | --- |
| MCP 内部再调用 LLM 做最终选择 | 成本高、不可控、难复现 | MCP 给候选和上下文，Claude Code 选择 |
| description 只写“查询库存” | Claude Code 不知道何时调用、怎么处理结果 | 写清用途、默认行为、输出归属 |
| 批量工具无限制 | 容易卡死、OOM、API 超限 | schema `maxItems` + 业务层切片 |
| Python 用 stdout 打日志 | 污染协议，导致 JSON parse 失败 | 日志走 stderr |
| 错误直接崩进程 | 用户只看到连接断开 | 包成 `{ success:false,error }` |
| 代码写死绝对路径 | 换机器即坏 | env + marker fallback |
| `.env` 入库 | 泄露密钥 | 只入库 `.env.example` |
| 默认展示候选列表 | 用户看到大量噪音 | 默认隐藏，用户要求才展示 |
| 只有 dist 没有 src | 难维护、难审查 | 新项目必须保留 src |
| 保留旧 selector 残留 | 后续可能误调用 | 删除或明确标注 deprecated |

---

## 10. quotation MCP 作为模板时应该保留和改进什么

应该保留：

- `dist/index.js` 里的工具注册思路。
- `customer_level` enum/default。
- `show_candidates` 显式开关。
- `match_quotation_batch` 的 `maxItems: 50`。
- `python-spawner` 的 timeout、stderr、last JSON line 解析。
- `python/main.py` 的 dispatch 入口。
- `selection_context` 和 `selection_owner: "claude_code"`。
- `data/wanding_business_knowledge.md` 这种业务知识外置方式。

应该改进：

- 补齐 `src/` 源码，而不是只保留 `dist/`。
- 删除或隔离旧的 `llm_selector`。
- 删除未被主入口调用的旧工具实现，或放进 `legacy/`。
- 增加 `.mcp.example.json`。
- 增加 `CLAUDE.md`。
- 增加 smoke test。
- 把 quotation 专属命名替换成通用模板变量。
- 把业务 Python 包和 MCP 协议层边界写进 README。

最终建议：

> 以后你开发 MCP，可以用 quotation MCP 的“设计路线”做标准：本地确定性工具 + 清晰 schema + selection_context + Claude Code 最终判断。但新项目不要直接复制它的 dist 目录，要用本文的干净脚手架重新起项目，再把业务逻辑迁进去。

---

## 11. 从 0 到 1 的执行路径

1. 定义领域：只写一句话说明这个 MCP 解决什么问题。
2. 定义工具：列出 1-5 个工具，避免一开始就做十几个。
3. 写 schema：每个参数有类型、说明、required、enum/default/maxItems。
4. 写 Python dispatch：先让每个工具返回稳定 JSON。
5. 写 selection_context：只要涉及“候选里选一个”，就让 Claude Code 选。
6. 写 CLAUDE.md：约束 Claude Code 如何用工具。
7. 写 smoke test：不用 Claude Code 就能跑通业务入口。
8. 写 .mcp.example.json：路径和密钥占位。
9. 接入 Claude Code 实测。
10. 删除残留、补文档、再发布。

---

## 12. 什么时候本标准不适用

以下场景需要调整：

- **纯远程 API 包装器**：如果 MCP 只是转发一个成熟 SaaS API，业务逻辑可能主要在远端。
- **数据库网关**：候选量可能是百万级，不能把大量候选塞给 Claude Code，只能返回 top N、摘要或分页游标。
- **强事务系统**：如下单、付款、审批，需要审计日志、幂等键、权限校验，不能只靠无状态 spawn。
- **长任务系统**：如果单次执行超过数分钟，应设计任务 ID、进度查询、取消机制。
- **实时交互系统**：例如浏览器控制、桌面控制、语音流，可能需要常驻进程或 HTTP/WebSocket。

但即使在这些场景下，以下原则仍然成立：

- description 必须清楚。
- schema 必须严格。
- 错误必须结构化。
- 密钥不能入库。
- Claude Code 行为要写进 CLAUDE.md。

