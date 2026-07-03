# Claude Code B Backend Capability Parity Audit

## Goal

Audit whether the current AionUI + aioncore + route-b + CCB-Wanding product preserves the capabilities already implemented by the `D:\claude-code-B` backend, including automatic context compaction and other session lifecycle behavior.

## What I Already Know

- Product chain: AionUI -> aioncore ACP bridge -> route-b launcher -> `D:\CCB-Wanding\dist\cli.js --acp`.
- ACP/MCP/session behavior belongs in `D:\claude-code-B\src`, while AionUI should mainly render ACP events.
- MCP registration has been migrated into Claude Code B source and is reported complete.
- Capability presence in source is not sufficient; the feature must remain reachable through ACP, configuration, launcher policy, and UI handling.

## Requirements

- Compare backend source capabilities with the actual product integration path.
- Cover session lifecycle, automatic compaction, resume/persistence, tools, permissions, MCP, subagents, interruption/cancellation, errors, streaming, and configuration.
- Classify each capability as:
  - Full parity
  - Partial / adapted
  - Disabled by policy/configuration
  - UI not exposed
  - Unknown / not verified
- Identify the highest-risk parity gaps and concrete verification work.

## Acceptance Criteria

- [ ] Evidence links each conclusion to source/spec/integration code.
- [ ] Automatic compaction has an explicit end-to-end verdict.
- [ ] Major backend capability groups have a parity status.
- [ ] Unknowns are separated from confirmed gaps.
- [ ] A prioritized verification/fix roadmap is produced.

## Out of Scope

- Implementing fixes during this audit.
- Claiming parity based only on bundled/minified output.
- Auditing business-specific quotation data quality.

## Technical Notes

- Backend source: `D:\claude-code-B\src`
- Product integration repo: `D:\Projects\claude-code-best`
- AionUI source: `D:\Projects\aionui-src`
- Relevant specs: `.trellis/spec/backend/*`, `.trellis/spec/integration/*`, `.trellis/spec/frontend/*`
