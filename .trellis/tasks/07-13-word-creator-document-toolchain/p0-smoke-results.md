# P0 Smoke Results — 2026-07-13 (updated)

## Summary

| Suite | Result | Notes |
|-------|--------|-------|
| **Contract** | **PASS** | seed + live agent md |
| **MCP probe** office-word | **PASS** | 54 tools |
| **Outbound MCP** | **PASS (FULL)** | DOCX + PDF |
| **ROE judge** | **PASS** | 16/16 |

## Root cause (PDF fail → fixed)

Bundled `vendor/python-wanding/Lib/site-packages` had tiny stubs:

| Stub | Size |
|------|------|
| `pywintypes.py` | 37 B |
| `win32api.py` | 85 B |
| `win32con.py` | 60 B |
| `win32job.py` | 373 B |

These shadowed real pywin32 in MCP `site-packages`, breaking `docx2pdf` / `win32com`.

## Fix

`ccb-installer/scripts/install-office-word-mcp.ps1`:

1. Ensure `docx2pdf` + `pywin32` in MCP `--target`
2. Quarantine stubs `< 2048` B → `*.stub-bak`
3. Launcher: `site.addsitedir(_SITE)` for `pywin32.pth`

Applied to live `D:\CCB-Wanding`.

## Full outbound evidence

```
[smoke-word-outbound] PASS: file ok (36938 B): ...smoke-....docx
[smoke-word-outbound] PASS: convert_to_pdf
[smoke-word-outbound] PASS: file ok (148455 B): ...smoke-....pdf
[smoke-word-outbound] PASS full outbound loop (DOCX + PDF)
```

## Verification gates

| Gate | Result |
|------|--------|
| code-reviewer | PASS (Layer A PASS, Layer B N/A) |
| smoke-word-creator-outbound.mjs | FULL PASS |
