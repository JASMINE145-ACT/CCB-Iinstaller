# Hermes source lock

**Purpose:** Reproducible Hermes borrowing from a **reachable upstream SHA**.

## Upstream

| Field | Value |
|-------|-------|
| Upstream repo | https://github.com/NousResearch/hermes-agent |
| **Official commit (API-verified)** | `1600008ab00e5a805b69f7ad89a4ed898dc111a6` |
| Commit URL | https://github.com/NousResearch/hermes-agent/commit/1600008ab00e5a805b69f7ad89a4ed898dc111a6 |
| Subject | `fix(desktop): show +/- summary on collapsed review folders` |
| Locked at | 2026-07-16 |
| Local tree | `docs/reference/hermes-agent/` may be zip / **without `.git`** — do **not** rely on `git -C` |

**Invalid prior lock:** `820cb051d32cf766e32c545540b2a68fe7a6d4a0` — GitHub Commit API returns *No commit found* (local-only / non-upstream). Discarded.

## File SHA-256 at `1600008ab00e…` (raw.githubusercontent.com)

Verified 2026-07-16 via `https://raw.githubusercontent.com/NousResearch/hermes-agent/1600008ab00e5a805b69f7ad89a4ed898dc111a6/agent/<file>`:

| File | SHA-256 |
|------|---------|
| `agent/turn_finalizer.py` | `24C714ED098963789C0ECACEB0C0939AF0542041C4EC283C91B1FE163705F1D0` |
| `agent/turn_context.py` | `99CBD9C9C1FB085B7F265CC4D972E0172A41F0EB11B66E3B1F8AA7F3D63A5167` |
| `agent/memory_provider.py` | `7A86B453EDBE3DAE6EA02F3AF406FAC7E39FE7EE7B61BFC84B8C8E4B4A0CE8CD` |
| `agent/background_review.py` | `5A81091F9D9654CB90D479C347607D13E61530645C5B183FDDAB4651D0F8642C` |

Note: these hashes match the previous local files; only the **commit identity** was wrong.

## Refresh procedure (no local git required)

```powershell
$sha = "1600008ab00e5a805b69f7ad89a4ed898dc111a6"  # or newer main tip after re-lock
$base = "https://raw.githubusercontent.com/NousResearch/hermes-agent/$sha/agent"
# Invoke-WebRequest each file; Get-FileHash -Algorithm SHA256; update this table
# Confirm: Invoke-RestMethod https://api.github.com/repos/NousResearch/hermes-agent/commits/$sha
```

## Borrow map (unchanged intent)

| Hermes | Borrow | Do not claim |
|--------|--------|--------------|
| `sync_turn` | TurnCheckpoint | Provider/mem0 |
| nudge interval | FullReview gate | Every-turn LLM |
| `background_review` | Worker → Inbox | Direct MEMORY auto-write |
