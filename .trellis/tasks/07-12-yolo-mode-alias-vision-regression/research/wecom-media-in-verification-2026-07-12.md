# Research — WeCom MEDIA.IN verification（非从零实现）

> **Task:** `07-12-yolo-mode-alias-vision-regression` Phase 3  
> **Date:** 2026-07-12  
> **Status:** code presence verified；live smoke pending

## System-review correction

旧 explore / 早期 research 写「text-only」**已过时**。

| Tree | Evidence |
|------|----------|
| `aionui-src/examples/ext-wecom-aibot/channels/inbound-media.js` | `downloadFile` + `resolveInboundAttachments` |
| `aionui-src/examples-wecom-dev/ext-wecom-aibot/...` | 同上 |
| `sdk-runtime.js` | `client.on('message.image', …)` |
| `.trellis/spec/integration/wecom-channel.md` | Inbound image/file: **implemented (P1)** |

**本 task P1 动作：** verify + dual-tree sync + AionCore attachments/files 证据 + live smoke。  
**禁止：** 重写 inbound-media / 当 greenfield 再实现一遍。

## Verification checklist

| Step | Check | Status |
|------|-------|--------|
| 1 | Dual-tree `inbound-media.js` / `sdk-runtime.js` hash or diff equal（或 intentional delta documented） | **PASS** inbound-media SHA256 equal（2026-07-12） |
| 2 | Unit: inbound image → attachments（existing wecom tests） | pending |
| 3 | AionCore / channel → `SendMessageRequest.files` / agent files[] | pending（live `file_count`） |
| 4 | Live WeCom：发图 → agent 可读（非仅 `[图片]`） | **FAIL** RED 07:03 假否认 — see `wecom-vision-denial-2026-07-12.md` |
| 5 | Spec 三分表：implemented / unit-tested / live-smoked | pending |

## Gap policy

若某环缺失 → **最小补丁** 或 **并回 `07-05`**；不在本 task 扩大为 Mode A / outbound。
