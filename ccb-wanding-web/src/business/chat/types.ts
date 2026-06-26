export interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

export interface Session {
  id: string
  title: string
  userId: string
  createdAt: string
  updatedAt: string
  messageCount?: number
  messages?: Message[]
}

export type StreamStatus = 'idle' | 'streaming' | 'error'

export type WsIncoming =
  | { type: 'start';        sessionId: string }
  | { type: 'chunk';        sessionId: string; content: string }
  | { type: 'done';         sessionId: string; duration?: number; title?: string }
  | { type: 'tool_calling'; sessionId: string; tools: string }
  | { type: 'error';        error: string; sessionId?: string }
  | { type: 'interrupted';  sessionId?: string }

export type WsOutgoing =
  | { type: 'chat';      sessionId: string; message: string }
  | { type: 'interrupt'; sessionId: string }
  | { type: 'join';      sessionId: string }
