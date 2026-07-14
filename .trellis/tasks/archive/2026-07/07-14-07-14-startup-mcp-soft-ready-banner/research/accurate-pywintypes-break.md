# accurate warm FAIL — pywintypes / PYTHONNOUSERSITE (2026-07-14)

## Symptom (warm CLI)

```text
[warm-wanding-mcp] PASS quotation 24993ms warmed
[warm-wanding-mcp] FAIL accurate 120039ms timeout 120s
exit 2
```

## Not the cause

- AOL token / `accurate_summarize_records` 业务慢（进程未到 tools/call）
- 单纯外层 120s 墙钟不够（进程先已死）

## Confirmed chain

1. `settings.json` → accurate `env.PYTHONNOUSERSITE=1`（`ensure-wanding-settings.ps1` 故意隔离 user site）
2. Bundled `D:\CCB-Wanding\vendor\python-wanding\Lib\site-packages\mcp` import 路径需要 `pywintypes`
3. Live tree: only `pywintypes.py.stub-bak`（office-word 隔离 stub）；**无** `pywin32.pth` / `win32/` → `ModuleNotFoundError: No module named 'pywintypes'`
4. `accurate-mcp/server.py` L35–41：ImportError → stderr `Error: mcp package not found. Install with: pip install mcp` → `sys.exit(1)`
5. Warm spawn 与预热同 env（`env: cfg.env` only）复现 stderr；stdout 无 `"id":2`
6. `warm-wanding-mcp.mjs` **不监听 child `close`**，只等 id=2 或 120s → 误报 `timeout 120s`

## Why quotation OK

quotation 非 python-wanding MCP，不走 `mcp`+`pywintypes`。

## Related installer knowledge

`install-office-word-mcp.ps1` quarantines tiny `pywintypes.py` stubs so real pywin32 (often under MCP `--target` site-packages) can load for docx2pdf. Side effect: shared `python-wanding` site-packages can lose working `pywintypes` for accurate / other stdio MCP that set `PYTHONNOUSERSITE=1`.

## Fix intents (for execution plan)

| ID | Fix |
|----|-----|
| F1 | Ensure real `pywin32` under `vendor/python-wanding` (and packaging whitelist / install step) so `PYTHONNOUSERSITE=1` `import mcp` works |
| F2 | Warm script: on child `close`/`error` without id=2 → FAIL with stderr snippet immediately（禁假 timeout） |
| F3 | Soft_ready UX（parent plan）：banner dismiss/retry；可选 quotation-gated mcp_ok |

## Repro commands

```powershell
# Broken import under production env
$env:PYTHONNOUSERSITE='1'
& D:\CCB-Wanding\vendor\python-wanding\python.exe -c "import mcp"

# Warm parity (expect quick stderr mcp package not found if still broken)
node -e "/* spawn accurate with settings env only */"
node D:\CCB-Wanding\lib\warm-wanding-mcp.mjs --servers=accurate
```
