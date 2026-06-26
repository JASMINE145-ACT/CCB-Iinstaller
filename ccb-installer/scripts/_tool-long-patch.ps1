# Tool long descriptions (ReadMcpResource, TodoWrite; loadAgentsDir-BMosMfSG.js)
$chunkToolLongDesc = New-ReplacementMap
$chunkToolLongDesc[@'lXe=`Update the todo list for the current session. To be used proactively and often to track progress and pending tasks. Make sure that at least one task is in_progress at all times. Always provide both content (imperative) and activeForm (present continuous) for each task.`'@] = @'lXe=`更新当前会话的待办清单。应主动频繁使用以跟踪进度与待办。确保始终至少有一项为 in_progress。每项任务须同时提供 content（祈使句）与 activeForm（现在进行时）。`'@
$chunkToolLongDesc[@'LFt=`
Reads a specific resource from an MCP server.
- server: The name of the MCP server to read from
- uri: The URI of the resource to read

Usage examples:
- Read a resource from a server: \`readMcpResource({ server: "myserver", uri: "my-resource-uri" })\`
'@] = @'LFt=`
从 MCP 服务器读取指定资源。
- server：MCP 服务器名称
- uri：资源 URI

示例：
- 从服务器读取资源：\`readMcpResource({ server: "myserver", uri: "my-resource-uri" })\`
`'@
$chunkToolLongDesc[@'RFt=`
Reads a specific resource from an MCP server, identified by server name and resource URI.

Parameters:
- server (required): The name of the MCP server from which to read the resource
- uri (required): The URI of the resource to read
`'@] = @'RFt=`
从 MCP 服务器读取指定资源（按服务器名与 URI 标识）。

参数：
- server（必填）：要读取资源的 MCP 服务器名称
- uri（必填）：资源 URI
`'@
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkToolLongDesc
