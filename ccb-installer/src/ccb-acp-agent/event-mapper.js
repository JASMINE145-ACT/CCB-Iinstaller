/**
 * Map ccb-runtime events → ACP sessionUpdate notifications.
 * @param {import('@agentclientprotocol/sdk').AgentSideConnection} client
 * @param {string} sessionId
 * @param {import('../ccb-runtime/AgentLoop.js').RuntimeEvent} ev
 */
export async function mapRuntimeEvent(client, sessionId, ev) {
  switch (ev.type) {
    case 'text_delta':
      if (!ev.text) return
      await client.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: ev.text },
        },
      })
      break

    case 'tool_call_start':
      await client.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: ev.id,
          title: ev.name,
          kind: 'other',
          status: 'in_progress',
          _meta: {
            claudeCode: {
              toolName: ev.name,
              toolInput: ev.input ?? {},
            },
          },
        },
      })
      break

    case 'tool_result':
      await client.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: ev.toolUseId,
          status: ev.isError ? 'failed' : 'completed',
          content: ev.text
            ? [{ type: 'content', content: { type: 'text', text: ev.text } }]
            : undefined,
          _meta: { claudeCode: { toolName: ev.name } },
        },
      })
      break

    case 'turn_end':
      if (ev.usage) {
        await client.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'usage_update',
            used: (ev.usage.input_tokens || 0) + (ev.usage.output_tokens || 0),
            size: 200000,
          },
        })
      }
      break

    default:
      break
  }
}

export {}
