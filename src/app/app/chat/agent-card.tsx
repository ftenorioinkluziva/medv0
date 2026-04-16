'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { startChat } from './actions'

interface AgentCardProps {
  agent: {
    id: string
    name: string
    specialty: string
    description: string | null
  }
}

export function AgentCard({ agent }: AgentCardProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await startChat(agent.id)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'w-full text-left rounded-lg border border-border bg-card px-4 py-3 space-y-0.5 transition-colors',
        'hover:bg-accent hover:border-foreground/20 active:scale-[0.99]',
        isPending && 'opacity-60 pointer-events-none',
      )}
      aria-label={`Conversar com ${agent.name}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{agent.name}</span>
        {isPending ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <span className="text-[10px] text-muted-foreground shrink-0">{agent.specialty}</span>
        )}
      </div>
      {agent.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
      )}
    </button>
  )
}
