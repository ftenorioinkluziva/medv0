'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toggleAgentAction, deleteAgentAction } from '../_actions/agents'
import type { HealthAgent } from '@/lib/db/schema'

const ROLE_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  foundation: { label: 'Foundation', variant: 'default' },
  specialized: { label: 'Specialized', variant: 'secondary' },
  none: { label: 'None', variant: 'outline' },
}

interface AgentsTableProps {
  agents: HealthAgent[]
}

export function AgentsTable({ agents }: AgentsTableProps) {
  const [, startTransition] = useTransition()
  const [pendingDeactivate, setPendingDeactivate] = useState<HealthAgent | null>(null)
  const [pendingDelete, setPendingDelete] = useState<HealthAgent | null>(null)
  const [deactivatingIds, setDeactivatingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  function confirmToggle() {
    if (!pendingDeactivate) return
    const agent = pendingDeactivate
    setPendingDeactivate(null)
    setDeactivatingIds((prev) => new Set(prev).add(agent.id))
    startTransition(async () => {
      const result = await toggleAgentAction(agent.id, true)
      setDeactivatingIds((prev) => { const next = new Set(prev); next.delete(agent.id); return next })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`${agent.name} desativado`)
      }
    })
  }

  function handleActivate(agent: HealthAgent) {
    setDeactivatingIds((prev) => new Set(prev).add(agent.id))
    startTransition(async () => {
      const result = await toggleAgentAction(agent.id, false)
      setDeactivatingIds((prev) => { const next = new Set(prev); next.delete(agent.id); return next })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`${agent.name} ativado`)
      }
    })
  }

  function confirmDelete() {
    if (!pendingDelete) return
    const agent = pendingDelete
    setPendingDelete(null)
    setDeletingIds((prev) => new Set(prev).add(agent.id))
    startTransition(async () => {
      const result = await deleteAgentAction(agent.id)
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(agent.id); return next })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`${agent.name} excluído`)
      }
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Especialidade</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => {
            const badge = ROLE_BADGE[agent.analysisRole] ?? ROLE_BADGE.none
            return (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">{agent.name}</TableCell>
                <TableCell className="text-muted-foreground">{agent.specialty}</TableCell>
                <TableCell>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{agent.model}</TableCell>
                <TableCell>
                  <Switch
                    checked={agent.isActive}
                    disabled={deactivatingIds.has(agent.id)}
                    onClick={() =>
                      agent.isActive
                        ? setPendingDeactivate(agent)
                        : handleActivate(agent)
                    }
                    aria-label={agent.isActive ? `Desativar ${agent.name}` : `Ativar ${agent.name}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      nativeButton={false}
                      variant="outline"
                      size="sm"
                      render={<Link href={`/admin/agents/${agent.id}/edit`} />}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingIds.has(agent.id)}
                      onClick={() => setPendingDelete(agent)}
                    >
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
          {agents.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-8 text-center text-muted-foreground"
              >
                Nenhum agente encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Deactivate confirmation */}
      <AlertDialog open={pendingDeactivate !== null} onOpenChange={(open) => { if (!open) setPendingDeactivate(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar agente?</AlertDialogTitle>
            <AlertDialogDescription>
              O agente <strong>{pendingDeactivate?.name}</strong> será desativado e não
              participará de análises até ser reativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              O agente <strong>{pendingDelete?.name}</strong> será excluído
              permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
