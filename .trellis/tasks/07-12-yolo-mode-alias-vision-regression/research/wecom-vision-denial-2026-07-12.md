# Research — WeCom 截图假否认识图（2026-07-12 07:03）

> **Task:** `07-12-yolo-mode-alias-vision-regression` Phase P1  
> **Date:** 2026-07-12  
> **Status:** diagnose (Scenario C) — **verify-first；禁止 greenfield rewrite inbound**

## Symptom (user WeCom thread)

- User「嘉诚」发图 +「提取图片信息」给报价专家会话。
- Agent 先正常查价/填单（工具链可用）。
- 后对截图回复：
  - 「我没有读取图片的能力，无法查看您刚发的截图内容」
  - 「没有图片识别能力…两张企业微信截图无法直接读取」

对比：同日桌面 Guid + MiniMax M3「提取图片内容」**PASS**（P0B `prompt_attachments`）。

## Path (source)

```text
WeCom image
  → inbound-media download → wecom-inbound temp
  → attachments → UnifiedAttachment.url
  → AionCore files[] + [[AION_FILES]]
  → build_acp_prompt_blocks → ContentBlock::Image
  → Route-B promptToSubmitInput → MiniMax
```

Guid PASS 证明 **ACP 下游已通**。企微失败应在 **files 未进 / 被 skip**，不是 MiniMax 无能。

## Ranked hypotheses

| # | Hypothesis | Next evidence |
|---|------------|---------------|
| H1 | 入站 attachments 空 → 仅 `[图片]` 文本 | extension log `saved` vs fail；inbound 文案 |
| H2 | `files` 有但 >5MB / 扩展名非 png|jpeg|gif|webp → inliner skip | file size + ext under `%LOCALAPPDATA%/CCB-Wanding/wecom-inbound` |
| H3 | 运行中 extension 树过旧 / client null | dual-tree hash + which tree loaded |
| H4 | 发图早于 AionCore P0B 部署 | timeline vs deploy |

## Required live capture (one WeCom 发图)

1. Chat visible text: `[用户发送文件]…` vs `[图片]` vs `[文件接收失败]`
2. Extension: `[ext-wecom-aibot] inbound-media` event
3. Disk file under `wecom-inbound` (size, ext)
4. AionCore: `file_count > 0`
5. Optional: ACP prompt has `type:image`

## Fix policy

- **Verify first**（checklist in `wecom-media-in-verification-2026-07-12.md`）
- Patch only after H1/H2 locked； **no** rewrite `inbound-media.js` from scratch
- Align 5MB inliner vs 20MB inbound only if evidence shows size skip

## One-liner (provisional)

```text
(H1/H2) WeCom pixels never reach build_acp_prompt_blocks — empty attachments or skipped files — while Guid already supplies <5MB PNG paths into the same ACP inliner.
```
