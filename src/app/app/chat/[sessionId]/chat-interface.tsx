'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Send, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChatStream } from '@/hooks/use-chat-stream'
import type { ChatMessage } from '@/hooks/use-chat-stream'

interface ChatInterfaceProps {
  sessionId: string
  agentId: string
  agentName: string
  agentSpecialty: string
  initialMessages: ChatMessage[]
}

const RATE_LIMIT_MSG = 'Limite de mensagens atingido. Tente novamente em breve.'

export function ChatInterface({
  sessionId,
  agentId,
  agentName,
  initialMessages,
}: ChatInterfaceProps) {
  const [rateLimited, setRateLimited] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, input, status, isLoading, error, handleInputChange, handleSubmit } =
    useChatStream({
      api: '/api/chat',
      body: { sessionId, agentId },
      initialMessages,
      onRateLimit: () => setRateLimited(true),
    })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const inputDisabled = isLoading || rateLimited

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !inputDisabled) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit, inputDisabled],
  )

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {/* header */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 shrink-0 h-14">
        <Link
          href="/app/chat"
          aria-label="Voltar"
          className="flex items-center justify-center size-9 rounded-[10px] border border-border bg-card hover:bg-muted/40 transition-colors shrink-0"
        >
          <span className="font-heading text-[15px] font-semibold text-foreground">←</span>
        </Link>
        <p className="font-heading text-[15px] font-semibold leading-[1.4286] text-foreground truncate">
          {agentName}
        </p>
      </header>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-background">
        {messages.length === 0 && (
          <p className="text-center text-[12px] font-medium text-muted-foreground pt-8">
            Envie uma mensagem para começar a conversa.
          </p>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} agentInitial={agentName[0] ?? 'S'} />
        ))}

        {status === 'loading' && (
          <div className="flex items-end gap-2">
            <div className="size-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-[12px] font-bold text-foreground">{agentName[0] ?? 'S'}</span>
            </div>
            <TypingDots />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-[16px] bg-destructive/10 border border-destructive/20 px-4 py-3 text-[13px] text-destructive">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{error.message || 'Erro ao enviar mensagem. Tente novamente.'}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* input bar */}
      <div className="shrink-0 border-t border-border bg-card px-4 py-3 flex items-center gap-2">
        {rateLimited && (
          <p className="text-[11px] text-destructive text-center w-full" role="alert">
            {RATE_LIMIT_MSG}
          </p>
        )}
        {!rateLimited && (
          <>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              disabled={inputDisabled}
              placeholder="Pergunte sobre sua saúde..."
              rows={1}
              className="flex-1 resize-none rounded-full border border-border bg-background px-4 py-2.5 text-[13px] font-medium outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
              style={{ fieldSizing: 'content', minHeight: '44px' } as React.CSSProperties}
              aria-label="Mensagem"
            />
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={inputDisabled || !input.trim()}
              className="flex items-center justify-center size-11 rounded-full bg-primary text-primary-foreground shrink-0 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Enviar"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xs font-semibold mt-3 mb-1 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1 first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-outside pl-4 space-y-0.5 mb-1.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-4 space-y-0.5 mb-1.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 rounded border border-border/50">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
        th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold border-b border-border whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1.5 border-b border-border last:border-b-0 align-top">{children}</td>,
        tr: ({ children }) => <tr className="even:bg-muted/20">{children}</tr>,
        hr: () => <hr className="my-2 border-border" />,
        code: ({ children }) => <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/40 pl-3 py-0.5 my-1.5 text-muted-foreground">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function MessageBubble({ message, agentInitial }: { message: ChatMessage; agentInitial: string }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2 w-full">
        <div className="flex flex-col gap-1 items-end max-w-[80%]">
          <div className="rounded-[16px] bg-primary px-3.5 py-2.5">
            <p className="text-[13px] font-medium text-foreground leading-relaxed whitespace-pre-wrap wrap-break-word">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 w-full">
      <div className="size-7 rounded-full bg-primary flex items-center justify-center shrink-0">
        <span className="text-[12px] font-bold text-foreground">{agentInitial}</span>
      </div>
      <div className="rounded-[16px] border border-border bg-card px-3.5 py-2.5 max-w-[80%]">
        <div className="text-[13px] font-medium text-foreground leading-relaxed">
          <AssistantMarkdown content={message.content} />
        </div>
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-[16px] border border-border bg-card px-3.5 py-2.5"
      aria-label="Agente digitando"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
