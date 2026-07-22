# Integration Docs (AionUI ↔ aioncore ↔ CCB-Wanding)

> Read these when changing the **boundary** between AionUI and the backend chain. For pure UI work, see [`../frontend/index.md`](../frontend/index.md) instead.

---

## When to read which doc

| You are touching… | Read |
|-------------------|------|
| route-b patch (`ccb-installer/patches/aionui-ccb-route-b/`) | [`route-b-sync.md`](./route-b-sync.md) |
| `D:\CCB-Wanding\dist\` rebuild / claude-code-B source | [`../backend/index.md`](../backend/index.md) + [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) |
| ACP / MCP / permission event correctness | [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md) + [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) |
| CCB authority config ownership (skills, MCP, commands, assistants) | [`aionui-config-inventory.md`](./aionui-config-inventory.md) |
| Cross-layer latency / warmup / session id issues | [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) § CCB session warmup + § idle agent |
| CCB assistant profile handoff (preset cards → CCB sessions) | [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) § CCB assistant profile handoff |
| Adding a defensive fix to renderer / chatLib | [`defensive-fix-policy.md`](./defensive-fix-policy.md) — must include `// TODO(defensive)` |
| **Adding a new AionCore crate** (work-tasks / org-knowledge / price-library / …) | [`aioncore-work-tasks.md`](./aioncore-work-tasks.md) § AionCore Development Model — self-built fork is primary; next migration = 018 |
| **Org price library** (API + AionUI read-only MVP) | [`price-library.md`](./price-library.md) — incl. **LKG pollution** vs **expected** org_knowledge 401 / AOL degradations (§ Dev / smoke triage) |
| **外购无码库存映射 CODE_MAP**（Accurate 有货/价库无码） | [`uncoded-inventory-map.md`](./uncoded-inventory-map.md) — jsonl 落点、enroll 证据、禁未接线 `search_inventory`；task `07-14-uncoded-inventory-ai-assist` |
| **Org supplier directory** (factories + vehicles; ≠ price-library `supplier` column) | [`supplier-directory.md`](./supplier-directory.md) |
| **打包 / 发版 / NSIS / build-wanding**（安装包、seed、bootstrap、`$shipScripts`） | **先读** [`wanding-release-standard.md`](./wanding-release-standard.md)（§0 · §2.3 · §5.5 · §6.8–6.9 · §10）+ [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md)（运行时闭包）；再跑构建。Cursor：`.cursor/rules/wanding-release-packaging.mdc`；playbook Scenario **J** |
| **Org knowledge agent write** (append MCP, shadow read-only, **preview UX**) | [`org-knowledge.md`](./org-knowledge.md) § Agent write path + § Preview UX (2026-06-29) + Common mistakes |
| **Org Mutate UX** (统一 preview→apply→audit；知识库 delete/预算首实现) | [`org-mutate-ux.md`](./org-mutate-ux.md) — `WANd.ORG.MUTATE.UX.001`；task `07-14-kb-business-completeness` |
| **Word DocumentSpec / MCP 宏渲染边界**（word-creator MCP-only；Gate S/R） | [`word-mcp-skill-boundary.md`](./word-mcp-skill-boundary.md) — task `07-16-word-skill-mcp-granularity` |
| **VPS org API deploy** (knowledge + price + work-task routes) | [`../../../scripts/org-phase0/vps-org-api-deploy-checklist.md`](../../../scripts/org-phase0/vps-org-api-deploy-checklist.md) |
| **AionCore SQLite multi-statement tx** (`pool.begin`, not raw BEGIN on pool) | [`aioncore-sqlite-transactions.md`](./aioncore-sqlite-transactions.md) |
| **Org admin user list / delete ACL** | Task contract [`.trellis/tasks/07-13-07-13-org-admin-user-management/admin-rbac-contract.md`](../../tasks/07-13-07-13-org-admin-user-management/admin-rbac-contract.md) §2 / §2.1 |
| **Agent team — main vs subagent calling model**（路由、Guid 直连、委派、`Agent()`、hooks 总览；**View Steps 平铺 vs 运行时嵌套**见 § UI observability） | [`agent-team-architecture.md`](./agent-team-architecture.md) — entry map; deep dive [`agents-unified-model.md`](./agents-unified-model.md) |
| **Work Routing vs Execution**（谁干活 vs 怎么跑；改 guard 不误伤 hook/ROE） | [`work-routing-execution-contracts.md`](./work-routing-execution-contracts.md) — decision tree + [`contracts/agent-runtime-registry.yml`](./contracts/agent-runtime-registry.yml); task `07-09-work-routing-execution-contracts` |
| **Subagent delivery gate / ROE / Gate-J** | [`agents-unified-model.md`](./agents-unified-model.md) § Subagent delivery gate, § Universal ROE, § Multi-candidate reply |
| **Quick hook map** (which agent has which hook, dev-repo vs product layer) | [`agent-hooks-overview.md`](./agent-hooks-overview.md) — 1-page index; deep dive still in `agents-unified-model.md` |
| **Guid / sidebar / Team assistant catalog**（侧栏 emoji + 创建团队 Leader 列表） | [`agents-unified-model.md`](./agents-unified-model.md) § Sidebar avatar fix, § Team / conversation catalog unification (2026-06-29); [`../frontend/file-map.md`](../frontend/file-map.md) §7 |
| **Quotation 多候选选型回复**（1 推荐 + bullet，禁止默认大表） | [`agents-unified-model.md`](./agents-unified-model.md) § Quotation multi-candidate reply; maint [`../../data/ccb-wanding-quotation.md`](../../data/ccb-wanding-quotation.md) §选型与澄清 |
| **Quotation 模糊匹配 / 评分引擎**（字段匹配核心算法、双路召回） | [`../backend/quotation-matching-engine.md`](../backend/quotation-matching-engine.md) |
| **Quotation 多档查价 / 档位含义**（`get_product_price_tiers` + Read `data.Md`） | [`price-library.md`](./price-library.md) § Multi-tier query + `data.Md` read hook; agent SOP `ccb-installer/config/agents/quotation-agent.md` |
| **Platform vs vertical packages** (tenant, `com.wanding.trade`, P0–P4) | [`platform-vertical-packages.md`](./platform-vertical-packages.md); design [`../../../docs/platform-system-business-decoupling-optimization.md`](../../../docs/platform-system-business-decoupling-optimization.md); epic `.trellis/tasks/07-03-platform-business-decoupling` |
| **Daily dev: path ownership + change classification** (platform / business / mixed) | [`platform-business-boundary-map.md`](./platform-business-boundary-map.md) — decision tree + directory map; audit `.trellis/tasks/07-05-platform-business-architecture-separation/research/` |
| **P0 forbidden coupling / no WanD in platform src** | [`platform-forbidden-coupling.md`](./platform-forbidden-coupling.md) |
| **Package / tenant / capability IDs** | [`platform-identity-schema.md`](./platform-identity-schema.md) |
| **Package manifest / read-only registry** | [`package-manifest-schema.md`](./package-manifest-schema.md) |
| Layer 1 (desktop) only | You do not need this index. Go to [`../frontend/index.md`](../frontend/index.md). |

## Project strategy (5 lines)

> Full version lives in [`../outline.md`](../outline.md) (Primary strategy / Rule 0).

1. **ACP / MCP / session bugs** → fix in `D:\claude-code-B\src/` (source), not in AionUI
2. **Pure UI / UX / hotkey** → fix in `packages/desktop/src/`
3. **route-b patch + sync script** → permanent integration glue (Layer 3)
4. **Desktop defensive fix** → only when backend fix is in flight; mark with `// TODO(defensive)` and target removal
5. **When unsure** → read `../outline.md` (Primary strategy / Rule 0) first
