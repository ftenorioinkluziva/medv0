'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatSessionWithAgent } from '@/lib/db/queries/chat'

interface SessionListProps {
  sessions: ChatSessionWithAgent[]
}

export function SessionList({ sessions }: SessionListProps) {
  return (
    <div className="space-y-1.5">
      {sessions.map((s) => (
        <Link
          key={s.id}
          href={`/app/chat/${s.id}`}
          className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-accent"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium truncate">{s.title}</p>
            <p className="text-xs text-muted-foreground">{s.agent.name} — {s.agent.specialty}</p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
            {formatDistanceToNow(s.updatedAt, { addSuffix: true, locale: ptBR })}
          </span>
        </Link>
      ))}
    </div>
  )
}
