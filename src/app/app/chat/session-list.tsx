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
    <div className="flex flex-col gap-2">
      {sessions.map((s) => (
        <Link
          key={s.id}
          href={`/app/chat/${s.id}`}
          className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground truncate">
              {s.agent.name}
            </p>
            <p className="text-[12px] font-medium text-muted-foreground">
              {formatDistanceToNow(s.updatedAt, { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          <span className="text-[18px] font-medium text-muted-foreground shrink-0">›</span>
        </Link>
      ))}
    </div>
  )
}
