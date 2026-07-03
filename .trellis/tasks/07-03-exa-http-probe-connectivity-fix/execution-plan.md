# Execution Plan — `07-03-exa-http-probe-connectivity-fix`

| Field | Value |
|-------|--------|
| **Status** | completed |
| **Scenario** | C (Bug 修复 — 探针误报) |
| **Active phase** | P1 fix + spec |

## Root cause (explored 2026-07-03)

`https://mcp.exa.ai/mcp` is a **Streamable HTTP MCP** endpoint. It responds to HEAD/GET with **HTTP 405 Method Not Allowed** (verified: `curl.exe -I` → 405 in ~2s).

Current probe (`ccbMcpHealth.ts` + `test-mcp-health.ps1` `Test-HttpOk`) only treats **2xx–3xx** as success → **false WARN** `network unreachable` even when the host is online.

| Symptom | Actual meaning |
|---------|----------------|
| UI `exa:http` yellow WARN | Probe logic bug, not necessarily firewall |
| ppt-master checks green | Unrelated — file existence OK |

## Task

| Phase | Workstream | Tool | Files |
|-------|------------|------|-------|
| 0 | Explore + classify | curl + read probe code | — |
| 1 | Fix probe semantics | TDD | `ccbMcpHealth.ts`, `test-mcp-health.ps1`, `probe-research-capabilities.ps1` |
| 2 | Spec + task trail | trellis-update-spec | `mcp-health.md`, jsonl |

## Verification gate

1. code-review agent
2. `bun test` ccbMcpHealth (aionui-src)
3. `test-mcp-health.ps1` quick check — exa:http PASS when 405
4. `implement.jsonl` + `check.jsonl`

## Progress snapshot

| Phase | State | Evidence |
|-------|-------|----------|
| P0 explore | done | curl HEAD/GET → 405 |
| P1 fix | done | bun 4/4; CLI exa:http PASS (405) |
| P2 spec | done | mcp-health.md + jsonl |
