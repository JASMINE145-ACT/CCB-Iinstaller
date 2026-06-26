import { useState, useCallback } from 'react'
import { useStore } from '../../app/store'
import { useSessions } from '../../app/chat/useSessions'
import { useChatStream } from '../../app/chat/useChatStream'
import type { Session } from '../../business/chat/types'
import clsx from 'clsx'

function groupByDate(sessions: Session[]) {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yest  = new Date(today.getTime() - 86400000)
  const week  = new Date(today.getTime() - 6 * 86400000)

  const groups: { label: string; items: Session[] }[] = [
    { label: '今天',    items: [] },
    { label: '昨天',    items: [] },
    { label: '过去 7 天', items: [] },
    { label: '更早',    items: [] },
  ]

  for (const s of sessions) {
    const d = new Date(s.updatedAt)
    if (d >= today) groups[0].items.push(s)
    else if (d >= yest) groups[1].items.push(s)
    else if (d >= week) groups[2].items.push(s)
    else groups[3].items.push(s)
  }
  return groups.filter(g => g.items.length > 0)
}

export function Sidebar() {
  const { sessions, activeSessionId, setActiveSession, sidebarOpen, setSidebarOpen } = useStore()
  const { createSession, deleteSession, renameSession, loadMessages } = useSessions()
  const { joinSession } = useChatStream()

  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editValue, setEditValue]   = useState('')
  const [hoveredId, setHoveredId]   = useState<string | null>(null)

  const handleNew = useCallback(async () => {
    const s = await createSession()
    if (s) { setActiveSession(s.id); joinSession(s.id) }
  }, [createSession, setActiveSession, joinSession])

  const handleSelect = useCallback(async (id: string) => {
    setActiveSession(id)
    joinSession(id)
    await loadMessages(id)
  }, [setActiveSession, joinSession, loadMessages])

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteSession(id)
  }, [deleteSession])

  const startEdit = useCallback((e: React.MouseEvent, s: Session) => {
    e.stopPropagation()
    setEditingId(s.id)
    setEditValue(s.title)
  }, [])

  const commitEdit = useCallback(async (id: string) => {
    if (editValue.trim()) await renameSession(id, editValue.trim())
    setEditingId(null)
  }, [editValue, renameSession])

  const groups = groupByDate(sessions)

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={clsx(
        'fixed md:relative z-20 h-full flex flex-col',
        'w-[260px] bg-bg-1 border-r border-border-base flex-shrink-0',
        'transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>

        {/* Logo + title */}
        <div className="flex items-center gap-2.5 px-4 h-[48px] border-b border-border-base flex-shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-[11px] font-bold text-white select-none">W</div>
          <span className="font-semibold text-sm text-text-primary tracking-wide">CCB-Wanding</span>
        </div>

        {/* New chat */}
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <button
            onClick={handleNew}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            新建会话
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 min-h-0">
          {groups.length === 0 ? (
            <p className="text-xs text-text-disabled px-3 py-8 text-center">暂无会话<br />点击上方新建</p>
          ) : (
            groups.map(group => (
              <div key={group.label} className="mt-2">
                <p className="px-3 py-1.5 text-[11px] text-text-disabled font-medium select-none">
                  {group.label}
                </p>
                {group.items.map(session => (
                  <div
                    key={session.id}
                    onClick={() => handleSelect(session.id)}
                    onMouseEnter={() => setHoveredId(session.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={clsx(
                      'group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors animate-slide-in select-none',
                      activeSessionId === session.id
                        ? 'bg-bg-active text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
                    )}
                  >
                    {/* Conversation icon */}
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>

                    {editingId === session.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(session.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit(session.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-transparent outline-none text-text-primary text-sm min-w-0"
                      />
                    ) : (
                      <span className="flex-1 truncate min-w-0">{session.title}</span>
                    )}

                    {/* Action buttons on hover */}
                    {hoveredId === session.id && editingId !== session.id && (
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button
                          onClick={e => startEdit(e, session)}
                          className="p-1 rounded hover:bg-bg-3 text-text-disabled hover:text-text-secondary transition-colors"
                          title="重命名"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={e => handleDelete(e, session.id)}
                          className="p-1 rounded hover:bg-danger/20 text-text-disabled hover:text-danger transition-colors"
                          title="删除"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Bottom: model info */}
        <div className="px-4 py-3 border-t border-border-base flex-shrink-0">
          <span className="text-xs text-text-disabled">MiniMax M3 · CCB-Wanding</span>
        </div>
      </aside>
    </>
  )
}
