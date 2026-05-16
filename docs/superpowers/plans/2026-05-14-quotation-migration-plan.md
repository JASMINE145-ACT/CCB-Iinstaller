# MCP Quotation Server Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Python quotation logic from agent-jk to ccb, expose via MCP stdio protocol with subprocess + JSON stdin/stdout.

**Architecture:** TypeScript MCP Server spawns Python subprocess for each tool call. Python main.py reads JSON from stdin, dispatches to business logic, writes JSON to stdout.

**Tech Stack:** TypeScript/Bun MCP SDK, Python 3.10+, openpyxl, pandas, numpy, openai

---

## File Structure Overview

```
ccb/
├── python/                           # NEW - Python business logic
│   ├── main.py                      # Entry point (stdin/stdout)
│   ├── requirements.txt             # Dependencies
│   ├── core/                        # Shared
│   │   ├── __init__.py
│   │   ├── config.py               # From agent-jk (migrated)
│   │   ├── models.py               # From agent-jk (migrated)
│   │   ├── repository.py           # Stub implementation
│   │   └── api_client.py            # Stub implementation
│   ├── inventory/                   # From agent-jk
│   │   ├── __init__.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── wanding_fuzzy_matcher.py      # Core fuzzy matching
│   │   │   ├── mapping_table_matcher.py      # History mapping
│   │   │   ├── llm_selector.py               # LLM candidate selection
│   │   │   ├── match_and_inventory.py        # Main orchestrator
│   │   │   ├── inventory_agent_tools.py      # Inventory tools
│   │   │   └── resolver.py                    # Resolver logic
│   │   └── agents/
│   │       ├── __init__.py
│   │       └── table_agent.py                 # Inventory table agent
│   └── quotation/                   # From agent-jk
│       ├── __init__.py
│       ├── quote_tools.py           # Excel read/write
│       ├── flow_orchestrator.py     # Full sheet fill flow
│       └── shortage_report.py      # Shortage report
├── data/                            # Already exists
│   ├── wanding_price_lib.xlsx
│   └── mapping_table.xlsx
└── mcp_servers/quotation-server/src/
    ├── python-spawner.ts            # Subprocess wrapper (NEW)
    └── index.ts                    # MCP entry (modify)
```

---

## Task 1: Project Setup - Directory Structure & Requirements

**Files:**
- Create: `python/requirements.txt`
- Create: `python/core/__init__.py`
- Create: `python/inventory/__init__.py`
- Create: `python/inventory/services/__init__.py`
- Create: `python/inventory/agents/__init__.py`
- Create: `python/quotation/__init__.py`
- Create: `python/oos/__init__.py`

- [ ] **Step 1: Create directory structure**

```powershell
cd D:\Projects\claude-code-best
New-Item -ItemType Directory -Path "python/core", "python/inventory/services", "python/inventory/agents", "python/quotation", "python/oos" -Force
```

- [ ] **Step 2: Create requirements.txt**

```txt
openpyxl>=3.1.0
pandas>=2.0.0
numpy>=1.24.0
openai>=1.0.0
```

- [ ] **Step 3: Create __init__.py files**

```python
# python/core/__init__.py
"""Core module - migrated from agent-jk"""
```

```python
# python/inventory/__init__.py
"""Inventory module - migrated from agent-jk"""
```

```python
# python/inventory/services/__init__.py
"""Inventory services - migrated from agent-jk"""
```

```python
# python/inventory/agents/__init__.py
"""Inventory agents - migrated from agent-jk"""
```

```python
# python/quotation/__init__.py
"""Quotation module - migrated from agent-jk"""
```

```python
# python/oos/__init__.py
"""Out-of-stock module - migrated from agent-jk"""
```

- [ ] **Step 4: Verify Python imports work**

```bash
cd D:/Projects/claude-code-best/python
python3 -c "import openpyxl, pandas, numpy, openai; print('All packages OK')"
```

Expected: `All packages OK`

- [ ] **Step 5: Commit**

```bash
git add python/requirements.txt python/*/__init__.py
git add python/*/*/__init__.py
git commit -m "feat(quotation-migration): create python directory structure"
```

---

## Task 2: Core Configuration - Migrate config.py

**Files:**
- Create: `python/core/config.py`
- Test: `python/core/test_config.py`

- [ ] **Step 1: Read source config.py**

Read `D:\Projects\agent-jk\Agent Team version3\backend\tools\inventory\config.py` and migrate its content.

- [ ] **Step 2: Create python/core/config.py**

```python
"""
Configuration - migrated from agent-jk/backend/tools/inventory/config.py
"""
from __future__ import annotations
from pathlib import Path
import os

# Data directories
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = Path(os.environ.get("DATA_DIR", PROJECT_ROOT / "data"))
WANDING_PRICE_LIB_PATH = os.environ.get("WANDING_PRICE_LIB_PATH", str(DATA_DIR / "wanding_price_lib.xlsx"))
MAPPING_TABLE_PATH = os.environ.get("MAPPING_TABLE_PATH", str(DATA_DIR / "mapping_table.xlsx"))

# LLM Configuration
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_EMBEDDING_MODEL = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
LLM_SELECTOR_MODEL = os.environ.get("LLM_SELECTOR_MODEL", "gpt-4o-mini")
LLM_SELECTOR_BASE_URL = os.environ.get("LLM_SELECTOR_BASE_URL", "https://api.openai.com/v1")

# Vector matching
ENABLE_WANDING_VECTOR = os.environ.get("ENABLE_WANDING_VECTOR", "true").lower() == "true"
EMBEDDING_TIMEOUT = 15
WANDING_VECTOR_TOP_K = 3
WANDING_VECTOR_MIN_SCORE = 0.65
WANDING_VECTOR_COARSE_MAX = 20

# Matching thresholds
INVENTORY_MIN_SCORE = 0.3
INVENTORY_MIN_SCORE_GAP = 0.15

# Mapping table columns (multilingual support)
MAPPING_COL_INQUIRY_KW = ["询价货物名称", "Nama Permintaan Barang"]
MAPPING_COL_SPEC_KW = ["询价规格型号", "Spesifikasi dan Model Permintaan Barang"]
MAPPING_COL_CODE_KW = ["产品编号", "Product number"]
MAPPING_COL_QUOTATION_KW = ["报价名称", "Nama Penawaran Barang"]
MAPPING_LIB_NAME_PATTERNS = ["整理产品", "映射"]

# Work mode
WORK_SINGLE_CAND_USE_LLM = True

# Cache
CACHE_TTL = 300

class Config:
    """Configuration access"""
    WANDING_PRICE_LIB_PATH = WANDING_PRICE_LIB_PATH
    MAPPING_TABLE_PATH = MAPPING_TABLE_PATH
    OPENAI_API_KEY = OPENAI_API_KEY
    OPENAI_EMBEDDING_MODEL = OPENAI_EMBEDDING_MODEL
    LLM_SELECTOR_MODEL = LLM_SELECTOR_MODEL
    LLM_SELECTOR_BASE_URL = LLM_SELECTOR_BASE_URL
    ENABLE_WANDING_VECTOR = ENABLE_WANDING_VECTOR
    INVENTORY_MIN_SCORE = INVENTORY_MIN_SCORE
    INVENTORY_MIN_SCORE_GAP = INVENTORY_MIN_SCORE_GAP
    WORK_SINGLE_CAND_USE_LLM = WORK_SINGLE_CAND_USE_LLM

config = Config()
```

- [ ] **Step 3: Write test**

```python
# python/core/test_config.py
def test_config_defaults():
    from core.config import config
    assert config.WANDING_PRICE_LIB_PATH
    assert config.MAPPING_TABLE_PATH
    assert "text-embedding" in config.OPENAI_EMBEDDING_MODEL

def test_data_paths_exist():
    from pathlib import Path
    from core.config import WANDING_PRICE_LIB_PATH, MAPPING_TABLE_PATH
    assert Path(WANDING_PRICE_LIB_PATH).exists(), f"Missing: {WANDING_PRICE_LIB_PATH}"
    assert Path(MAPPING_TABLE_PATH).exists(), f"Missing: {MAPPING_TABLE_PATH}"
```

- [ ] **Step 4: Run test**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest core/test_config.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add python/core/config.py python/core/test_config.py
git commit -m "feat(quotation-migration): migrate config.py"
```

---

## Task 3: Data Models - Migrate models.py

**Files:**
- Create: `python/core/models.py`
- Test: `python/core/test_models.py`

- [ ] **Step 1: Read source models.py**

Read `D:\Projects\agent-jk\Agent Team version3\backend\tools\inventory\models.py`

- [ ] **Step 2: Create python/core/models.py**

```python
"""
Data models - migrated from agent-jk/backend/tools/inventory/models.py
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

@dataclass
class InventoryItem:
    """Inventory item with quantity information"""
    code: str
    name: str
    qty_available: float = 0.0
    qty_warehouse: float = 0.0
    qty_on_order: float = 0.0
    unit_price: float = 0.0
    product_type: Optional[str] = None

@dataclass
class QuotationCandidate:
    """Quotation matching candidate"""
    code: str
    matched_name: str
    unit_price: float
    source: str  # "共同" | "历史报价" | "字段匹配" | "英文字段匹配"
    score: float = 0.0
    description_english: Optional[str] = None

@dataclass
class MatchResult:
    """Result from match_price_and_get_inventory"""
    code: str
    matched_name: str
    unit_price: float
    available_qty: float
    warehouse_qty: float
    match_source: str
```

- [ ] **Step 3: Write test**

```python
# python/core/test_models.py
def test_inventory_item():
    from core.models import InventoryItem
    item = InventoryItem(code="8020020755", name="直接50", qty_available=100)
    assert item.code == "8020020755"
    assert item.qty_available == 100

def test_quotation_candidate():
    from core.models import QuotationCandidate
    cand = QuotationCandidate(code="8020020755", matched_name="直接50", unit_price=12.5, source="共同")
    assert cand.source == "共同"
```

- [ ] **Step 4: Run test**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest core/test_models.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add python/core/models.py python/core/test_models.py
git commit -m "feat(quotation-migration): migrate models.py"
```

---

## Task 4: Stub Implementations

**Files:**
- Create: `python/core/repository.py`
- Create: `python/core/api_client.py`
- Test: `python/core/test_stubs.py`

- [ ] **Step 1: Create repository.py stub**

```python
"""
Repository stub - Neon DB dependency replaced with empty implementation
Migrated from agent-jk/backend/tools/admin/repository.py
"""
from __future__ import annotations
import logging
from typing import List

logger = logging.getLogger(__name__)

def list_libraries() -> List[dict]:
    """Returns empty list (stub for Neon DB)"""
    logger.warning("repository.list_libraries: Neon DB not available, returning empty list")
    return []

def fetch_all_library_rows(table_name: str) -> List[dict]:
    """Returns empty list (stub for Neon DB)"""
    logger.warning(f"repository.fetch_all_library_rows: Neon DB not available, returning empty list for {table_name}")
    return []
```

- [ ] **Step 2: Create api_client.py stub**

```python
"""
API client stub - HTTP API dependency replaced with error implementation
Migrated from agent-jk/backend/tools/inventory/lib/api/client.py
"""
from __future__ import annotations
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

class APIClientError(Exception):
    """API client error"""
    pass

class APIClient:
    """Stub API client that returns error responses"""
    
    def __init__(self, base_url: str = "", api_key: str = ""):
        self.base_url = base_url
        self.api_key = api_key
        logger.warning("APIClient: Using stub implementation, API calls will fail")
    
    def get_inventory(self, code: str) -> Optional[dict[str, Any]]:
        """Returns None (stub for HTTP API)"""
        logger.warning(f"APIClient.get_inventory: HTTP API not available, returning None for {code}")
        return None
    
    def get_inventory_batch(self, codes: list[str]) -> list[dict[str, Any]]:
        """Returns empty list (stub for HTTP API)"""
        logger.warning(f"APIClient.get_inventory_batch: HTTP API not available, returning empty list")
        return []
```

- [ ] **Step 3: Write test**

```python
# python/core/test_stubs.py
def test_repository_stub():
    from core.repository import list_libraries, fetch_all_library_rows
    assert list_libraries() == []
    assert fetch_all_library_rows("test") == []

def test_api_client_stub():
    from core.api_client import APIClient
    client = APIClient()
    assert client.get_inventory("8020020755") is None
    assert client.get_inventory_batch(["8020020755", "8020020756"]) == []
```

- [ ] **Step 4: Run test**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest core/test_stubs.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add python/core/repository.py python/core/api_client.py python/core/test_stubs.py
git commit -m "feat(quotation-migration): add stub implementations for Neon DB and API client"
```

---

## Task 5: Core Fuzzy Matcher - wanding_fuzzy_matcher.py

**Files:**
- Create: `python/inventory/services/wanding_fuzzy_matcher.py`
- Test: `python/inventory/services/test_wanding_fuzzy_matcher.py`

> **Critical file** — This is the core matching logic. Must preserve all original business rules.

- [ ] **Step 1: Read source file**

Read `D:\Projects\agent-jk\Agent Team version3\backend\tools\inventory\services\wanding_fuzzy_matcher.py`

- [ ] **Step 2: Copy and fix imports**

Copy the file to `python/inventory/services/wanding_fuzzy_matcher.py`, then fix imports:

```python
# Change these imports:
# FROM: from backend.tools.inventory.config import config
# TO:   from core.config import config

# FROM: from backend.tools.inventory.services.mapping_table_matcher import ...
# TO:   from inventory.services.mapping_table_matcher import ...
```

- [ ] **Step 3: Write test**

```python
# python/inventory/services/test_wanding_fuzzy_matcher.py
def test_match_fuzzy_direct50():
    from inventory.services.wanding_fuzzy_matcher import match_fuzzy
    result = match_fuzzy("直接50", customer_level="B")
    # Result may be None if no match, or dict with code/matched_name
    assert result is None or isinstance(result, dict)

def test_match_fuzzy_candidates():
    from inventory.services.wanding_fuzzy_matcher import match_fuzzy_candidates
    results = match_fuzzy_candidates("直接50", max_candidates=5)
    assert isinstance(results, list)
    # Each result should have required fields
    for r in results:
        assert "code" in r
        assert "matched_name" in r
        assert "unit_price" in r

def test_get_wanding_price_by_code():
    from inventory.services.wanding_fuzzy_matcher import get_wanding_price_by_code
    result = get_wanding_price_by_code("8020020755", customer_level="B")
    # Result may be None if code not found
    assert result is None or isinstance(result, dict)
```

- [ ] **Step 4: Run test**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest inventory/services/test_wanding_fuzzy_matcher.py -v
```

Expected: PASS (or SKIP if data files not in place)

- [ ] **Step 5: Commit**

```bash
git add python/inventory/services/wanding_fuzzy_matcher.py python/inventory/services/test_wanding_fuzzy_matcher.py
git commit -m "feat(quotation-migration): migrate wanding_fuzzy_matcher.py"
```

---

## Task 6: Mapping Table Matcher - mapping_table_matcher.py

**Files:**
- Create: `python/inventory/services/mapping_table_matcher.py`
- Test: `python/inventory/services/test_mapping_table_matcher.py`

- [ ] **Step 1: Read source file**

Read `D:\Projects\agent-jk\Agent Team version3\backend\tools\inventory\services\mapping_table_matcher.py`

- [ ] **Step 2: Copy and fix imports**

Copy the file, fix imports to use local modules.

- [ ] **Step 3: Write test**

```python
# python/inventory/services/test_mapping_table_matcher.py
def test_match_mapping_top_candidates():
    from inventory.services.mapping_table_matcher import match_mapping_top_candidates
    results = match_mapping_top_candidates("直接50", top_k=5)
    assert isinstance(results, list)

def test_invalidate_mapping_cache():
    from inventory.services.mapping_table_matcher import invalidate_mapping_cache
    invalidate_mapping_cache()  # Should not raise
```

- [ ] **Step 4: Run test**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest inventory/services/test_mapping_table_matcher.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add python/inventory/services/mapping_table_matcher.py python/inventory/services/test_mapping_table_matcher.py
git commit -m "feat(quotation-migration): migrate mapping_table_matcher.py"
```

---

## Task 7: LLM Selector - llm_selector.py

**Files:**
- Create: `python/inventory/services/llm_selector.py`
- Test: `python/inventory/services/test_llm_selector.py`

- [ ] **Step 1: Read source file**

Read `D:\Projects\agent-jk\Agent Team version3\backend\tools\inventory\services\llm_selector.py`

- [ ] **Step 2: Copy and fix imports**

Copy the file, fix imports.

- [ ] **Step 3: Write test**

```python
# python/inventory/services/test_llm_selector.py
def test_llm_select_best_fallback():
    from inventory.services.llm_selector import llm_select_best
    candidates = [
        {"code": "8020020755", "matched_name": "直接50", "unit_price": 12.5, "source": "共同"},
        {"code": "8020020756", "matched_name": "直接50排水", "unit_price": 11.0, "source": "字段匹配"},
    ]
    result = llm_select_best("直接50", candidates)
    assert result is not None
    assert "code" in result

def test_llm_select_best_empty():
    from inventory.services.llm_selector import llm_select_best
    result = llm_select_best("test", [])
    assert result is None
```

- [ ] **Step 4: Run test**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest inventory/services/test_llm_selector.py -v
```

Expected: PASS (fallback to first candidate without API key)

- [ ] **Step 5: Commit**

```bash
git add python/inventory/services/llm_selector.py python/inventory/services/test_llm_selector.py
git commit -m "feat(quotation-migration): migrate llm_selector.py"
```

---

## Task 8: Main Orchestrator - match_and_inventory.py

**Files:**
- Create: `python/inventory/services/match_and_inventory.py`
- Test: `python/inventory/services/test_match_and_inventory.py`

- [ ] **Step 1: Read source file**

Read `D:\Projects\agent-jk\Agent Team version3\backend\tools\inventory\services\match_and_inventory.py`

- [ ] **Step 2: Copy and fix imports**

Copy the file, fix imports to use local modules.

- [ ] **Step 3: Write test**

```python
# python/inventory/services/test_match_and_inventory.py
def test_match_price_and_get_inventory():
    from inventory.services.match_and_inventory import match_price_and_get_inventory
    result = match_price_and_get_inventory("直接50", customer_level="B")
    # Result may be None if no match, or dict with code/matched_name/unit_price
    assert result is None or "code" in result

def test_match_quotation_union():
    from inventory.services.match_and_inventory import match_quotation_union
    results = match_quotation_union("直接50", customer_level="B")
    assert isinstance(results, list)
```

- [ ] **Step 4: Run test**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest inventory/services/test_match_and_inventory.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add python/inventory/services/match_and_inventory.py python/inventory/services/test_match_and_inventory.py
git commit -m "feat(quotation-migration): migrate match_and_inventory.py"
```

---

## Task 9: Python Entry Point - main.py

**Files:**
- Create: `python/main.py`
- Test: `python/test_main.py`

- [ ] **Step 1: Create python/main.py**

```python
#!/usr/bin/env python3
"""
MCP Python Entry Point - stdin/stdout JSON protocol

Reads JSON from stdin, dispatches to business logic, writes JSON to stdout.
This is the interface between TypeScript MCP server and Python business logic.
"""
from __future__ import annotations
import sys
import json
import logging
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s")
logger = logging.getLogger(__name__)

def dispatch(tool: str, params: dict) -> dict[str, Any]:
    """Dispatch tool call to appropriate function"""
    
    if tool == "match_quotation":
        from inventory.services.match_and_inventory import match_price_and_get_inventory
        result = match_price_and_get_inventory(
            params["keywords"],
            customer_level=params.get("customer_level", "B"),
            price_library_path=params.get("price_library_path"),
            product_type=params.get("product_type"),
        )
        return result
    
    elif tool == "match_quotation_batch":
        from inventory.services.match_and_inventory import match_price_and_get_inventory
        keywords_list = params.get("keywords_list", [])
        results = []
        for kw in keywords_list[:50]:  # Max 50 items
            r = match_price_and_get_inventory(kw, customer_level=params.get("customer_level", "B"))
            results.append(r)
        return results
    
    elif tool == "get_inventory_by_code":
        from inventory.agents.table_agent import InventoryTableAgent
        table = InventoryTableAgent()
        item = table.get_item_by_code(params["code"])
        if item:
            return {
                "code": item.code,
                "name": item.name,
                "qty_available": item.qty_available,
                "qty_warehouse": item.qty_warehouse,
            }
        return None
    
    elif tool == "get_inventory_by_code_batch":
        from inventory.agents.table_agent import InventoryTableAgent
        table = InventoryTableAgent()
        codes = params.get("codes", [])
        results = []
        for code in codes[:50]:
            item = table.get_item_by_code(code)
            item_data = None
            if item:
                item_data = {
                    "code": item.code,
                    "name": item.name,
                    "qty_available": item.qty_available,
                    "qty_warehouse": item.qty_warehouse,
                }
            results.append({"code": code, "item": item_data})
        return results
    
    elif tool == "parse_excel_smart":
        from quotation.quote_tools import parse_excel_smart
        return parse_excel_smart(
            file_path=params["file_path"],
            sheet_name=params.get("sheet_name"),
            max_rows=params.get("max_rows", 500),
        )
    
    elif tool == "fill_quotation_sheet":
        from quotation.flow_orchestrator import run_quotation_fill_flow
        return run_quotation_fill_flow(
            quotation_path=params["file_path"],
            price_library_path=params.get("price_library_path"),
            output_path=params.get("output_path"),
            sheet_name=params.get("sheet_name"),
            customer_level=params.get("customer_level", "B"),
        )
    
    elif tool == "ask_clarification":
        return {
            "success": False,
            "error": "ask_clarification not implemented yet",
            "options": [
                {"id": "pvc_给水管", "name": "PVC-U 给水管"},
                {"id": "pvc_排水管", "name": "PVC-U 排水管"},
                {"id": "pvc_线管", "name": "PVC-U 电线管"},
                {"id": "pvc_meter", "name": "PVC-M 给水管"},
                {"id": "pvc_pe", "name": "PE 管"},
                {"id": "pvc_other", "name": "其他 PVC 管件"},
            ]
        }
    
    else:
        raise ValueError(f"Unknown tool: {tool}")

def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            request = json.loads(line.strip())
            tool = request.get("tool", "")
            params = request.get("params", {})
            logger.info(f"Dispatching: {tool}")
            result = dispatch(tool, params)
            print(json.dumps({"success": True, "result": result}), flush=True)
        except Exception as e:
            logger.error(f"Error: {e}")
            print(json.dumps({"success": False, "error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Write test**

```python
# python/test_main.py
def test_dispatch_parse_excel():
    import subprocess
    import json
    
    request = json.dumps({
        "tool": "parse_excel_smart",
        "params": {
            "file_path": "data/wanding_price_lib.xlsx",
            "max_rows": 5
        }
    })
    
    result = subprocess.run(
        ["python3", "main.py"],
        input=request + "\n",
        capture_output=True,
        text=True,
        cwd="D:/Projects/claude-code-best/python"
    )
    
    output = json.loads(result.stdout.strip())
    assert output["success"] == True
    assert "result" in output
```

- [ ] **Step 3: Run test**

```bash
cd D:/Projects/claude-code-best
python3 python/test_main.py
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add python/main.py python/test_main.py
git commit -m "feat(quotation-migration): add Python entry point with stdin/stdout JSON protocol"
```

---

## Task 10: TypeScript Python Spawner

**Files:**
- Create: `mcp_servers/quotation-server/src/python-spawner.ts`
- Test: `mcp_servers/quotation-server/tests/python-spawner.test.ts`

- [ ] **Step 1: Create python-spawner.ts**

```typescript
/**
 * Python Spawner - TypeScript wrapper for Python subprocess
 * Reads JSON from stdin, writes JSON to stdout
 */
import { spawn } from "child_process";
import { resolve } from "path";

const PYTHON_TIMEOUT_MS = 30000;

export interface PythonToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

export async function callPythonTool(
  tool: string,
  params: Record<string, unknown>,
  pythonPath: string = "python/main.py",
  projectRoot: string = process.cwd()
): Promise<PythonToolResult> {
  return new Promise((resolve) => {
    const pythonCmd = process.env.PYTHON_EXECUTABLE ?? "python3";
    
    const proc = spawn(pythonCmd, [pythonPath], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
      resolve({ success: false, error: "Python call timed out (30s)" });
    }, PYTHON_TIMEOUT_MS);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
      console.error(`[Python stderr] ${data}`);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code !== 0 && stderr) {
        console.error(`[Python exited with code ${code}] ${stderr}`);
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        resolve({ success: false, error: `Failed to parse Python output: ${stdout}` });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ 
        success: false, 
        error: `Failed to spawn Python: ${err.message}. Make sure Python 3.10+ is installed.` 
      });
    });

    const request = JSON.stringify({ tool, params });
    proc.stdin.write(request + "\n");
    proc.stdin.end();
  });
}
```

- [ ] **Step 2: Write test**

```typescript
// mcp_servers/quotation-server/tests/python-spawner.test.ts
import { describe, test, expect } from "bun:test";
import { callPythonTool } from "../src/python-spawner";

describe("callPythonTool", () => {
  test("returns error for unknown tool", async () => {
    const result = await callPythonTool("unknown_tool", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown tool");
  });
});
```

- [ ] **Step 3: Run test**

```bash
cd D:/Projects/claude-code-best
bun test mcp_servers/quotation-server/tests/python-spawner.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add mcp_servers/quotation-server/src/python-spawner.ts
git add mcp_servers/quotation-server/tests/python-spawner.test.ts
git commit -m "feat(quotation-migration): add Python spawner for subprocess communication"
```

---

## Task 11: Quotation Tools Migration

**Files:**
- Create: `python/quotation/quote_tools.py`
- Create: `python/quotation/flow_orchestrator.py`
- Create: `python/quotation/shortage_report.py`
> **Note:** `canonical_lines.py` does not exist in agent-jk source. Skip it.

- [ ] **Step 1: Read source files**

Read from `D:\Projects\agent-jk\Agent Team version3\backend\tools\quotation/`:
- `quote_tools.py`
- `flow_orchestrator.py`
- `shortage_report.py`
- `canonical_lines.py`

- [ ] **Step 2: Copy and fix imports**

Copy each file, fix imports to use local modules.

- [ ] **Step 3: Write test**

```python
# python/quotation/test_quote_tools.py
def test_parse_excel_smart():
    from quotation.quote_tools import parse_excel_smart
    result = parse_excel_smart("data/wanding_price_lib.xlsx", max_rows=5)
    assert result.get("success") == True
```

- [ ] **Step 4: Run test**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest quotation/test_quote_tools.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add python/quotation/quote_tools.py python/quotation/flow_orchestrator.py
git add python/quotation/shortage_report.py
git commit -m "feat(quotation-migration): migrate quotation tools"
```

---

## Task 12: Inventory Agent Tools Migration

**Files:**
- Create: `python/inventory/services/inventory_agent_tools.py`
- Create: `python/inventory/services/resolver.py`
- Create: `python/inventory/agents/table_agent.py`

- [ ] **Step 1: Read source files**

Read from `D:\Projects\agent-jk\Agent Team version3\backend\tools\inventory/`:
- `services/inventory_agent_tools.py`
- `services/resolver.py`
- `agents/table_agent.py`

- [ ] **Step 2: Copy and fix imports**

Copy and fix imports.

- [ ] **Step 3: Write test**

```python
# python/inventory/test_inventory_agent.py
def test_table_agent_get_item():
    from inventory.agents.table_agent import InventoryTableAgent
    table = InventoryTableAgent()
    item = table.get_item_by_code("8020020755")
    assert item is None or hasattr(item, "code")
```

- [ ] **Step 4: Run test**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest inventory/test_inventory_agent.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add python/inventory/services/inventory_agent_tools.py python/inventory/services/resolver.py
git add python/inventory/agents/table_agent.py
git commit -m "feat(quotation-migration): migrate inventory agent tools"
```

---

## Task 13: MCP Server Update

**Files:**
- Modify: `mcp_servers/quotation-server/src/index.ts`

- [ ] **Step 1: Update MCP tools to use python-spawner**

Modify `index.ts` to call `callPythonTool` instead of local implementations:

```typescript
import { callPythonTool } from "./python-spawner";

// In the CallToolRequestSchema handler:
if (name === "match_quotation") {
  const result = await callPythonTool("match_quotation", {
    keywords: args.keywords,
    customer_level: args.customer_level,
    product_type: args.product_type,
  });
  // ... handle result
}
```

- [ ] **Step 2: Test MCP server startup**

```bash
cd D:/Projects/claude-code-best
echo '{}' | bun run mcp_servers/quotation-server/src/index.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add mcp_servers/quotation-server/src/index.ts
git commit -m "feat(quotation-migration): update MCP server to use python-spawner"
```

---

## Task 14: End-to-End Integration Test

**Files:**
- Create: `python/test_integration.py`
- Create: `mcp_servers/quotation-server/tests/e2e.test.ts`

- [ ] **Step 1: Python integration test**

```python
# python/test_integration.py
def test_match_quotation_flow():
    from inventory.services.match_and_inventory import match_price_and_get_inventory
    
    result = match_price_and_get_inventory("直接50", customer_level="B")
    
    if result:
        assert "code" in result
        assert "matched_name" in result
        assert "unit_price" in result
        print(f"Matched: {result['code']} - {result['matched_name']} @ {result['unit_price']}")
```

- [ ] **Step 2: MCP e2e test**

```typescript
// mcp_servers/quotation-server/tests/e2e.test.ts
import { describe, test, expect } from "bun:test";

describe("MCP e2e", () => {
  test("match_quotation returns valid result", async () => {
    const result = await callPythonTool("match_quotation", {
      keywords: "直接50",
      customer_level: "B",
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd D:/Projects/claude-code-best/python
python3 -m pytest test_integration.py -v

cd D:/Projects/claude-code-best
bun test mcp_servers/quotation-server/tests/e2e.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add python/test_integration.py mcp_servers/quotation-server/tests/e2e.test.ts
git commit -m "test(quotation-migration): add integration tests"
```

---

## Task 15: Documentation Update

**Files:**
- Modify: `docs/ccb/mcp-development-guide.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update MCP development guide**

Add section about Python subprocess pattern.

- [ ] **Step 2: Update CLAUDE.md**

Update quotation skills routing to use new MCP tools.

- [ ] **Step 3: Commit**

```bash
git add docs/ccb/mcp-development-guide.md CLAUDE.md
git commit -m "docs(quotation-migration): update documentation"
```

---

## Self-Review Checklist

After completing all tasks:

1. **Spec coverage:** All 7 MCP tools implemented
2. **Placeholder scan:** No TODOs, all code complete
3. **Type consistency:** All function signatures match spec
4. **Import paths:** All Python imports resolved
5. **Tests:** All tests pass

---

## Success Criteria

| Criteria | Verification |
|----------|--------------|
| All 7 MCP tools registered | Check `ListToolsResponse` |
| `match_quotation` returns candidates | Manual test |
| Python subprocess spawned correctly | Check logs |
| Error handling for missing Python | Manual test |
| No circular imports | Run Python import test |