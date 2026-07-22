# AionCore SQLite — pooled transactions

> **Scope:** `AionCore` crates using `sqlx` + `SqlitePool` (org DB, work-tasks, etc.).  
> **Reviewer:** Runtime Crash Checklist in `.cursor/agents/code-reviewer.md` must FAIL raw `BEGIN`/`COMMIT` on `&pool`.

## Rule

When a unit of work needs **more than one statement** (read-check → update → delete, last-admin guard, clear FKs then delete):

| Do | Don't |
|----|--------|
| `let mut tx = pool.begin().await?;` then bind all queries to `&mut *tx`; `tx.commit().await?` | `sqlx::query("BEGIN…").execute(&pool)` then later statements/COMMIT on `&pool` |
| Or `pool.acquire()` and run **all** SQL on that **same** connection | Assume `BEGIN` and `COMMIT` share a connection |

**Why:** Production file pools use `max_connections` > 1 (currently **5**). Raw `BEGIN` on connection A and `COMMIT`/`DELETE` on connection B → abandoned txn / `"cannot commit - no transaction is active"` → often **HTTP 500**. In-memory tests use `max_connections = 1`, so they **will not** catch this.

## Verification

1. Grep for `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` on `&self.pool` or `&pool` in application code → replace with `pool.begin()` unless intentionally single-statement.
2. Prefer existing patterns: `sqlite_team.rs`, `sqlite_client_preference.rs`, `aionui-price-library` services.
3. For delete / multi-step authz+mutate paths: add a regression test that uses **`init_database` (file, multi-conn)**, not only `init_database_memory`.

## Exception

Single `INSERT`/`UPDATE`/`DELETE` with no surrounding transaction → pool execute is fine.
