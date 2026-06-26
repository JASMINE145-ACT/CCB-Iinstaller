import { useCallback } from 'react'
import { useStore } from '../store'
import type { Message, Session } from '../../business/chat/types'
import {
  createSessionRecord,
  deleteSessionRecord,
  getSessionMessages,
  listSessions,
  renameSessionRecord,
} from '../../business/chat/sessionApi'

export function useSessions() {
  const store = useStore()

  const fetchSessions = useCallback(async () => {
    const sessions = await listSessions()
    if (sessions) store.setSessions(sessions)
  }, [store])

  const createSession = useCallback(async (title?: string): Promise<Session | null> => {
    const session = await createSessionRecord(title || '鏂颁細璇?')
    if (!session) return null
    store.addSession(session)
    return session
  }, [store])

  const deleteSession = useCallback(async (id: string) => {
    await deleteSessionRecord(id)
    store.removeSession(id)
  }, [store])

  const renameSession = useCallback(async (id: string, title: string) => {
    await renameSessionRecord(id, title)
    store.updateSession(id, { title })
  }, [store])

  const loadMessages = useCallback(async (sessionId: string): Promise<Message[]> => {
    const messages = await getSessionMessages(sessionId)
    store.setMessages(sessionId, messages)
    return messages
  }, [store])

  return { fetchSessions, createSession, deleteSession, renameSession, loadMessages }
}
