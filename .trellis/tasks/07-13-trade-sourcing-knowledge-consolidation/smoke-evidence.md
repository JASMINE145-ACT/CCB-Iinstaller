# Smoke evidence

| Step | Contract | Result | When |
|------|----------|--------|------|
| 1 | DUAL.001 | PASS（用户 Guid：土工布价+货源；双林地址） | 2026-07-13 |
| 2 | PRECIPITATE.001 | PASS（用户确认 learn-by-data A/B/C/D） | 2026-07-13 |
| 3 | KB.CANONICAL.001 / LAYER1.SCHEMA.001 | **PASS（slug1）** — UI Save + shadow sync 已核验；CONF ⚠️ 仍保留在中心稿 | 2026-07-14 |

供应商独立 Agent 已移除（见 `p1c-remove-supplier-agent-done.md`）。

---

## Step 3 证据（UI Save 后）

| 字段 | 值 |
|------|-----|
| CONF-001 结论 | **未定稿** — 中心稿保留 §4.1–4.2（D）与 §4.6（A）+ ⚠️；用户选择先 Save（选项 3） |
| CONF-002 结论 | **未定稿** — 150→dn160 仍标 ⚠️ |
| Pre-Save Python expansion | rules≥10（repo seed）；Save 后 shadow `_parse…` → **15** |
| Center slug | `wanding_business_knowledge` |
| Center version（Save 后） | **14**（`get_doc` → `org-api`） |
| Shadow path | `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` |
| Shadow `.org-meta.json` version | **14**（`wanding_business_knowledge.md.org-meta.json`，synced 2026-07-14 00:22） |
| versions 一致？ | **yes** |
| 新 Guid 询价（多候选） | 用户口头「搞定」；未另记询价原文 |
| §8 引用原文？ | 未单独核验（结构已含 §8） |
| 本轮完成口径 | **slug1 only**（7 slug deferred） |
| KB.CANONICAL.001 | **PASS（slug1 publish）** |
