# MCP error codes and agent eval cases

## Goal

Add a minimal, low-complexity foundation for CCB-Wanding agent regression checks:

- Standardize core MCP error codes in the quotation Python entrypoint and MCP wrapper.
- Seed a small agent-level eval case set that can catch prompt/model/tool-selection drift.
- Provide a no-dependency runner that validates cases by default and can optionally run live ACP smoke prompts.

## Scope

- Quotation MCP / Python JSONL dispatch path.
- Initial eval cases for quotation, inventory, Accurate, routing, and anti-hallucination behavior.
- Documentation/spec updates for the new contract.

## Non-goals

- Full run/step database.
- A dashboard.
- Replacing existing smoke tests.
- Changing live AionUI UI behavior.

## Completion criteria

- Python dispatch failures include `error_code`.
- Inner tool payloads with `success:false` get normalized error codes.
- Non-exception unmatched/ambiguous payloads expose `NO_DATA` / `AMBIGUOUS_MATCH` where useful.
- `eval/agent_eval_cases.jsonl` has 30+ cases.
- A runner can schema-check the JSONL locally and optionally run live ACP prompts.
