# Closeout — ROE Judge Lightweight Loop Fix

Date: 2026-07-20

## Status

**completed** — 修复链、回归测试、live 真实委派 smoke 全部 PASS。

## Delivered

### 1. 报价专家 Skill 预加载改为按需调用

- Repo: `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`
- 删除 frontmatter `skills: [quotation-learn-by-data]`，停止每会话注入 13K 字符。
- Sidecar `quotation-agent.aionui.json` 仍保留 `skills.enabled: ["quotation-learn-by-data"]`，保证 `/learn-by-data` slash 与 Guid `+` 按需调用 `Skill(quotation-learn-by-data)` 时可用。
- Prompt 内仍显式声明 `Skill(quotation-learn-by-data)` 调用入口。
- `ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs` 新增 `learn-by-data is available on demand without preloading its full prompt` 契约。

### 2. ROE 自锚 + Skill 注入识别

- Repo: `ccb-installer/config/skills/ccb-subagent-gate/scripts/lib/parse_transcript_roe_judge.py`
  - `_is_real_user_message` 忽略 `isMeta`、`<command-message>/<skill-format>`、`<loaded-skill>`、`Base directory for this skill:`、`Stop hook feedback:`、`REJECT:` / `[ROE-GATE` 等 runtime 注入。
  - 新增 `_extract_handoff_user_text`，从 `<!-- WANd.HANDOFF.BRIEF.001 -->` Brief 中只取「用户原话」段作为锚点文本，避免 `upsert` / `写入` / `生成` 等 Skill 内部规则被错认为用户写意图。
  - `has_write_intent` 引入 `NEGATED_WRITE_RE`（`不要生成/写入…Excel|报价单|…`），防止“**未生成报价单**”这种澄清句被算作写意图。
  - 仍保留单层轻量熔断 `JUDGE_MAX_BLOCKS=1` + profile `max_blocks` override。
- `ccb-installer/config/skills/ccb-subagent-gate/scripts/validators/generic-roe-judge.sh`
  - 导出 `PYTHONIOENCODING=utf-8` 与 `PYTHONUTF8=1`，避免中文 Windows Git Bash 下 `UnicodeEncodeError: 'gbk'` 让 warn 模式哑火。

### 3. 回归覆盖

新增 fixture `tests/fixtures/transcripts/roe-live-lookup-with-preloaded-skill-and-hook-feedback.jsonl`（真实 transcript 7 行：Handoff Brief、Skill 预加载、助手正文、两次 Stop-hook 反馈）。

`tests/test_roe_judge_gate.py` 增加：

```text
test_runtime_meta_injections_do_not_create_write_intent
test_hook_reject_not_real_user  (升级)
```

`tests/test_roe_gate.py` 旧 `n5` 改为 `n1`，对齐单层熔断合同。

```text
test_roe_judge_gate.py  : 19 cases + shell integration PASS
test_roe_judge_realistic:  8/8 PASS
test_roe_gate.py         :  7/7 PASS
smoke-roe-judge-deploy  : 13/13 PASS (含 deployed py 与 repo SHA256 一致)
quotation-agent-output  : 4/4 PASS
```

### 4. Live 真实委派 smoke

```powershell
$env:CLAUDE_CODE_GIT_BASH_PATH='D:\Git\bin\bash.exe'
$env:CCB_TEST_TIMEOUT_MS='150000'
$env:CCB_TEST_PROMPT='查询 直接50 价格'
node ccb-installer\test-native-acp-agent.mjs
```

结果：

```text
[init]      claude-code 1
[session]   f914d7fa-6fde-442a-b4c4-d25455421eab minimax-m3
[prompt 1/1] 查询 直接50 价格
委派：Agent(quotation-agent) → 1× match_quotation + 1× suppliers_hybrid_match + 1× Agent (内层读 md)
完成后停机 101s
[assistant_text] "直接50"价格查询结果 | 8020020755 | 直通(管箍) PVC-U 排水配件 白色 dn50 | 1,219 | 个 | IDR
```

ROE log 自部署以来无新 `write_no_l2` 阻塞；新会话 transcript 三轮 ROE 全部 `pass / no_roe_scope / no_write_intent`。

## Gate evidence

| 校验 | 证据 |
|---|---|
| **frontmatter 移除预加载** | `quotation-agent.md` `git diff`：删除 `skills:\n  - quotation-learn-by-data`；sidecar `skills.enabled` 仍含 `quotation-learn-by-data` |
| **live 与 repo hash 一致** | `sha256` 全部匹配：`quotation-agent.md`、`parse_transcript_roe_judge.py`、`generic-roe-judge.sh` |
| **ROE 真实 transcript 回归** | `test_runtime_meta_injections_do_not_create_write_intent` PASS（基于真实委派 transcript 改写） |
| **真实 native ACP 委派** | `t_end_ms=101011`、completed_tools 含 `Agent` + 3 个 mcp_、assistant_text 含价格表、无 ROE 阻塞日志 |

## Spec/notes

- 行为变更在 `.trellis/spec/integration/agents-unified-model.md` § `learn-by-data skill` 与 `Universal ROE end_turn gate` 需补一段「Skill 注入与 Handoff Brief 排除」，本 PR 不动 spec，留到 `trellis-update-spec` 阶段。
- `cortex/planning/07-19-quotation-agent-prompt` 的 prompt 工作已部分并入 `quotation-agent.md`；该 task 状态仍为 `planning`，后续可由 `trellis-task-execution` 收口。
- 真实委派发现：内层 `Agent()` 仍偶发去读 `quotation-agent.md` 文件（多数场景是因为 SOP “必读知识库” 没在 Live 阶段做自动 Read）；本次未修，作为后续 ROE-only enforcement 时的观察点。

## Files changed

- `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`
- `ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs`
- `ccb-installer/config/skills/ccb-subagent-gate/scripts/lib/parse_transcript_roe_judge.py`
- `ccb-installer/config/skills/ccb-subagent-gate/scripts/validators/generic-roe-judge.sh`
- `ccb-installer/config/skills/ccb-subagent-gate/tests/test_roe_judge_gate.py`
- `ccb-installer/config/skills/ccb-subagent-gate/tests/test_roe_gate.py`
- `ccb-installer/config/skills/ccb-subagent-gate/tests/fixtures/transcripts/roe-live-lookup-with-preloaded-skill-and-hook-feedback.jsonl`
- `ccb-installer/scripts/smoke-roe-judge-deploy.ps1`
- `.trellis/tasks/07-19-roe-judge-lightweight-loop-fix/task.json`（status=completed）
