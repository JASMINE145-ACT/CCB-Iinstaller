# Execution Plan 鈥?`07-15-kb-mutate-conversation-ux`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Approved** | 2026-07-15 鈥?user 銆屾墽琛屻€?|
| **Scenario** | **A**锛堜骇鍝?UX + 鏉冮檺瀵归綈锛涘惈 C 鎴愬垎锛歴pec/RBAC 涓嶄竴鑷达級 |
| **Plan depth** | Standard |
| **Verification profile** | Standard + UI |
| **Active phase** | Phase 5 鈥?Guid hand smoke pending |
| **Repos** | ccb-installer锛圠1锛? python/admin + `.trellis/spec/integration`锛? 鍙€?aionui-src UI 鎻愮ず锛岄潪蹇呴』鍚?PR锛?|
| **Parent** | `07-14-kb-business-completeness` |
| **Doctrine** | UI 鍙樊寮傦紱**涓氬姟 mutate 閫昏緫蹇呴』澶嶅埢**锛坋nvelope / error / RBAC / locator / budget锛?|

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Standard plan + contract doctrine |
| trellis-before-dev | Read: | integration index 鈫?org-knowledge + org-mutate-ux |
| skill-selection.md | Read: | Scenario A锛汻eview=code-reviewer锛汿DD=superpowers discipline |
| Agent: explore | Agent: | delete gate = env-only锛堟棤 JWT admin锛夛紱append/delete 璇嶈〃锛沀I PUT 鏃?MCP gate 鈥?[explore](02af2b6b-2ecf-4b52-9ce5-fe5be871797a) |
| Incident transcript | User: | ok 琚嫆锛涚‘璁ゅ悗 append OK锛沝elete FORBIDDEN锛涗腑鏂?绻佺悙 |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | **done** | capability + root-cause + task created |
| Plan lint | **PASS** | lint_execution_plan.py |
| Phase 0+ | **in progress via銆屾墽琛屻€?* | see Progress below |

## Phase -1 鈥?Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm | available锛圧ead锛?| prd.md 宸插啓 |
| Research | explore锛坉one锛?| available | main-session Grep |
| Implementation | inline / trellis-implement | available | main session |
| Review | code-reviewer | available | Trellis check |
| TDD | unittest + L1 | available | 鈥?|
| Security | light锛圧BAC锛?| available | security-review if JWT claims change |

**Plan depth:** Standard 路 **Risk tags:** `ui` 路 `security`锛坥rg write ACL锛?

## Problem 鈫?root cause锛坰ession findings锛?

| User symptom | Root cause | Evidence |
|--------------|------------|----------|
| 涓柇 | Mutate 鏈氨瑕佸仠绛夌‘璁わ紱鍒犱晶缂?append 鍚岃疆鍚堟垚纭害鏉燂紱鍘嗗彶銆屾垱鐒惰€屾銆嶄粛鍙兘鍥炲綊 | `org-knowledge.md` 搂 Preview UX锛汱1 浠?append 鏈夌‖鍧?|
| 绻佺悙 | 璇嶈〃杩囩獎锛堜粎銆岀‘璁?鍚屾剰銆嶏級锛涙嫆 `ok`锛涘垹鎰忓浘銆屽垹闄ゃ€嶄粛浜屾杩介棶锛涘杞杩?| `quotation-agent.md` L137 |
| 鍒犱笉鎺?| `can_apply_knowledge_delete` **涓嶈 JWT**锛涘彧 flag / test-slug / `ORG_KNOWLEDGE_DELETE_IS_ADMIN` | `python/admin/org_knowledge_mutate.py` |
| 锛堝啀鎸栵級鍐欏垹/UI 涓嶅绉?| Append 浠绘剰 JWT apply锛汥elete env 閿侊紱`#/org-knowledge` PUT 浠绘剰鐧诲綍鍙叏鏂囨敼 | UI `orgHttpPut` vs MCP gate |
| 锛堝啀鎸栵級娴嬭瘯璇激鐢熶骇 | Guid 榛樿 prod slug锛泂moke 鏂囨。璇寸敤 test slug | parent plan Manual smoke |
| 锛堝啀鎸栵級FORBIDDEN 鑻辨枃杩愮淮鑵?| client message 纭紪鐮?EN | `org_knowledge_client.py` |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.ORG.MUTATE.UX.001`锛坋xtend锛?| preview鈫抍onfirm鈫抋pply锛?*delete 鍚岃疆棰勮鍚堟垚**锛汧ORBIDDEN 鍙仮澶嶆枃妗?| `org-mutate-ux.md` + L1 | Guid test-slug / unit message | `ui` |
| `WANd.ORG.MUTATE.CONFIRM.001`锛?*new**锛?| 鍏抽棴纭璇嶈〃锛氳偗瀹氾紙纭/鍚屾剰/ok/濂界殑/鍙互/鏄級锛涜澧冨唴銆屽垹闄ゃ€嶃€岃惤搴撱€嶏紱鎷掔粷鏀瑰唴瀹?鍙栨秷 | `quotation-agent.md` + 鍙€?`confirm_vocab` helper | L1 鏍蜂緥琛?+ 鍙€?unit 鑻ユ娊鍑芥暟 | `ui` |
| `WANd.KB.MCP.DELETE.001`锛坈omplete P1-RBAC锛?| Apply 涓?**JWT admin / write capability** 瀵归綈锛涗笉鍐嶈皫绉?admin 鍗村彧鐪?env | `org_knowledge_mutate.py` + JWT decode shared | unit锛歮ock claims锛沺rod 鏃犺鑹蹭粛 FORBIDDEN | `security` |
| `WANd.ORG.MUTATE.PARITY.001`锛?*new provisional**锛?| UI 涓?MCP锛?*鍚屼竴鍐欐潈闄愯涔?*锛堟枃妗?鏈€灏忓疄鐜帮細MCP delete 涓嶅急浜?涓嶅弽鍚戜簬 REST锛夛紱UI 鍙棤 envelope | spec 瀵圭収琛紱鍙€?REST capability 妫€鏌?backlog | docs + unit gate matrix | `security` |

## Workstreams

| Phase | Pri | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|-----|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | P0 | Spec + registry + parent backlog 寮曠敤 | CONFIRM.001 路 PARITY.001 路 UX.001 | docs | trellis-update-spec style | `org-mutate-ux.md` `org-knowledge.md` registry | contract cards | Fast |
| 1 | P0 | Confirm vocab L1锛坅ppend+delete 鍏辩敤锛?| CONFIRM.001 | ui | TDD discipline 鈫?edit L1 | `quotation-agent.md` (+ deploy ForceMd) | 璇嶈〃 + 绂佹杩囪拷闂?| UI |
| 2 | P0 | Delete 鍚岃疆 preview 纭害鏉?+ FORBIDDEN 涓枃鎭㈠ | UX.001 | ui | L1 + client message | agent md 路 `org_knowledge_client.py` | 鍚岃疆鍚堟垚锛涘彲璇绘嫆缁?| UI |
| 3 | P0 | JWT admin / write capability 鐪熸鎺ュ叆 delete gate | DELETE.001 | security | TDD RED鈫扜REEN | `org_knowledge_mutate.py` + session claims helper | unit PASS锛沘dmin 鍙垹 | Standard |
| 4 | P1 | Parity 鏂囨。 +锛堣嫢浣庢垚鏈級REST 涓?MCP 闂ㄧ瀵圭収锛沀I 宸紓鐧藉悕鍗?| PARITY.001 | security | docs / optional thin check | `org-mutate-ux.md` 搂Parity | 瀵圭収琛?| Fast |
| 5 | P0 | Verify | all | ui | code-reviewer 鈫?unittest 鈫?Guid test-slug | smoke-evidence | PASS | UI |
| 鈽?| 鈥?| Incident 娓呮畫 | docs-only | 鈥?| 浜哄伐 / UI 鎴?gated delete | prod block `f32f0e87002f` | 宸插垹璇佹嵁 | Manual |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Phase 3 delete RBAC | DELETE.001 | 鏃?JWT claims 鏃?mock admin 浠?FORBIDDEN锛堢幇鐘堕攣锛夆啋 鏂版祴鏈熸湜 PASS | `python -m unittest python.admin.test_org_knowledge_mutate`锛? claims fixtures锛?| 鏃犺鑹?+ prod slug 浠?FORBIDDEN |
| Phase 2 messages | UX.001 | 鏂█ EN-only gate string锛堟敼鍓嶉攣瀹氾級鈫?涓枃 + code | 鍚?unittest / snapshot | error_code 浠?`FORBIDDEN` |
| Phase 1 vocab | CONFIRM.001 | N/A 绾?L1 鈥?RED=瀵圭収琛ㄧ己澶憋紱鐢?checklist | `deploy-seed-agents -ForceMd` + Guid 鎵嬫祴 `ok` 閫氳繃 | 鏃?preview 绂佹 confirmed=true |
| Phase 4 parity | PARITY.001 | N/A docs 鎴栭棬绂佺煩闃垫祴 | 鏂囨。 diff + 鍙€?matrix unit | append 琛屼负涓嶉潤榛樻墿鏉?|

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| CONFIRM.001 | Guid锛氶瑙堝悗鍥?`ok` 鈫?钀藉簱锛坱est slug锛?| 瀵硅瘽鎽樿 / smoke md | pending hand |
| UX.001 delete preview | Guid锛氬垹棰勮鍚岃疆瑙?`preview_before`锛汧ORBIDDEN 涓枃 | smoke | unit ZH **PASS**锛汫uid pending |
| DELETE.001 admin JWT | unit +锛堝彲閫夛級admin Guid 鍒?test 鍧?| unittest **17/17 PASS** | **PASS** (unit) |
| PARITY.001 | spec 搂Parity 瀵圭収琛?landed | md + registry | **PASS** |
| plan structure | lint_execution_plan.py | PASS | **PASS** |

## Verification profile and gate

**Selected:** Standard + UI

1. Contract Verification锛堜笂琛級
2. **code-reviewer**锛堜富瀹★紱瑙?RBAC 鈫?Security note锛?
3. `python -m unittest 鈥rg_knowledge_mutate` + dispatch if touched
4. `trellis-update-spec` 鈫?org-mutate-ux / org-knowledge / registry
5. `deploy-seed-agents.ps1 -ForceMd` + **鏂?Guid**
6. 鎵嬫祴锛?*浼樺厛 `wanding_business_knowledge_test`**
7. finish-work锛堢敤鎴风‘璁ゅ悗锛?

## Parallelization

涓嶉粯璁?Scenario D銆傝嫢鎷嗭細Agent A=L1 璇嶈〃/鍚堟垚锛汚gent B=JWT gate 鈥?**绂佹**鍚屾椂鏀?`org_knowledge_mutate.py` + 鏃犵害瀹氱殑 client 鏂囨鍐茬獊锛涗覆琛屽悎骞?B鈫扐銆?

## Manual steps (human)

- [ ] 鎵瑰噯鏈鍒掑悗璇淬€屾墽琛屻€?
- [ ] Guid smoke锛坱est slug锛夛細append 鈫?`ok` 鈫?apply锛沝elete 鈫?`鍒犻櫎`/`纭` 鈫?apply
- [ ] 鏃犳潈闄愯处鍙凤細delete apply 鈫?涓枃 FORBIDDEN锛屼笉姹℃煋
- [ ] 娓呯悊鐢熶骇娈嬬暀 `test` 鍧楋紙incident锛夆€?UI 鎴栨湰浠诲姟鍚庨棬绂佸悗涓€娆″垹
- [ ]锛堝彲閫夛級瀵圭収 `#/org-knowledge` 淇濆瓨锛氭潈闄愯涔変笌 MCP 涓€鑷磋鏄庡彲璇?

## Recovery and re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| JWT claims 褰㈢姸鏈煡 / 涓嶇ǔ | Phase 3 research | `research/jwt-admin-claims.md` | 鑻ユ敼 auth 妯″瀷 鈫?yes |
| 銆屽彇娑堜簩娆＄‘璁ゃ€嶅帇鍔?| Phase 0 | 鎷掞紱鍙墿璇嶈〃 | yes if scope 鍙?|
| UI 寮哄埗鍚屼竴鎺т欢 | Phase 4 | doctrine锛歎I 鍙樊寮?| no if 浠呮枃妗?|
| Parent Phase 4 鍐茬獊 | note | 鍏变韩 smoke 鏂囦欢浜掗摼 | no |

## Defer / out of scope

- 鍙栨秷 preview 闂?
- `update_business_rule` MCP
- 渚涘簲鍟?delete锛圥hase S锛?
- PostToolUse 寮哄埗鍚堟垚 hook锛圥2锛氳嫢 L1 浠嶄笉绋冲啀寮€锛?

## Design notes锛堢‘璁よ瘝琛ㄨ崏妗?鈥?寰呮壒锛?

**Accept锛坅pply锛夛細** `纭` `鍚屾剰` `钀藉簱` `纭鍐欏叆` `纭鍒犻櫎` `鍒犻櫎`锛堜粎 delete 棰勮鎸傝捣鏃讹級`ok` `OK` `濂界殑` `鍙互` `鏄痐 `鎵ц`锛堢‘璁ゅ凡鎴愮珛鍚庣殑淇冨彂锛?

**Reject / re-preview锛?* 鏀规枃妗堛€佸彇娑堛€佹崲 slug銆佸惈绯婇棽鑱?

**涓€杞師鍒欙細** 棰勮鍥炲悎灞曠ず鍏ㄦ枃 鈫?鐢ㄦ埛涓€杞偗瀹?鈫?`confirmed=true`锛涚姝€宱k 涓嶇畻锛屽啀纭涓€娆°€嶃€?

