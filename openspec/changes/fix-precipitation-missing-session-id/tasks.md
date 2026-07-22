## 1. Reproduce & pin write gap

- [ ] 1.1 Confirm Mixing/funnel last event `schedule_skipped` / `missing_session_id` after ACP turn + 30s idle
- [ ] 1.2 Grep-proof: no writer sets `acp_session_id` in `aionui-src` (except clear-on-fork); document exact hook gaps in task note
- [ ] 1.3 Trace warmup / ACP `session/new` response path; identify where conversation.extra is merged today

## 2. Persist bind (RED → GREEN)

- [ ] 2.1 Add failing unit/integration test: after mocked session/new, conversation.extra includes `acp_session_id`
- [ ] 2.2 Implement persist on session create / force-warmup replace / live-id redirect
- [ ] 2.3 Keep fork behavior: new conversation clears `acp_session_id` / `acp_session_updated_at`
- [ ] 2.4 GREEN: persist tests pass

## 3. Schedule resolve fallback

- [ ] 3.1 Add resolve helper: extra → runtime map by `conversation_id` → else missing
- [ ] 3.2 Wire `useSessionPrecipitationSchedule` / `schedulePrecipitation` through resolve helper
- [ ] 3.3 Unit: empty extra + runtime map → scheduled; both empty → `missing_session_id`
- [ ] 3.4 Confirm funnel remains desensitized (HG1)

## 4. Verification gates

- [ ] 4.1 code-reviewer PASS (Layer A/B as applicable)
- [ ] 4.2 Targeted tests: precipitation funnel/effectiveness + new bind tests
- [ ] 4.3 Mixing smoke: ACP turn → wait 30s → chip not stuck on `missing_session_id`; events show `scheduled` or later worker code
- [ ] 4.4 Update Trellis `07-14-precipitation-effectiveness` (Phase 4b / note open Change)

## 5. Docs

- [ ] 5.1 Note open questions resolved (write hook file, turn.completed field meaning)
- [ ] 5.2 Link this OpenSpec change from precipitation task evidence
