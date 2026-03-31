'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MessageResponseProps {
  content: string
  className?: string
}

export function MessageResponse({ content, className }: MessageResponseProps) {
  return (
    <div className={cn('text-sm', className)}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-foreground mt-5 mb-2 border-b border-border pb-1">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-foreground mt-4 mb-1">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-foreground leading-relaxed mb-3">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside pl-4 space-y-1 mb-3 text-sm">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside pl-4 space-y-1 mb-3 text-sm">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground leading-relaxed">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-amber-500 pl-4 py-2 my-4 bg-amber-500/5 rounded-r text-sm text-muted-foreground">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        hr: () => <hr className="my-6 border-border" />,
        code: ({ children }) => (
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
}
