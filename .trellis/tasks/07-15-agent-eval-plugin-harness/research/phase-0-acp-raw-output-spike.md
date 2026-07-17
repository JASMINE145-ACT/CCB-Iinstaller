# Phase 0 ACP `rawOutput` Spike

Date: 2026-07-15
Task: `07-15-agent-eval-plugin-harness`
Source commit: `820cb051`
Feature branch: `feat/agent-eval-plugin-harness`

## Question

Can the CCB ACP path provide complete tool outputs for deterministic `evidence_link` grading, without patching the ACP bridge or making a second API call?

## Contract alignment

The authoritative source and live quotation profiles are Read-first:

- Source `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`: the first quotation in a session must Read the business knowledge base before `match_quotation`; the documented flow is `Read -> match -> recommendation`.
- Live `%LOCALAPPDATA%/CCB-Wanding/.claude/agents/quotation-agent.md`: the same Read-first statements are present at lines 124 and 172 during this spike.

Legacy assets still contain match-first assertions. Examples include `knowledge-no-read-routine`, `quote-direct50-match-then-kb-one-pick`, `quote-direct50-post-hook-golden`, and the session-open quotation cases in `eval/agent_eval_cases.jsonl`. Those cases remain runnable during migration, but they are not the authority for the new golden Case.

## Recorder implementation evidence

`ccb-installer/lib/acp-update-recorder.mjs` records each `params.update` as one UTF-8 JSONL object before the runner's diagnostic console truncation. Recording is opt-in through `CCB_TEST_EVENT_LOG`. Default recursive redaction covers token, authorization, API-key, password, and secret key names.

Test command:

```powershell
node --test ccb-installer/test/acp-update-recorder.test.mjs
```

Result: 3 tests passed. The test payload preserved a 5,000-character `rawOutput` field, wrote two independently parseable lines, redacted nested configured keys, did not mutate the input, and rejected writes after close.

## Live run A — price plus stock request

Command shape:

```powershell
$env:CCB_TEST_EVENT_LOG='D:\tmp\agent-eval-p0-price-stock-events.jsonl'
$env:CCB_TEST_INSTALL_DIR='D:\CCB-Wanding'
node eval/run-agent-eval.mjs --run --case price-and-stock-single
```

Observed result:

- Legacy harness verdict: `FAIL`, because `mcp__quotation__get_inventory_by_code` was not called before the run ended at approximately 60 seconds.
- JSONL: 27 lines, 17,574 bytes; every line parsed successfully as UTF-8 JSON with Node.
- Completed `mcp__quotation__match_quotation` update: `rawOutput` is an array; serialized length 5,301 characters.
- The first output text is 4,821 characters and parses as a quotation result with 10 candidates and selection context.
- The run did not surface a `Read` tool event. It also called supplier-directory matching and asked for candidate confirmation instead of completing inventory.

Interpretation: the collector captured the full match evidence, but the target Agent did not complete the intended golden business path. This is an Agent behavior `FAIL`, not an Adapter `ERROR` and not evidence that output collection is incomplete.

## Live run B — inventory by selected code

Command shape:

```powershell
$env:CCB_TEST_EVENT_LOG='D:\tmp\agent-eval-p0-inventory-events.jsonl'
$env:CCB_TEST_INSTALL_DIR='D:\CCB-Wanding'
node eval/run-agent-eval.mjs --run --case inventory-code
```

Observed result:

- Legacy harness verdict: `PASS` in approximately 25 seconds.
- JSONL: 18 lines, 4,097 bytes; every line parsed successfully as UTF-8 JSON with Node.
- The `tool_call_update` input event preserved `rawInput.code`.
- The completed `mcp__quotation__get_inventory_by_code` update preserved an array `rawOutput`; serialized length 173 characters.
- The output text is 124 characters and parses into `code`, `name`, `qty_available`, `qty_warehouse`, and `unit` fields.

## Decision

`tool_call_update.rawOutput` is present and sufficiently complete on the current CCB ACP path for match-candidate and inventory evidence links. The previous limitation was the native runner's 2,000/3,000-character console slice and the legacy parser ignoring outputs, not the bridge.

Therefore:

1. Do not patch the ACP bridge in MVP Phase 0.
2. Build the CCB adapter on the opt-in untruncated JSONL seam.
3. Parse the text content inside `rawOutput` as tool-specific JSON when possible, while retaining the raw array and raw-event reference.
4. Treat the live price-plus-stock path as a deterministic failure until the Agent surfaces `Read`, selects a match candidate by evidence, calls inventory, and returns an evidence-consistent table.
5. Keep match-first legacy cases runnable but explicitly migrate or retire their conflicting assertions before claiming the new golden Case passes.

## Fixture and privacy

`agent-eval-plugin/test/fixtures/ccb-acp/tool-call-updates.jsonl` is a synthetic, sanitized fixture modeled on the observed ACP shapes. It contains Read, match, inventory, assistant-table, and completion updates with fictitious material code `TEST-DIRECT50`. It is not a claimed live trace.

The two live logs remain under `D:\tmp` and are not versioned. No authentication values or customer identifiers are included in the persisted research artifact.
