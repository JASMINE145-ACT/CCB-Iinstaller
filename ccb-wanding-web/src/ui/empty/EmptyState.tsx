import { useSessions } from '../../app/chat/useSessions'
import { useStore } from '../../app/store'
import { useChatStream } from '../../app/chat/useChatStream'

export function EmptyState() {
  const { createSession } = useSessions()
  const { setActiveSession } = useStore()
  const { joinSession } = useChatStream()

  const handleNew = async () => {
    const session = await createSession()
    if (session) {
      setActiveSession(session.id)
      joinSession(session.id)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center text-3xl font-bold text-accent">
        W
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white/80">CCB-Wanding</h2>
        <p className="text-white/35 text-sm mt-2 max-w-xs leading-relaxed">
          选择左侧会话继续对话，或新建一个会话开始
        </p>
      </div>
      <button
        onClick={handleNew}
        className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
      >
        新建会话
      </button>
    </div>
  )
}
