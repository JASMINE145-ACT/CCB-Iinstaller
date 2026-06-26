import { create } from 'zustand'
import type { Message, Session, StreamStatus } from '../business/chat/types'

export type ToolCallingInfo = string | null

interface AppState {
  sessions: Session[]
  activeSessionId: string | null
  messages: Record<string, Message[]>
  streamStatus: StreamStatus
  streamingContent: string
  toolCallingInfo: ToolCallingInfo
  sidebarOpen: boolean

  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  removeSession: (id: string) => void
  updateSession: (id: string, patch: Partial<Session>) => void
  setActiveSession: (id: string | null) => void
  setMessages: (sessionId: string, messages: Message[]) => void
  appendMessage: (sessionId: string, message: Message) => void
  setStreamStatus: (status: StreamStatus) => void
  setStreamingContent: (content: string) => void
  appendStreamChunk: (chunk: string) => void
  setToolCallingInfo: (info: ToolCallingInfo) => void
  setSidebarOpen: (open: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  sessions: [],
  activeSessionId: null,
  messages: {},
  streamStatus: 'idle',
  streamingContent: '',
  toolCallingInfo: null,
  sidebarOpen: true,

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({ sessions: [session, ...state.sessions] })),
  removeSession: (id) => set((state) => ({
    sessions: state.sessions.filter((session) => session.id !== id),
    activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
  })),
  updateSession: (id, patch) => set((state) => ({
    sessions: state.sessions.map((session) => (
      session.id === id ? { ...session, ...patch } : session
    )),
  })),
  setActiveSession: (id) => set({ activeSessionId: id, streamingContent: '', streamStatus: 'idle' }),
  setMessages: (sessionId, messages) => set((state) => ({
    messages: { ...state.messages, [sessionId]: messages },
  })),
  appendMessage: (sessionId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [sessionId]: [...(state.messages[sessionId] || []), message],
    },
  })),
  setStreamStatus: (streamStatus) => set({ streamStatus }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  appendStreamChunk: (chunk) => set((state) => ({ streamingContent: state.streamingContent + chunk })),
  setToolCallingInfo: (toolCallingInfo) => set({ toolCallingInfo }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))
