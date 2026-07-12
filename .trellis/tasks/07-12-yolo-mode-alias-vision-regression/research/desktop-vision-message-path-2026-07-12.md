# Research — Desktop vision message path（2026-07-12）

> **Task:** `07-12-yolo-mode-alias-vision-regression`  
> **Date:** 2026-07-12  
> **Status:** diagnosed (code-path; live dump optional for confirm)

## Why

System-review：P0B 不能只靠 Manual smoke / 改 prompt；须证明图是否进入模型输入。

## Required evidence

| Field | How to capture | Result |
|-------|----------------|--------|
| `conversation_id` | UI / DB | *(live optional)* |
| `agent_id` / `ccb_assistant_profile_id` | conversation.extra / ACP log | default Guid → `wande-orchestrator` co-factor |
| Expected agent | 万鼎报价专家 `quotation-agent` | |
| Message has image/files parts? | send payload / ACP prompt dump | **AionCore emits text-only `ContentBlock`** — `data.files` ignored at `prompt_existing_session` |
| Temp path Read attempted? | View Steps `Read` on `%Temp%\aionui\` | secondary (fallback when no inline image) |
| Model id | session model | MiniMax M3 capable when pixels present |
| Vision capable? | MiniMax multimodal vs text-only | yes if image blocks arrive |
| User-visible denial | 「没有读取图片的能力」 | yes (WeCom 2026-07-12 incident) |
| Mode at send | preferredMode after normalize | P0A: `yolo`→`bypassPermissions` (unblocks Read fallback) |
| Live Route-B dist | `promptToSubmitInput` | **present** in `D:\CCB-Wanding\dist\chunk-bsywjp5z.js` |

## Path (verified in source)

```text
Guid attach PNG → files: string[] + [[AION_FILES]] text
  → POST /messages { content, files }
  → AionCore AcpAgentManager.prompt_existing_session
       PromptRequest { prompt: [ContentBlock::from(content)] }  // TEXT ONLY
       // data.files NEVER converted to ContentBlock::Image
  → Route-B promptToSubmitInput(prompt)
       // no type:image → plain string → model has no pixels
  → false denial / Read-on-Temp (needs permission)
```

## Root-cause one-liner

```text
(B) image not in ACP message: AionCore prompt_existing_session ignores SendMessageData.files and only sends ContentBlock::from(content); Route-B promptToSubmitInput is already correct when image chunks exist. Co-factor (A) default wande-orchestrator + (mode) yolo→Read deny stacked on WeCom incident.
```

## Fix pointer (Phase 2b)

`AionCore/crates/aionui-ai-agent/src/manager/acp/agent_session_flow.rs` — build prompt blocks = text + base64 `ContentBlock::Image` for image extensions in `data.files` (size-capped). Unit-test helper. Deploy AionCore; Guid smoke PNG 识图.

Do **not** greenfield-rewrite WeCom inbound (P1 verify only).
