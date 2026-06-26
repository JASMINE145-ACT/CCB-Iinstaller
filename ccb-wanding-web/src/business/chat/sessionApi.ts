import { API_BASE } from '../../system/config/runtime'
import { USER_ID } from '../../system/identity/localUser'
import type { Message, Session } from './types'

const headers = () => ({ 'Content-Type': 'application/json', 'X-User-Id': USER_ID })

export async function listSessions(): Promise<Session[] | null> {
  const response = await fetch(`${API_BASE}/api/sessions?userId=${USER_ID}`, { headers: headers() })
  if (!response.ok) return null
  return response.json()
}

export async function createSessionRecord(title: string): Promise<Session | null> {
  const response = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ title }),
  })
  if (!response.ok) return null
  return response.json()
}

export async function deleteSessionRecord(id: string) {
  await fetch(`${API_BASE}/api/sessions/${id}`, { method: 'DELETE', headers: headers() })
}

export async function renameSessionRecord(id: string, title: string) {
  await fetch(`${API_BASE}/api/sessions/${id}/title`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ title }),
  })
}

export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, { headers: headers() })
  if (!response.ok) return []
  const session: Session = await response.json()
  return session.messages || []
}
