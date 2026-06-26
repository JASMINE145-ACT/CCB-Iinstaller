/**
 * @param {(payload: object) => void} sendLegacy
 * @param {(name: string, data: object) => void} sendAionUI
 */
export function createEventEmitter(sendLegacy, sendAionUI) {
  return {
    userCreated(convId, message) {
      sendAionUI('message.userCreated', { conversation_id: convId, message })
    },

    runtimeStatus(convId, runtime) {
      sendAionUI('runtime.statusChanged', { conversation_id: convId, runtime })
    },

    streamStart(convId) {
      sendAionUI('message.stream', { conversation_id: convId, type: 'start' })
      sendLegacy({ type: 'start', sessionId: convId })
    },

    streamCommands(convId) {
      sendAionUI('message.stream', {
        conversation_id: convId,
        type: 'available_commands',
        commands: [],
      })
    },

    streamText(convId, content) {
      sendAionUI('message.stream', {
        conversation_id: convId,
        type: 'text',
        content,
      })
      sendLegacy({ type: 'chunk', sessionId: convId, content })
    },

    streamFinish(convId) {
      sendAionUI('message.stream', { conversation_id: convId, type: 'finish' })
    },

    agentCreated(convId, message) {
      sendAionUI('message.agentCreated', { conversation_id: convId, message })
    },

    turnCompleted(convId, runtime) {
      sendAionUI('turn.completed', { conversation_id: convId, runtime })
      sendLegacy({
        type: 'done',
        sessionId: convId,
        duration: runtime?.duration_ms,
      })
    },

    toolCalling(convId, tools) {
      sendLegacy({ type: 'tool_calling', sessionId: convId, tools })
    },

    error(convId, error) {
      sendLegacy({ type: 'error', sessionId: convId, error })
      sendAionUI('message.stream', { conversation_id: convId, type: 'finish' })
    },
  }
}

export {}
