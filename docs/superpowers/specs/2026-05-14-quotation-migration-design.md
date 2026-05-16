# MCP Quotation Server Migration Design

**Date:** 2026-05-14
**Author:** Claude Code
**Status:** Approved

## Context

The `claude-code-best` project attempted to reimplement the quotation capability from `agent-jk` in TypeScript, but the result was poor quality. The `agent-jk` codebase contains battle-tested Python business logic that should be preserved and reused rather than rewritten.

## Goal

Migrate the Python quotation logic from `agent-jk` into `ccb` (claude-code-best), expose it via MCP stdio protocol, and ensure Claude Code can call it natively.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ccb (TypeScript/Bun)                    │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────┐  │
│  │ MCP Server (stdio)│  │ Python Spawner   │  │ Tools    │  │
│  │ match_quotation   │──▶│ subprocess spawn │──▶│ 路由逻辑 │  │
│  │ parse_excel_smart │  │ JSON stdin/out   │  │ LLM 选择 │  │
│  └──────────────────┘  └─────────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ spawn
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    python/main.py                           │
│  Reads JSON from stdin, calls business logic, writes JSON    │
│  to stdout.                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ imports
┌─────────────────────────────────────────────────────────────┐
│  quotation/  inventory/  oos/  core/                         │
│  ← Migrated from agent-jk/backend/tools/                     │
└─────────────────────────────────────────────────────────────┘
```

## Why Subprocess + JSON stdin/stdout

1. **Preserves original logic** — Python code migrated directly, no refactoring required
2. **MCP native** — MCP stdio protocol uses stdin/stdout, subprocess pattern matches perfectly
3. **Zero external dependencies** — No HTTP server needed, no network layer
4. **Isolated process** — Python crash doesn't affect ccb, ccb exit cleans up subprocess

## Migration Scope

### Source: `agent-jk/backend/tools/`

| Source Directory | Target Path | Content |
|-----------------|-------------|---------|
| `quotation/` | `python/quotation/` | Quote tools, flow orchestrator, shortage report |
| `inventory/services/wanding_fuzzy_matcher.py` | `python/inventory/services/wanding_fuzzy_matcher.py` | Core fuzzy matching (token + synonyms + spec equiv) |
| `inventory/services/mapping_table_matcher.py` | `python/inventory/services/mapping_table_matcher.py` | History mapping search |
| `inventory/services/llm_selector.py` | `python/inventory/services/llm_selector.py` | LLM candidate selection |
| `inventory/services/match_and_inventory.py` | `python/inventory/services/match_and_inventory.py` | Main orchestrator (merge + inventory lookup) |
| `inventory/services/inventory_agent_tools.py` | `python/inventory/services/inventory_agent_tools.py` | Inventory tools |
| `inventory/services/resolver.py` | `python/inventory/services/resolver.py` | Resolver logic |
| `inventory/agents/table_agent.py` | `python/inventory/agents/table_agent.py` | Inventory table agent |
| `inventory/config.py` | `python/core/config.py` | Configuration |
| `inventory/models.py` | `python/core/models.py` | Data models |
| `oos/` | `python/oos/` | Out-of-stock detector |

### Also Migrate

- `backend/tools/inventory/config.py` → `python/core/config.py`
- `backend/tools/inventory/models.py` → `python/core/models.py`
- `backend/server/api/contracts.py` → `python/core/contracts.py`
- `backend/tools/inventory/services/llm_selector.py` → `python/inventory/services/llm_selector.py`
- Required data files: `data/wanding_price_lib.xlsx`, `data/mapping_table.xlsx`
- Business knowledge files if available

### Exclude

- `backend/tools/admin/repository.py` — Use stub (Neon DB dependency)
- `backend/tools/inventory/lib/api/client.py` — Use stub (HTTP API dependency)
- Agent/auth code (not needed for MCP)
- Database/API client code (use stubs)
- Tests (migrate key tests)
- Server/gateway code (not needed)

## MCP Tools

| Tool | Description | Python Function |
|------|-------------|-----------------|
| `match_quotation` | Single product matching (keywords → code + price) | `match_price_and_get_inventory(keywords, customer_level)` |
| `match_quotation_batch` | Batch matching (≤50 items) | `match_price_and_get_inventory` (loop) |
| `get_inventory_by_code` | Single code inventory query | `table_agent.get_item_by_code(code)` |
| `get_inventory_by_code_batch` | Batch inventory (≤50 codes) | `get_item_by_code` (loop) |
| `fill_quotation_sheet` | Fill quotation Excel | `run_quotation_fill_flow(quotation_path, output_path)` |
| `ask_clarification` | Intent clarification (e.g., PVC category) | `ask_clarification` (stub for Phase 1) |
| `parse_excel_smart` | Parse Excel file | `quote_tools.parse_excel_smart` |

### Key Python Functions (to be migrated)

#### `match_price_and_get_inventory`
```python
def match_price_and_get_inventory(
    keywords: str,
    customer_level: str = "B",
    price_library_path: Optional[str] = None,
    allow_suggestions_for_work: bool = False,
    product_type: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """
    Returns: {code, matched_name, unit_price, available_qty, warehouse_qty, match_source}
    """
```

#### `run_quotation_fill_flow`
```python
def run_quotation_fill_flow(
    quotation_path: str,
    price_library_path: Optional[str | Path] = None,
    output_path: Optional[str] = None,
    sheet_name: Optional[str] = None,
    customer_level: str = "B",
) -> dict[str, Any]:
    """
    Returns: {success, filled_path, filled_count, shortage_report, summary, ...}
    """
```

## Python Entry Point

```python
# python/main.py
import sys
import json

def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            request = json.loads(line.strip())
            tool = request.get("tool")
            params = request.get("params", {})
            result = dispatch(tool, params)
            print(json.dumps({"success": True, "result": result}))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))

def dispatch(tool: str, params: dict):
    if tool == "match_quotation":
        from inventory.services.match_and_inventory import match_price_and_get_inventory
        return match_price_and_get_inventory(
            params["keywords"],
            customer_level=params.get("customer_level", "B"),
        )
    elif tool == "fill_quotation_sheet":
        from quotation.flow_orchestrator import run_quotation_fill_flow
        return run_quotation_fill_flow(
            params["file_path"],
            output_path=params.get("output_path"),
        )
    # ... other tools
    else:
        raise ValueError(f"Unknown tool: {tool}")

if __name__ == "__main__":
    main()
```

## TypeScript Spawner

```typescript
# mcp_servers/quotation-server/src/python-spawner.ts
import { spawn } from "child_process";
import { config } from "../config";

export async function callPythonTool(
  tool: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn("python3", ["python/main.py"], {
      cwd: config.projectRoot,
    });

    let output = "";
    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", () => {
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch {
        resolve({ success: false, error: "Failed to parse Python output" });
      }
    });

    proc.stdin.write(JSON.stringify({ tool, params }));
    proc.stdin.end();
  });
}
```

## File Structure

```
ccb/
├── mcp_servers/
│   └── quotation-server/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts           ← MCP stdio entry
│           ├── types.ts           ← Shared types
│           ├── config.ts           ← Paths, env vars
│           ├── python-spawner.ts  ← Subprocess wrapper
│           └── tools/
│               ├── match_quotation.ts
│               ├── parse_excel.ts
│               └── fill_quotation.ts
├── python/
│   ├── main.py                   ← Entry (stdin/stdout)
│   ├── requirements.txt          ← Dependencies
│   ├── quotation/              ← From agent-jk
│   │   ├── __init__.py
│   │   ├── quote_tools.py
│   │   ├── flow_orchestrator.py
│   │   ├── shortage_report.py
│   │   ├── canonical_lines.py
│   │   └── ...
│   ├── inventory/               ← From agent-jk
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── models.py
│   │   ├── services/
│   │   │   ├── match_and_inventory.py
│   │   │   ├── price_library_matcher.py
│   │   │   └── resolver.py
│   │   └── ...
│   ├── oos/                     ← From agent-jk
│   │   ├── __init__.py
│   │   ├── services/
│   │   └── ...
│   └── core/                    ← Shared
│       ├── __init__.py
│       ├── config.py
│       └── models.py
└── data/
    ├── wanding_price_lib.xlsx    ← From agent-jk
    └── mapping_table.xlsx        ← From agent-jk
```

## Data Files

| File | Source | Target |
|------|--------|--------|
| `wanding_price_lib.xlsx` | `agent-jk/data/` | `ccb/data/` |
| `mapping_table.xlsx` | `agent-jk/data/` | `ccb/data/` |
| `万鼎价格库_管材与国标管件_标准格式.xlsx` | `agent-jk/data/` | `ccb/data/` |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PYTHON_EXECUTABLE` | Python command | `python3` |
| `OPENAI_API_KEY` | For vector matching | Required |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | `text-embedding-3-large` |
| `ENABLE_WANDING_VECTOR` | Enable vector matching | `true` |

## Error Handling

1. **Python not found** — Error message pointing to installation guide
2. **Import error** — Show missing package, suggest `pip install -r requirements.txt`
3. **Python crash** — Return error to Claude Code, log to console
4. **Timeout** — 30s timeout per tool call, return timeout error
5. **Missing data files** — Error with file path, suggest migration
6. **Neon DB not available** — Stub `repository.py` returns empty list, logging warning
7. **API client error** — Stub returns error response with message
8. **LLM selector failure** — Fallback to first candidate (source priority: 共同 > 历史报价 > 字段匹配)

## Dependencies

### Python Packages (`requirements.txt`)
```
openpyxl>=3.1.0       # Excel reading/writing
pandas>=2.0.0          # Data processing
numpy>=1.24.0         # Vector operations
openai>=1.0.0         # LLM API calls
```

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PYTHON_EXECUTABLE` | Python command | `python3` |
| `OPENAI_API_KEY` | For LLM selection + vector matching | Required |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | `text-embedding-3-large` |
| `ENABLE_WANDING_VECTOR` | Enable vector matching | `true` |
| `DATA_DIR` | Data files directory | `./data` |
| `WANDING_PRICE_LIB_PATH` | Price library path | `data/wanding_price_lib.xlsx` |
| `MAPPING_TABLE_PATH` | Mapping table path | `data/mapping_table.xlsx` |

### Stub Implementations
For Phase 1, stub the following to avoid complex dependencies:
- `repository.py` — Return empty library list
- API client — Return error response

## Implementation Phases

### Phase 1: Project Setup (核心)
- [ ] Create `python/` directory structure
- [ ] Create `python/core/`, `python/inventory/`, `python/inventory/services/`, `python/inventory/agents/`, `python/quotation/`, `python/oos/`
- [ ] Create `requirements.txt`
- [ ] Copy data files
- [ ] Create stubs: `repository.py`, `api_client.py`
- [ ] Test Python imports

### Phase 2: Python Entry
- [ ] Write `python/main.py`
- [ ] Implement JSON stdin/stdout protocol
- [ ] Test basic dispatch

### Phase 3: Core Migration (最重要)
- [ ] Migrate `wanding_fuzzy_matcher.py` (万鼎价格库模糊匹配)
- [ ] Migrate `mapping_table_matcher.py` (历史映射表查询)
- [ ] Migrate `llm_selector.py` (LLM 候选选型)
- [ ] Migrate `config.py` (配置)
- [ ] Migrate `models.py` (数据模型)
- [ ] Fix import paths across all files
- [ ] Test `match_price_and_get_inventory`

### Phase 4: Quotation Tools Migration
- [ ] Migrate `quote_tools.py` (Excel 读写、填充)
- [ ] Migrate `flow_orchestrator.py` (整单填充流程)
- [ ] Migrate `shortage_report.py` (缺货报告)
- [ ] Migrate `canonical_lines.py` (规范行处理)
- [ ] Test `run_quotation_fill_flow`

### Phase 5: Inventory & Integration
- [ ] Migrate `inventory_agent_tools.py` (库存工具)
- [ ] Migrate `table_agent.py` (库存表代理)
- [ ] Migrate `resolver.py` (Resolver)
- [ ] Write `python-spawner.ts`
- [ ] Update MCP tools to use spawner

### Phase 6: OOS & Testing
- [ ] Migrate `oos/` (缺货检测，可选 Phase 2)
- [ ] Implement `ask_clarification` stub
- [ ] Test all 7 MCP tools
- [ ] End-to-end flow test
- [ ] Error scenario tests

## Success Criteria

1. All 7 MCP tools return correct results
2. `match_quotation` returns valid candidates with scores
3. `fill_quotation_sheet` writes correct data to Excel
4. Error messages are user-friendly
5. Python subprocess is cleaned up on exit
6. No memory leaks from subprocess pool

## Notes

- Python version: 3.10+
- Keep original file comments and docstrings
- Preserve original logging statements
- Do not refactor business logic, only fix import paths
- Use stubs for Neon DB and API client dependencies

---

## 遗留问题汇总

以下问题需人工确认后处理。

### 按严重级别排序

| 严重级别 | ID | 问题 | 位置 | 建议 |
|----------|-----|------|------|------|
| S1 | ISSUE-001 | `ask_clarification` 功能未在 agent-jk 中找到，需实现 stub | MCP Tools | Phase 2 实现或标记为 TODO |
| S2 | ISSUE-002 | Neon DB 自定义映射表 (`repository.py`) 依赖未处理 | mapping_table_matcher.py | 用 stub 返回空列表 |
| S2 | ISSUE-003 | API client (`lib/api/client.py`) 依赖未处理 | 库存服务 | 用 stub 返回错误响应 |

---

## 文件依赖清单

### 从 agent-jk 迁移的文件

| 文件路径 | 状态 | 说明 |
|----------|------|------|
| `backend/tools/quotation/quote_tools.py` | 待迁移 | Excel 读写、填充逻辑 |
| `backend/tools/quotation/flow_orchestrator.py` | 待迁移 | 整单填充流程编排 |
| `backend/tools/quotation/shortage_report.py` | 待迁移 | 缺货报告生成 |
| `backend/tools/quotation/canonical_lines.py` | 待迁移 | 规范行处理 |
| `backend/tools/inventory/services/wanding_fuzzy_matcher.py` | 待迁移 | 万鼎价格库模糊匹配 |
| `backend/tools/inventory/services/mapping_table_matcher.py` | 待迁移 | 历史映射表查询 |
| `backend/tools/inventory/services/llm_selector.py` | 待迁移 | LLM 候选选型 |
| `backend/tools/inventory/services/match_and_inventory.py` | 待迁移 | 主入口（合并+库存） |
| `backend/tools/inventory/services/inventory_agent_tools.py` | 待迁移 | 库存工具 |
| `backend/tools/inventory/services/resolver.py` | 待迁移 | Resolver 逻辑 |
| `backend/tools/inventory/agents/table_agent.py` | 待迁移 | 库存表代理 |
| `backend/tools/inventory/config.py` | 待迁移 | 配置 |
| `backend/tools/inventory/models.py` | 待迁移 | 数据模型 |
| `backend/tools/oos/` | 待迁移 | 缺货检测（可选 Phase 2） |

### 新建文件

| 文件路径 | 说明 |
|----------|------|
| `python/main.py` | Python 入口（stdin/stdout） |
| `python/requirements.txt` | 依赖 |
| `python/core/config.py` | 配置（从 agent-jk 迁移） |
| `python/core/models.py` | 模型（从 agent-jk 迁移） |
| `python/core/repository.py` | Stub 实现 |
| `python/core/api_client.py` | Stub 实现 |
| `mcp_servers/quotation-server/src/python-spawner.ts` | TypeScript 子进程封装 |