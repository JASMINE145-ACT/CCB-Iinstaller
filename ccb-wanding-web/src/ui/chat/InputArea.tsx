import { useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../../app/store'
import clsx from 'clsx'

interface Props {
  sessionId: string
  onSend: (message: string) => void
  onInterrupt: () => void
}

export function InputArea({ onSend, onInterrupt }: Props) {
  const [text, setText] = useState('')
  const { streamStatus, toolCallingInfo } = useStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streaming = streamStatus === 'streaming'

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [text])

  const handleSend = useCallback(() => {
    const msg = text.trim()
    if (!msg || streaming) return
    onSend(msg)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [text, streaming, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0 bg-bg-2">
      {/* Tool calling status bar */}
      {streaming && toolCallingInfo && (
        <div className="flex items-center gap-2 px-1 pb-2 text-xs text-text-disabled">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
          正在调用工具: <span className="text-primary/80">{toolCallingInfo}</span>
        </div>
      )}

      {/* Input box - AionUI sendbox style */}
      <div className={clsx(
        'flex flex-col rounded-xl border transition-colors bg-bg-1',
        streaming
          ? 'border-primary/30'
          : 'border-border-base hover:border-bg-4 focus-within:border-bg-4',
      )}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={streaming ? '生成中...' : '输入消息（Shift+Enter 换行）'}
          disabled={streaming}
          rows={1}
          className={clsx(
            'w-full bg-transparent resize-none outline-none text-sm text-text-primary',
            'placeholder:text-text-disabled px-4 pt-3 pb-2 min-h-[44px] leading-6',
            streaming && 'cursor-not-allowed',
          )}
        />

        {/* Bottom action bar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <span className="text-[11px] text-text-disabled">
            {streaming ? '生成中，按 Esc 或点击停止' : 'Enter 发送 · Shift+Enter 换行'}
          </span>

          {streaming ? (
            <button
              onClick={onInterrupt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-3 hover:bg-bg-4 text-text-secondary hover:text-text-primary text-xs transition-colors border border-border-base"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
              停止
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                text.trim()
                  ? 'bg-primary hover:bg-primary-hover text-white'
                  : 'bg-bg-3 text-text-disabled cursor-not-allowed',
              )}
            >
              发送
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
