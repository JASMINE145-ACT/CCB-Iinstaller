import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../../business/chat/types'
import clsx from 'clsx'

interface Props {
  message: Message
  streaming?: boolean
}

export function MessageBubble({ message, streaming }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in px-1">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-user-bubble text-text-primary text-sm leading-relaxed whitespace-pre-wrap border border-primary/20">
            {message.content}
          </div>
          <span className="text-[11px] text-text-disabled px-1">
            {new Date(message.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 animate-fade-in px-1">
      {/* AI avatar */}
      <div className="w-7 h-7 rounded-full bg-bg-3 border border-border-base flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0 mt-0.5 select-none">
        W
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className={clsx(
          'text-sm leading-relaxed prose prose-sm max-w-none',
          'prose-invert',
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
          {streaming && (
            <span className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 animate-blink align-middle" />
          )}
        </div>
        <span className="text-[11px] text-text-disabled">
          {new Date(message.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
