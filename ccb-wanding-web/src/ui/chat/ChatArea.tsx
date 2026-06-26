import { useEffect, useRef } from 'react'
import { useStore } from '../../app/store'
import { MessageBubble } from './MessageBubble'
import { InputArea } from './InputArea'
import { useChatStream } from '../../app/chat/useChatStream'

interface Props {
  sessionId: string
}

export function ChatArea({ sessionId }: Props) {
  const { messages, streamingContent, streamStatus, toolCallingInfo } = useStore()
  const { sendChat, interrupt } = useChatStream()
  const bottomRef = useRef<HTMLDivElement>(null)
  const sessionMessages = messages[sessionId] || []
  const streaming = streamStatus === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessionMessages.length, streamingContent])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {sessionMessages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {/* Streaming assistant bubble */}
          {streaming && streamingContent && (
            <MessageBubble
              message={{ role: 'assistant', content: streamingContent, ts: new Date().toISOString() }}
              streaming
            />
          )}

          {/* Tool calling indicator */}
          {streaming && toolCallingInfo && !streamingContent && (
            <div className="flex gap-3 px-1 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-bg-3 border border-border-base flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0 mt-0.5 select-none">W</div>
              <div className="flex items-center gap-2 py-2 text-sm text-text-disabled">
                <span className="flex gap-1">
                  {[0, 160, 320].map(d => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse-dot"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
                <span className="text-xs">正在调用 <span className="text-primary/80">{toolCallingInfo}</span></span>
              </div>
            </div>
          )}

          {/* Thinking indicator (no tool, no content yet) */}
          {streaming && !toolCallingInfo && !streamingContent && (
            <div className="flex gap-3 px-1 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-bg-3 border border-border-base flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0 mt-0.5 select-none">W</div>
              <div className="flex items-center gap-1.5 py-2.5">
                {[0, 160, 320].map(d => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-text-disabled animate-pulse-dot"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <InputArea
        sessionId={sessionId}
        onSend={msg => sendChat(sessionId, msg)}
        onInterrupt={() => interrupt(sessionId)}
      />
    </div>
  )
}
