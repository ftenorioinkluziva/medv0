'use client'

import { useTransition } from 'react'
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
      className="w-full text-left rounded-[12px] border border-border bg-card px-4 py-3 flex flex-col gap-1 hover:bg-muted/40 transition-colors active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
      aria-label={`Conversar com ${agent.name}`}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <span className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">
          {agent.name}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground shrink-0">
          {isPending ? '...' : agent.specialty}
        </span>
      </div>
      {agent.description && (
        <p className="text-[12px] font-medium text-muted-foreground line-clamp-2">
          {agent.description}
        </p>
      )}
    </button>
  )
}
