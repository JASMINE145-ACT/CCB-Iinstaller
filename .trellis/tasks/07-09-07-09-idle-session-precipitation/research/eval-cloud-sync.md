# Eval 云端同步 — 方案说明

**Task:** `07-09-idle-session-precipitation` Lane 4  
**Date:** 2026-07-09

## 现状（已实现）

Inbox 批准 `eval_case` 后：

1. 审计：`%LOCALAPPDATA%/CCB-Wanding/.claude/learning/eval_precipitation_promoted.jsonl`
2. 共享库：`claude-code-best/eval/agent_eval_cases.jsonl`（若 dev 能解析到 installer 根目录）

这是团队 **eval 回归的唯一权威源**（见 `eval/README.md` + CI `node eval/run-agent-eval.mjs`）。

## 「云端」在本项目指什么

| 层级 | 含义 | 状态 |
|------|------|------|
| **Org VPS** | `ORG_SERVER_URL` 上的 aioncore | 已有 org-knowledge / work-tasks；**尚无** `/api/eval-cases` |
| **Git 共享** | 仓库 `eval/agent_eval_cases.jsonl` push → 全员 CI | **推荐 P2 路径** |
| **Neon/DB** | 未用于 agent eval | 不用 |

沉淀 Inbox 批准 ≠ 自动 push git（需人工 PR 或 bot）。

## 推荐做法（P2 可操作）

### 路径 A — Git 即云端（零新 API）

```text
Inbox approve eval_case
  → append agent_eval_cases.jsonl（本地 monorepo）
  → 开发者 git commit + push
  → CI: node eval/run-agent-eval.mjs --suite smoke
```

可选自动化脚本（未实现）：

```powershell
# 伪代码：从 learning 审计合并到 eval 并开 PR
python scripts/merge-precipitation-eval.py
git add eval/agent_eval_cases.jsonl
gh pr create --title "eval: precipitation cases from inbox"
```

### 路径 B — Org API（P3，需 AionCore 新 crate）

若要把 eval 放到 org VPS（与 knowledge 同级）：

1. 新表 `org_eval_cases` + REST `GET/POST /api/org-eval-cases`
2. AionUI `ipcBridge.orgEval.*` 镜像 `orgKnowledge`
3. `decidePrecipitationProposal` eval 分支改 POST org API
4. `run-agent-eval.mjs` 增加 `--source org` 拉取

**工作量：** 新 crate + migration + UI + runner — 独立 task。

### 路径 C — 仅 VPS 文件同步

把 `eval/agent_eval_cases.jsonl` 挂到 org 服务器 seed 目录（类似 org-knowledge seed）— 只读分发，写入仍走 git。

## 去重建议（eval）

批准前检查：

- 同一 `input` normalize 后是否已有 case id
- 已有则 link + comment，不新增 id

可在 `ccbPrecipitation.ts` `applyApprovedEvalCase` 加读全文件 dedup（P2 follow-up）。

## 与沉淀 worker 的关系

- **提取：** LLM Lane 4 → pending only  
- **晋升：** 人批 → local jsonl + repo eval  
- **云端：** git push / 未来 org API — **不在 worker 内 silent push**
