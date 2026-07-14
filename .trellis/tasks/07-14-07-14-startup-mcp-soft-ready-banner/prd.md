# Guid soft_ready 横幅常驻 —「MCP 预热未完成」

## Goal

消除 Guid 页**整会话常驻**的「MCP 预热未完成，首条查询可能较慢。」，并恢复 Layer 2 启动预热成功率（至少 quotation；accurate 可降级但不锁死 UX）。

## Symptom

登录后 Guid 一直显示黄色提示：「MCP 预热未完成，首条查询可能较慢。」即使已可发送消息也不消失。

## Root cause (2026-07-14 planning evidence)

| Hypothesis | Evidence | Verdict |
|------------|----------|---------|
| H1 UI 文案来自 `soft_ready && !mcp_ok` | `CcbStartupReadinessBanner.tsx` L42–49 | **confirmed** |
| H2 Layer2 warm 失败后永不重试 | `ensureCcbStartupReadiness`：`phase==='ready'` 直接返回缓存 | **confirmed** |
| H3 accurate「timeout」假象 | warm CLI FAIL 120s；实为 **import 失败立刻退出** | **confirmed（see H5）** |
| H4 外层 120s 墙钟偏紧 | 串行双服；相对 H5 为次要 | contributing |
| H5 **accurate 起不来：缺 pywintypes** | `PYTHONNOUSERSITE=1` + stub quarantine → `ModuleNotFoundError: pywintypes` → stderr `mcp package not found`；warm 不听 `close` 空等 120s。详：`research/accurate-pywintypes-break.md` | **confirmed primary for accurate** |

Parent: `06-28-app-startup-readiness-gate` / spec `.trellis/spec/integration/mcp-health.md` § App startup readiness gate.

## Acceptance criteria

1. [x] **Accurate runtime：** `PYTHONNOUSERSITE=1` 下 `python-wanding -c "import mcp"` 成功；`warm … --servers=accurate` PASS（真·pywin32，非 user site）。
2. [x] **Warm honesty：** 子进程早退 → 即时 FAIL+stderr（禁假 120s timeout）。
3. [x] **Cold warm / soft_ready：** quotation PASS 即清 soft_ready；accurate 后台；超时保留 quotation PASS。
4. [x] **Send gate：** 配置 OK 时仍可发（既有 soft_ready 允许发送）。
5. [x] **Tests：** `ccbStartupReadinessShared.test.ts` 9/9；office-word stub+pywin32 路径不冲突。
6. [x] **Packaging：** ensure 进 `$shipScripts` / bootstrap SKIP / start-dev。

## Non-goals

- Layer 3 ACP anchor session
- Warm 全部 MCP（office-word / excel）
- 改 quotation 业务匹配逻辑
