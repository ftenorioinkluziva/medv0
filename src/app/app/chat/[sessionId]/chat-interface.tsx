'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
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
  agentSpecialty,
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
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 4rem - env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0 bg-background">
        <Link
          href="/app/chat"
          aria-label="Voltar para seleção de agente"
          className="flex items-center justify-center size-9 rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{agentName}</p>
          <p className="text-xs text-muted-foreground">{agentSpecialty}</p>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-4 py-2 border-b border-border bg-amber-50 dark:bg-amber-950/30 shrink-0">
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-snug">
          Esta conversa é para fins educacionais e NÃO substitui consulta médica profissional.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground pt-8">
            Envie uma mensagem para começar a conversa.
          </p>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {status === 'loading' && (
          <div className="flex items-center gap-2">
            <TypingDots />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{error.message || 'Erro ao enviar mensagem. Tente novamente.'}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3 bg-background">
        {rateLimited && (
          <p className="text-xs text-destructive mb-2 text-center" role="alert">
            {RATE_LIMIT_MSG}
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2"
          aria-label="Enviar mensagem"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            disabled={inputDisabled}
            placeholder={rateLimited ? RATE_LIMIT_MSG : 'Digite sua mensagem...'}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none',
              'placeholder:text-muted-foreground',
              'focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-32 min-h-[42px]',
            )}
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            aria-label="Mensagem"
            aria-disabled={inputDisabled}
          />
          <button
            type="submit"
            disabled={inputDisabled || !input.trim()}
            className={cn(
              'flex items-center justify-center size-11 rounded-xl bg-primary text-primary-foreground shrink-0',
              'transition-opacity hover:opacity-90 active:scale-95',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            aria-label="Enviar"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  )
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-1 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1 first:mt-0">{children}</h3>,
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
        thead: ({ children }) => <thead className="bg-background/50">{children}</thead>,
        th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold border-b border-border/50 whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1.5 border-b border-border/30 last:border-b-0 align-top">{children}</td>,
        tr: ({ children }) => <tr className="even:bg-background/30">{children}</tr>,
        hr: () => <hr className="my-2 border-border/40" />,
        code: ({ children }) => <code className="bg-background/50 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/40 pl-3 py-0.5 my-1.5 text-muted-foreground">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 text-sm',
          'max-w-[85%] break-words',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm leading-relaxed whitespace-pre-wrap'
            : 'bg-muted text-foreground rounded-bl-sm',
        )}
      >
        {isUser ? message.content : <AssistantMarkdown content={message.content} />}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-2xl bg-muted px-4 py-3 rounded-bl-sm"
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
