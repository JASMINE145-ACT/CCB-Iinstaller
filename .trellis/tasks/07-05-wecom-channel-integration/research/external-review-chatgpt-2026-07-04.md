# External review — ChatGPT (2026-07-04)

**Inputs reviewed:** `execution-plan.md` rev 2, `prd.md` rev 2 (gap doc referenced but not attached).

**Overall:** Rev 2 architecture direction **approved**. Do **not** approve full P1–P5 until P0 extension runtime lifecycle and group pairing model are proven.

**Incorporated into:** plan/prd/gap doc **rev 3** (2026-07-04).

## Key findings (summary)

1. **Extension runtime host** — `enable_extension_plugin` is metadata-only; P0 must confirm who starts/stops/reconnects WebSocket worker.
2. **Mode matrix** — Split AI Bot callback vs corp self-built app by product object, not credentials alone; add optional `wsUrl`.
3. **v1 internal groups** — @bot-only trigger; separate group pairing rules; namespaced conversation/user ids; visibility range in manual smoke.
4. **Security** — Expand beyond initial checklist (credentials, XML/XXE, SSRF, replay, audit, multi-tenant namespace).
5. **Phasing** — P0 outputs go/no-go; P1 split P1a SDK spike vs P1b bridge; constant-time = unit test + code review; compat path needs production label gate.
6. **Decoupling** — Rename away from `plugin_id: 'wecom'`; split forms; no WanD/CCB in extension; first-party package OK, not vertical package.

Full verbatim review: user chat transcript 2026-07-04.
