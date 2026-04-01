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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { deleteArticleAction } from '../_actions/knowledge'
import type { KnowledgeBase } from '@/lib/db/schema'

const VERIFIED_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  verified: { label: 'Verificado', variant: 'default' },
  unverified: { label: 'Não verificado', variant: 'outline' },
}

interface KnowledgeTableProps {
  articles: KnowledgeBase[]
}

export function KnowledgeTable({ articles }: KnowledgeTableProps) {
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<KnowledgeBase | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const filtered = search.trim()
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          (a.category ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : articles

  function confirmDelete() {
    if (!pendingDelete) return
    const article = pendingDelete
    setPendingDelete(null)
    setDeletingIds((prev) => new Set(prev).add(article.id))
    startTransition(async () => {
      const result = await deleteArticleAction(article.id)
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(article.id)
        return next
      })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`"${article.title}" removido`)
      }
    })
  }

  const verifiedBadge = (value: string) =>
    VERIFIED_BADGE[value] ?? { label: value, variant: 'outline' as const }

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Buscar por título ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum artigo encontrado
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((article) => {
              const badge = verifiedBadge(article.isVerified)
              return (
                <TableRow key={article.id}>
                  <TableCell className="font-medium max-w-[280px] truncate">
                    {article.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {article.category ?? '—'}
                  </TableCell>
                  <TableCell>{article.usageCount}</TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(article.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingIds.has(article.id)}
                      onClick={() => setPendingDelete(article)}
                    >
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover artigo?</AlertDialogTitle>
            <AlertDialogDescription>
              O artigo <strong>&quot;{pendingDelete?.title}&quot;</strong> e todos os seus embeddings serão removidos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
