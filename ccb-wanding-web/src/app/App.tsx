import { useEffect } from 'react'
import { useStore } from './store'
import { useSessions } from './chat/useSessions'
import { useChatStream } from './chat/useChatStream'
import { Sidebar } from '../ui/shell/Sidebar'
import { ChatArea } from '../ui/chat/ChatArea'
import { EmptyState } from '../ui/empty/EmptyState'

export default function App() {
  const { activeSessionId, sidebarOpen, setSidebarOpen } = useStore()
  const { fetchSessions } = useSessions()
  useChatStream()

  useEffect(() => { fetchSessions() }, [fetchSessions])

  return (
    <div className="flex h-full bg-bg-base text-text-primary overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-bg-2">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 h-[48px] border-b border-border-base flex-shrink-0">
          <button
            className="md:hidden p-1.5 rounded hover:bg-bg-3 text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span className="text-sm text-text-secondary font-medium">CCB-Wanding</span>
          <div className="flex-1" />
          <StatusDot />
        </div>

        {activeSessionId ? (
          <ChatArea sessionId={activeSessionId} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  )
}

function StatusDot() {
  const { streamStatus } = useStore()
  if (streamStatus === 'streaming')
    return <span className="flex items-center gap-1.5 text-xs text-text-disabled"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />生成中</span>
  if (streamStatus === 'error')
    return <span className="flex items-center gap-1.5 text-xs text-danger"><span className="w-1.5 h-1.5 rounded-full bg-danger" />错误</span>
  return <span className="flex items-center gap-1.5 text-xs text-text-disabled"><span className="w-1.5 h-1.5 rounded-full bg-success/60" />就绪</span>
}
