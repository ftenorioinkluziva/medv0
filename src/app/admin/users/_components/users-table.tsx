'use client'

import { useState, useTransition } from 'react'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { toggleUserActiveAction } from '../_actions/users'
import type { UserForAdmin } from '@/lib/db/queries/users'

const ROLE_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> =
  {
    admin: { label: 'Admin', variant: 'default' },
    patient: { label: 'Paciente', variant: 'secondary' },
  }

type RoleFilter = 'all' | 'patient' | 'admin'

interface UsersTableProps {
  users: UserForAdmin[]
}

export function UsersTable({ users }: UsersTableProps) {
  const [, startTransition] = useTransition()
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [pendingDeactivate, setPendingDeactivate] = useState<UserForAdmin | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const filtered =
    roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter)

  function confirmDeactivate() {
    if (!pendingDeactivate) return
    const user = pendingDeactivate
    setPendingDeactivate(null)
    setTogglingIds((prev) => new Set(prev).add(user.id))
    startTransition(async () => {
      const result = await toggleUserActiveAction(user.id, false)
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`${user.email} desativado`)
      }
    })
  }

  function handleActivate(user: UserForAdmin) {
    setTogglingIds((prev) => new Set(prev).add(user.id))
    startTransition(async () => {
      const result = await toggleUserActiveAction(user.id, true)
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`${user.email} ativado`)
      }
    })
  }

  return (
    <>
      <div className="mb-4">
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="patient">Paciente</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum usuário encontrado
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Exames</TableHead>
              <TableHead>Análises</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => {
              const badge = ROLE_BADGE[user.role] ?? { label: user.role, variant: 'outline' as const }
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium max-w-[240px] truncate">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.documentsCount}</TableCell>
                  <TableCell className="text-muted-foreground">{user.analysesCount}</TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isActive}
                      disabled={togglingIds.has(user.id)}
                      onClick={() =>
                        user.isActive ? setPendingDeactivate(user) : handleActivate(user)
                      }
                      aria-label={user.isActive ? `Desativar ${user.email}` : `Ativar ${user.email}`}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeactivate(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário <strong>{pendingDeactivate?.email}</strong> não conseguirá fazer login após
              ser desativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
