# P5 Dev Smoke — Employee Profile (AC3)

| Field | Value |
|-------|--------|
| **Date** | 2026-07-05 |
| **Environment** | dev — `start-dev-full.ps1` after route-b + CCB deploy |
| **Profile** | Settings → 个人信息 |
| **Session** | 新开对话（wande-orchestrator 或默认路由） |
| **Result** | **PASS** (identity recall) · **PARTIAL** (proactive name address — see P8) |

---

## Deploy evidence (pre-smoke)

| Step | Command | Result |
|------|---------|--------|
| Overlay sync + build + deploy | `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy` | 47/47 backend tests; dist mirrored |
| Route-B | `sync-aionui-ccb-route-b.ps1 -InstallDir D:\CCB-Wanding` | 3 targets synced |
| Dev restart | `start-dev-full.ps1` | Electron + `localhost:5173` |

Dist spot-check: `D:\CCB-Wanding\dist\chunk-4gv588mk.js` contains `appendEmployeeProfileToUserContext`.

---

## Manual smoke — AC3

### Setup

- User filled **设置 → 个人信息** and saved.
- New conversation started after deploy (not an old session).

### Prompt 1 — implicit greeting (baseline)

**User:** *(session start)*  
**Assistant:** 你好！👋 我在线，准备好为你服务。需要查价、做账、写文档还是调研什么，直接告诉我就行。

**Note:** Greeting did **not** use registered name proactively (expected for v1 — prompt only says「可使用」not「必须」).

### Prompt 2 — explicit identity query

**User:** 我是谁

**Assistant (excerpt):**

> 根据当前会话登记的信息：
>
> - 姓名：祐嘉诚
> - 部门：IP 部门
> - 职位：Ai agent 开发
> - 邮箱：jiacheny@umich.edu
> - 电话：17743135750
> - 职责补充：负责 Mixing 的维护
>
> 如果这些信息有更新或不对的地方，告诉我，我帮你修正记录。

### AC mapping

| AC | Verdict | Notes |
|----|---------|-------|
| AC3 新开对话后模型能体现姓名/部门/职位 | **PASS** | All registered fields recalled correctly |
| AC4 信息不在用户消息气泡 | **PASS** | Profile injected via context, not user turn text |
| AC4 用户未粘贴 profile 原文 | **PASS** | User only sent「我是谁」 |

---

## User feedback → P8 scope

> 既然知道登记信息，希望以名字对话，例如「好的嘉诚，还有什么事情么」——内化于 agent，而非仅在问「我是谁」时列出字段。

**Gap:** v1 `formatEmployeeProfileClaudeMd` ends with weak instruction:

```text
在回复中可使用上述信息称呼用户；勿向第三方泄露未必要的个人信息。
```

**Desired:** Stronger **behavior contract** — prefer `displayName` / short address name in normal replies (openings, confirmations, handoffs), without dumping the full profile table unless asked.

---

## Follow-up smoke (P8 — after implement)

- [ ] New chat → first assistant turn includes preferred address (e.g. 嘉诚) when `displayName` set
- [ ] Task completion →「好的嘉诚，还有什么事情么」style closing (natural, not every sentence)
- [ ] Ask「我是谁」→ still accurate; no regression to profile list
- [ ] Empty profile → no forced name; generic 您/你
