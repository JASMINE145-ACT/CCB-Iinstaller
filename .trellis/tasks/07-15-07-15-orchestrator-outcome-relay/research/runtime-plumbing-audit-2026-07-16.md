# Runtime plumbing audit ? 2026-07-16

## Outcome

The outcome-relay validator existed, but three shared runtime layers prevented the configured contract from being enforced reliably.

## Confirmed root causes

1. **Colon-scoped mode key:** `mode.sh` uppercased agent ids but did not translate `:`. The generated shell variable name was invalid, so `wande-orchestrator:outcome-relay` did not resolve through the environment override path.
2. **Windows Python alias:** `roe_judge_python_cmd` selected `python3` based only on `command -v`. On this machine that command is a Windows Store alias that exits non-zero; the validator then failed open.
3. **Hook stdin reader:** bundled Git Bash has neither GNU `timeout` nor `dd`. `timeout` resolves to Windows `timeout.exe`, so the old fallback could replace valid hook input with `{}`. A plain `cat` can also wait on an inherited IPC writer.
4. **Eval false positive:** the case used OR matching and searched combined logs. A tool result containing an `.xlsx` path could pass even when the final parent bubble omitted the count.

## Implemented corrections

- Normalize every non `[A-Z0-9_]` character in scoped mode names to `_`.
- Probe Python candidates with `-c "import sys"` before selecting one.
- Incrementally parse hook JSON in Node and emit six NUL-delimited fields in one process. Exit as soon as JSON is complete; keep an 8-second malformed/incomplete fallback.
- Add `response_matches_all` and evaluate response assertions against only the final `[assistant_text]` block.

## RED / GREEN evidence

- RED: scoped mode resolved off; hollow parent returned 0; response assertion module was absent.
- GREEN: scoped mode resolves block; hollow parent returns 2; matching `.xlsx` plus exact `filled_count` returns 0; response assertion tests 3/3 PASS; eval schema loads 83/83.
- Historical full `run-tests.sh`: 13 PASS / 9 FAIL before and after this task on the current Windows fixture environment. Those unrelated baseline failures are recorded and are not claimed as GREEN.

## Remaining gate

Deploy the skill to the live CCB-Wanding config, open a new Guid conversation, and capture the visible parent bubble containing both the quotation path and filled count.
