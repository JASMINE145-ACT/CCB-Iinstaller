import { useCallback, useEffect } from 'react'
import { useStore } from '../store'
import { WS_BASE } from '../../system/config/runtime'
import { USER_ID } from '../../system/identity/localUser'
import { connectChatSocket, isChatSocketConnected, sendChatSocketMessage } from '../../system/realtime/chatSocketClient'
import type { WsIncoming } from '../../business/chat/types'

function handleMessage(message: WsIncoming) {
  const state = useStore.getState()

  if (message.type === 'start') {
    state.setStreamStatus('streaming')
    state.setStreamingContent('')
    state.setToolCallingInfo(null)
  }

  if (message.type === 'chunk') {
    state.appendStreamChunk(message.content)
  }

  if (message.type === 'tool_calling') {
    state.setToolCallingInfo(message.tools)
  }

  if (message.type === 'done') {
    const content = useStore.getState().streamingContent
    if (message.sessionId) {
      state.appendMessage(message.sessionId, {
        role: 'assistant',
        content: content.trim(),
        ts: new Date().toISOString(),
      })
      if (message.title) {
        state.updateSession(message.sessionId, { title: message.title, updatedAt: new Date().toISOString() })
      }
    }
    state.setStreamingContent('')
    state.setStreamStatus('idle')
    state.setToolCallingInfo(null)
  }

  if (message.type === 'error') {
    state.setStreamStatus('error')
    state.setStreamingContent('')
    setTimeout(() => state.setStreamStatus('idle'), 2000)
  }

  if (message.type === 'interrupted') {
    const content = useStore.getState().streamingContent
    const sessionId = useStore.getState().activeSessionId
    if (sessionId && content.trim()) {
      state.appendMessage(sessionId, {
        role: 'assistant',
        content: `${content.trim()}\n\n*(宸蹭腑鏂?*`,
        ts: new Date().toISOString(),
      })
    }
    state.setStreamingContent('')
    state.setStreamStatus('idle')
  }
}

export function useChatStream() {
  useEffect(() => {
    connectChatSocket(`${WS_BASE}/ws?userId=${USER_ID}`, handleMessage)
  }, [])

  const sendChat = useCallback((sessionId: string, message: string) => {
    const state = useStore.getState()
    state.appendMessage(sessionId, { role: 'user', content: message, ts: new Date().toISOString() })
    sendChatSocketMessage({ type: 'chat', sessionId, message })
  }, [])

  const interrupt = useCallback((sessionId: string) => {
    sendChatSocketMessage({ type: 'interrupt', sessionId })
  }, [])

  const joinSession = useCallback((sessionId: string) => {
    sendChatSocketMessage({ type: 'join', sessionId })
  }, [])

  return { sendChat, interrupt, joinSession, connected: isChatSocketConnected() }
}
