# Research: Codex CLI PreToolUse hook — shell tool matcher name and output contract

- **Query**: In Codex CLI's `.codex/hooks.json` PreToolUse hook system, what is the exact matcher name for shell/bash command execution, and does the `hookSpecificOutput.permissionDecision` contract (Claude-Code-style) work, or does Codex need a different key (`permission`, `decision`, etc.)?
- **Scope**: External (openai/codex source code) + internal (this repo's `.codex/`, `.cursor/`, `.claude/`, `.trellis/.runtime/`)
- **Date**: 2026-07-03

## Confidence Level: CONFIRMED FROM SOURCE (with one important version caveat — see below)

Verified directly against the `openai/codex` GitHub repository source (shallow-cloned `main`, HEAD commit `da4c8ca57d40b074bdc1b5b1218851100150c56b`, dated 2026-07-02 — i.e. the day before this research). Not inferred, not guessed. GitHub's Search API was rate-limited/required auth, so verification was done by cloning the repo and using `git grep`/`git show` against the actual Rust source, JSON Schema fixtures, and unit tests (which assert exact input/output JSON strings).

## Findings

### 1. Matcher name for shell execution: **`"Bash"`** (confirmed, exact string, case-sensitive)

Codex does **not** use `"shell"`, `"exec_command"`, `"local_shell"`, or `"container.exec"` as the hook **matcher** name, even though those are literally the internal tool/function-call names Codex's model uses for shell execution. Codex deliberately maps all shell-like tool calls to the **canonical hook identity `"Bash"`** for hook purposes, specifically for Claude-Code-compatibility.

Source: `codex-rs/core/src/tools/hook_names.rs`

```rust
/// Returns the hook identity historically used for shell-like tools.
pub(crate) fn bash() -> Self {
    Self::new("Bash")
}
```

This `HookToolName::bash()` constructor is used as the `tool_name` sent to hook stdin (and thus as the value matched against a hook's `matcher` regex) in every shell-executing tool handler:

| Call site | Purpose |
|---|---|
| `codex-rs/core/src/tools/handlers/shell/shell_command.rs:251,286` | `shell_command` tool handler |
| `codex-rs/core/src/tools/handlers/unified_exec.rs:90` | `unified_exec` tool (the current generation shell tool) |
| `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:408` | `exec_command` sub-handler (the actual function name the model calls) |
| `codex-rs/core/src/tools/sandboxing.rs:154` | sandbox escalation / approval-adjacent path for shell calls |

So regardless of whether the model-facing function name is `exec_command`, `local_shell`, or `shell_command` (Codex's own `codex-rs/rollout-trace/src/tool_dispatch.rs:263` shows all of `"exec_command" | "local_shell" | "shell" | "shell_command"` are treated as the same `ToolCallKind::ExecCommand` category internally), the **hook-facing `tool_name` field is always the literal string `"Bash"`** for shell calls. A matcher of `"Bash"` (or a regex like `"^Bash$"`, which is exactly what Codex's own unit test fixture uses — see `codex-rs/hooks/src/events/pre_tool_use.rs` test `handler()`) will fire.

Two other tools also get Claude-Code-style compatibility aliases, documented in the same file (relevant if the same gate hook also wants to intercept edits/subagent spawns):
- `apply_patch` → canonical name stays `apply_patch`, but matcher aliases `Write` and `Edit` also select it.
- `spawn_agent` → canonical name stays `spawn_agent`, but matcher alias `Agent` also selects it.
- (This repo's own `.codex/hooks.json` already relies on the `Agent`/`Task` matcher pattern for the sub-agent-context hook — `Task` is *not* in Codex's alias list based on this source read; only `Agent` is confirmed as an alias for `spawn_agent`. `Task` firing in this repo's Codex config is not explained by `hook_names.rs` and was not traced further — flagged as a gap below.)

### 2. Output contract: **YES, `hookSpecificOutput.permissionDecision` is honored, byte-for-byte the same shape as Claude Code** — with one strict caveat

Confirmed against the generated JSON Schema (`codex-rs/hooks/schema/generated/pre-tool-use.command.output.schema.json`) and the Rust wire struct (`codex-rs/hooks/src/schema.rs`) plus `codex-rs/hooks/src/engine/output_parser.rs` (`parse_pre_tool_use`), which has explicit unit tests asserting this exact JSON blocks a tool call:

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"do not run that"}}
```

(test: `permission_decision_deny_blocks_processing` in `codex-rs/hooks/src/events/pre_tool_use.rs`)

Recognized fields (all under `hookSpecificOutput`, all matching Claude Code's naming exactly):
- `hookEventName` — must be `"PreToolUse"` (required)
- `permissionDecision` — enum `"allow" | "deny" | "ask"`
  - **`"deny"`** → blocks the tool call, using `permissionDecisionReason` as the reason surfaced to the model/user. **This is the one to use for the commit gate.**
  - `"allow"` → allows, and can optionally carry `updatedInput` to rewrite the tool call args (used by this repo's `inject-subagent-context.py` today).
  - **`"ask"` is explicitly NOT supported** — test `unsupported_permission_decision_fails_open` shows Codex treats `"ask"` as an *invalid* output (`status = Failed`, error `"PreToolUse hook returned unsupported permissionDecision:ask"`) and does **not** block. Do not rely on `"ask"` for a soft-confirm gate; only `"deny"` blocks.
- `permissionDecisionReason` — string, shown as the block reason.
- `updatedInput` — only consumed when `permissionDecision == "allow"`.
- `additionalContext` — extra context string appended to the model's context.

There is also a **deprecated legacy top-level format** that Codex still accepts as a fallback when `hookSpecificOutput` decision fields are absent: `{"decision":"block","reason":"..."}` (confirmed by test `deprecated_block_decision_blocks_processing`). Top-level `{"decision":"approve"}` is explicitly **not** supported and fails open (test `deprecated_approve_decision_fails_open`) — only `"block"` works in the legacy path; use the `hookSpecificOutput.permissionDecision` path for anything else.

**Codex does NOT read a `"permission"` key at all** (Cursor's convention) for `PreToolUse` blocking, nor does it read a bare top-level `updatedInput`/`updated_input` outside of `hookSpecificOutput` (Gemini's convention per this repo's existing script). Only `hookSpecificOutput.*` and the deprecated top-level `decision`/`reason` pair are wired up in `parse_pre_tool_use`.

### 3. CRITICAL caveat: `#[serde(deny_unknown_fields)]` — Codex's PreToolUse output parser rejects extra top-level keys wholesale

`codex-rs/hooks/src/schema.rs` line 124-131:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
#[schemars(rename = "pre-tool-use.command.output")]
pub(crate) struct PreToolUseCommandOutputWire {
    #[serde(flatten)]
    pub universal: HookUniversalOutputWire,   // continue, stopReason, suppressOutput, systemMessage
    #[serde(default)]
    pub decision: Option<PreToolUseDecisionWire>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub hook_specific_output: Option<PreToolUseHookSpecificOutputWire>,
}
```

`deny_unknown_fields` means **any top-level JSON key outside of `continue`, `stopReason`, `suppressOutput`, `systemMessage`, `decision`, `reason`, `hookSpecificOutput` causes the ENTIRE payload to fail to parse.** When that happens, `parse_pre_tool_use` returns `None`; `output_parser::looks_like_json` still detects it as JSON-shaped, so the hook run is marked `HookRunStatus::Failed` with error `"hook returned invalid pre-tool-use JSON output"` — and **`should_block` stays `false`** (fails open — the shell command runs anyway, silently as far as the user's git-commit workflow is concerned, even though the hook run itself is logged as failed in Codex's hook UI).

Practical implication for this task's stated goal (a commit-gate hook wired into `.codex/hooks.json` mirroring the multi-platform pattern in `.codex/hooks/inject-subagent-context.py`): that existing script's current *allow* path emits a JSON blob with `hookSpecificOutput` **plus** two extra top-level keys, `"permission": "allow"` and `"updated_input": {...}` (Cursor/Gemini compat), alongside `"hookSpecificOutput": {..., "updatedInput": {...}}`:

```python
output = {
    "hookSpecificOutput": {...},
    "permission": "allow",
    "updated_input": updated,
    "updatedInput": updated,
}
```

Under Codex's `deny_unknown_fields` rule, this exact shape (extra top-level `permission` / `updated_input` keys) would **fail to parse as `PreToolUseCommandOutputWire`** and therefore **fail open** rather than actually applying the decision — for a `deny` gate this would mean the commit-blocking gate silently does not block on Codex specifically, even though it would correctly block on Claude Code (which tolerates/ignores unknown top-level keys) and Cursor. This was not asked as an "improvement suggestion" — it is reported because it directly affects whether the "matcher/output contract" the task is trying to verify will actually fire as intended, which is the explicit purpose of this research. Any implementation of the deny gate that reuses the "one multi-format JSON blob" pattern from `inject-subagent-context.py` needs to either (a) emit a JSON body containing *only* the fields `PreToolUseCommandOutputWire` allows when running under Codex, or (b) use the `exit code 2 + stderr reason` blocking path documented below, which sidesteps JSON-shape constraints entirely and is confirmed to work identically to Claude Code's exit-code-2 convention.

### 4. Alternative/fallback blocking mechanism: exit code 2 + stderr

Confirmed by test `exit_code_two_blocks_processing` in `codex-rs/hooks/src/events/pre_tool_use.rs` and by the `parse_completed` match arm `Some(2) => { ... }` in the same file: if the hook command process exits with status code `2` and writes a non-empty reason to **stderr**, Codex sets `should_block = true` and uses the stderr text as the block reason — no JSON output needed at all. This mirrors Claude Code's own exit-code-2 blocking convention and is immune to the `deny_unknown_fields` trap above, since no JSON is parsed on this path.

### 5. Hook file location and input schema (confirmed)

- File path resolution confirmed in `codex-rs/app-server/src/config/external_agent_config.rs:541` and `codex-rs/hooks/src/engine/discovery.rs:307`: repo-scoped hooks live at `<repo_root>/.codex/hooks.json` (exactly matching this repo's existing `D:\Projects\claude-code-best\.codex\hooks.json`); user-level hooks live at `$CODEX_HOME/hooks.json`.
- `pre-tool-use.command.input.schema.json` confirms the stdin payload sent to a `PreToolUse` hook process includes (required unless noted): `cwd`, `hook_event_name` (const `"PreToolUse"`), `model`, `permission_mode` (`default|acceptEdits|plan|dontAsk|bypassPermissions`), `session_id`, `tool_input` (arbitrary), `tool_name` (string — this is where `"Bash"` appears), `tool_use_id`, `transcript_path` (nullable string), `turn_id` (Codex-specific extension, "expose the active turn id to internal turn-scoped hooks"), plus optional `agent_id`/`agent_type` for sub-agent runs. This is very close to Claude Code's PreToolUse stdin shape but adds `turn_id` and constrains `permission_mode` to an enum Claude Code doesn't expose the same way.
- Hook registration schema (`hooks.json`) itself uses the identical shape already present in this repo's `.codex/hooks.json`: `{"hooks":{"PreToolUse":[{"matcher":"<name>","hooks":[{"type":"command","command":"...","timeout":N}]}]}}`. Confirmed via `codex-rs/app-server/src/config/external_agent_config_tests.rs` and `codex-rs/hooks/src/events/pre_tool_use.rs`'s own `ConfiguredHandler { matcher: Some("^Bash$".to_string()), ... }` fixture.

### Files Found (in the cloned `openai/codex` source, referenced by path relative to repo root)

| File Path | Description |
|---|---|
| `codex-rs/core/src/tools/hook_names.rs` | Defines `HookToolName::bash()` → literal `"Bash"`; also `apply_patch()`/`spawn_agent()` aliasing. This is the single source of truth for "what matcher name does tool X use." |
| `codex-rs/core/src/tools/handlers/unified_exec.rs`, `.../unified_exec/exec_command.rs`, `.../shell/shell_command.rs`, `codex-rs/core/src/tools/sandboxing.rs` | All shell-executing tool handlers; all call `HookToolName::bash()` when emitting `PreToolUse`/`PostToolUse` hook payloads. |
| `codex-rs/hooks/src/events/pre_tool_use.rs` | `PreToolUse` hook request/response handling; contains the authoritative unit tests proving exact accepted JSON shapes (`permission_decision_deny_blocks_processing`, `deprecated_block_decision_blocks_processing`, `exit_code_two_blocks_processing`, `unsupported_permission_decision_fails_open`, etc). |
| `codex-rs/hooks/src/engine/output_parser.rs` | `parse_pre_tool_use` — the actual parser deciding block/allow from hook stdout. |
| `codex-rs/hooks/src/schema.rs` | Rust wire structs (`PreToolUseCommandOutputWire`, `PreToolUseHookSpecificOutputWire`, `PreToolUseDecisionWire`, `PreToolUsePermissionDecisionWire`) with `#[serde(deny_unknown_fields)]` on all output wire types. |
| `codex-rs/hooks/schema/generated/pre-tool-use.command.input.schema.json` | Generated JSON Schema for hook stdin payload. |
| `codex-rs/hooks/schema/generated/pre-tool-use.command.output.schema.json` | Generated JSON Schema for hook stdout payload Codex will parse. |
| `codex-rs/app-server/src/config/external_agent_config.rs` | Confirms `.codex/hooks.json` (repo) / `$CODEX_HOME/hooks.json` (user) resolution, and the "external agent config migration" feature that imports Claude-Code-style `settings.json` hooks verbatim (matcher strings like `"Bash"` pass through unchanged — this is evidence Codex expects `"Bash"` as a meaningful matcher name for its own tools, not just an artifact of migration). |
| `codex-rs/hooks/src/engine/discovery.rs` | Hook file discovery / precedence logic; no experimental feature flag gating found for the hooks system. |
| `codex-rs/rollout-trace/src/tool_dispatch.rs:263` | Shows the full set of internal shell-tool-call aliases Codex recognizes for its own trace/telemetry classification: `"exec_command" | "local_shell" | "shell" | "shell_command"` — useful context for why the *matcher* name (`"Bash"`) differs from the *model-facing function* name(s). |

### Repo-internal search results (this repo, `D:\Projects\claude-code-best`)

| File Path | Finding |
|---|---|
| `.codex/hooks.json` | Only registers `PreToolUse` for matchers `"Task"` and `"Agent"` (sub-agent context injection) — **no existing shell/`Bash` matcher precedent in this repo's Codex config to copy from.** |
| `.codex/hooks/inject-subagent-context.py` | The multi-format hybrid-JSON pattern mentioned in the task. Confirmed it emits `hookSpecificOutput.permissionDecision: "allow"` + top-level `permission: "allow"` + top-level `updated_input`/`updatedInput` simultaneously — see caveat #3 above regarding `deny_unknown_fields` risk if this pattern is reused for a `deny` decision under Codex. |
| `.claude/settings.json` | Claude Code side: also only has `PreToolUse` matchers `"Task"`/`"Agent"`, nothing for `Bash`/shell — **no existing Claude-side commit-gate hook to mirror either**, contrary to the task's framing ("mirroring the existing Claude Code and Cursor gate hooks"). |
| `.cursor/hooks.json` | Cursor's hook schema in this repo is **not** the `{"PreToolUse":[{"matcher":...}]}` shape at all — it uses Cursor-native top-level event names `afterAgentResponse` and `stop` (no `matcher` field, no `PreToolUse`). Cursor's actual shell-interception hook event is named `beforeShellExecution` (per Cursor's own hook system, not investigated further here since it's out of scope for this task's Codex-focused question), which is architecturally different from Claude Code's `PreToolUse`/`matcher` model. **This repo currently has no Cursor-side commit gate hook using the `PreToolUse`/`matcher` schema to mirror** — the task's premise that Cursor already has an equivalent gate hook wired the same way appears to not hold in this repo as-is. |
| `.trellis/.runtime/sessions/codex_*.json` | Does **not** contain raw hook stdin/stdout payloads — only minimal session state (`platform`, `last_seen_at`, `current_task`, `current_run`) written by `session_context.py`. Not useful for empirically observing real Codex tool-call names; searched for `"tool_name"`, `local_shell`, `exec_command`, `shell` and found zero matches in these files. |
| `.claude/skills/trellis-meta/references/customize-local/change-hooks.md` | Confirms this repo's own doc guidance: "Hook failures should produce visible errors so AI does not silently lose context" — directly relevant to caveat #3, since a `deny_unknown_fields` mismatch under Codex would fail *silently as far as the commit gate's blocking effect goes* (the hook run itself shows as "Failed" in Codex's hook log/UI, but the shell command is not blocked) unless the implementation is careful to test this on the actual `codex` binary. |
| `.codex/agents/*.toml` | Contains `trellis-check.toml`, `trellis-implement.toml`, `trellis-research.toml` — agent definitions, not tool-call name evidence; not directly relevant to the matcher-name question. |

## Caveats / Not Found

1. **Version/availability gap risk (the one honest "unknown" in this otherwise source-confirmed answer).** This entire analysis is based on the `openai/codex` `main` branch HEAD as of 2026-07-02 (commit `da4c8ca57d40b074bdc1b5b1218851100150c56b`), fetched via `git clone` on 2026-07-03. There is no `docs/hooks.md` in the public docs folder and no `CHANGELOG.md` entry found for the hooks system — meaning this feature, while clearly extensively built (dedicated `codex-rs/hooks` crate, full JSON Schema generation, TUI browser view, app-server v2 protocol surface, migration-from-Claude-Code tooling) is either very recently landed or intentionally undocumented publicly so far. **It is not confirmed that the `codex` binary the user actually has installed locally includes this hook system, or that it behaves identically to this HEAD snapshot.** Recommend the user check `codex --version` and, ideally, do a quick empirical sanity check (a trivial `PreToolUse`/`Bash` hook that just logs to a file) before depending on this for a security-relevant commit gate — the PRD should not treat this as 100% risk-free just because it's "confirmed from source," since source-vs-installed-binary drift is a real possibility here given how new this looks.
2. `Task` as a working matcher alias for sub-agent spawning in this repo's own `.codex/hooks.json` was not explained by `hook_names.rs` (which only documents `Agent` as a `spawn_agent` alias, not `Task`). Did not trace further where/whether `Task` is separately recognized — flagged but out of scope for the shell-matcher question this task asked.
3. Did not verify Cursor's actual `beforeShellExecution` hook event/schema in detail (out of scope — task explicitly scoped to Codex), only noted that this repo's `.cursor/hooks.json` doesn't currently contain a `PreToolUse`-shaped gate hook to mirror, which affects the task's stated premise ("mirroring the existing Claude Code and Cursor gate hooks") — no existing gate hook of that shape was found on either the Claude or Cursor side in this repo to mirror; both sides register only the sub-agent-context `Task`/`Agent` PreToolUse hooks.
4. Did not attempt to build/run the `codex` binary from source to empirically fire a real hook (out of scope/time; the unit tests in `pre_tool_use.rs` are treated as sufficiently authoritative since they assert exact JSON-in/decision-out behavior with `assert_eq!`, not just documentation prose).

## Recommended Next Step

Given confidence is "confirmed from source but with an installed-binary-version caveat," the next step before wiring the actual PRD implementation should be a short empirical smoke test on the real `codex` CLI: register a trivial `.codex/hooks.json` `PreToolUse` hook with `"matcher": "Bash"` that just appends its raw stdin JSON to a debug log file, run one real `codex` shell command, and confirm (a) the hook fires at all, and (b) the logged `tool_name` field reads `"Bash"` as this source analysis predicts. This is a 5-minute check that converts "confirmed from source" into "confirmed end-to-end," and will also reveal immediately if the installed `codex` version predates this hook system.
