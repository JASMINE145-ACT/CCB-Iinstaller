import type { WsIncoming, WsOutgoing } from '../../business/chat/types'

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
let isConnected = false
let currentUrl = ''
let currentMessageHandler: ((message: WsIncoming) => void) | null = null

export function connectChatSocket(url: string, onMessage: (message: WsIncoming) => void) {
  currentUrl = url
  currentMessageHandler = onMessage

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return

  socket = new WebSocket(url)

  socket.onopen = () => {
    clearTimeout(reconnectTimer)
    isConnected = true
  }

  socket.onmessage = (event) => {
    let message: WsIncoming | { type: string }
    try {
      message = JSON.parse(event.data)
    }
    catch {
      return
    }

    if (message.type === 'pong') return
    currentMessageHandler?.(message as WsIncoming)
  }

  socket.onclose = () => {
    socket = null
    isConnected = false
    reconnectTimer = setTimeout(() => {
      if (currentUrl && currentMessageHandler) connectChatSocket(currentUrl, currentMessageHandler)
    }, 3000)
  }

  socket.onerror = () => socket?.close()
}

export function sendChatSocketMessage(message: WsOutgoing) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

export function isChatSocketConnected() {
  return isConnected
}
