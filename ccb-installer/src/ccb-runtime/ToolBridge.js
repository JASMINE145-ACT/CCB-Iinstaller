/**
 * @param {import('./McpTransport.js').McpTool[]} mcpTools
 * @returns {import('./ModelClient.js').AnthropicTool[]}
 */
export function toAnthropicTools(mcpTools) {
  return mcpTools.map(t => ({
    name: t.name,
    description: t.description || '',
    input_schema: t.input_schema || t.inputSchema || { type: 'object', properties: {} },
  }))
}
