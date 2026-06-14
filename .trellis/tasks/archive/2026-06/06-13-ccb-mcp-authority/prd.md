# CCB-Wanding MCP Authority In AionUI

## Goal

AionUI 的 MCP 页面打开后，展示的是 **CCB-Wanding 当前真实配置和真实加载状态的 MCP servers/tools**。AionUI 不再维护一套独立 runtime-authoritative MCP 配置。

## Requirements

- CCB-Wanding 暴露 MCP manifest：
  - server id/name
  - transport
  - enabled/status
  - tools list
  - auth/login state where available
  - load/test error reason
  - source: user / bundled / plugin / project / extension
- AionUI MCP 页面从 CCB-Wanding manifest 读取。
- AionUI add/edit/delete/import/test 操作写回 CCB-Wanding MCP 配置体系。
- AionUI conversation `mcp_server_ids` / `mcp_servers` / `session_mcp_servers` 快照来自 CCB-Wanding。
- AionUI legacy `mcp.config` 只能迁移或只读显示，不能作为运行时权威。

## Acceptance Criteria

- [x] CCB-Wanding 有可测试的 MCP manifest 生成器。
- [x] AionUI MCP 页面显示 CCB-Wanding MCP servers/tools。
- [x] AionUI 新增 MCP server 后，CCB-Wanding 新会话实际加载。
- [x] AionUI 删除/禁用 MCP server 后，CCB-Wanding 新会话不再加载。
- [x] MCP test/status 反映 CCB-Wanding 实际连接结果。
- [x] quotation MCP 主流程仍正常（CLI probe：`status=connected`，含 `match_quotation` 等 8 tools；AionUI 会话 smoke 待手工）。

## Out of Scope

- 不让 AionUI 自己直接决定 ACP session 的工具列表。
- 不复制 CCB-Wanding MCP loader 到 AionUI。
