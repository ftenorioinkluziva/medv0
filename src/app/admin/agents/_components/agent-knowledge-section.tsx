'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { associateArticlesAction, disassociateArticlesAction } from '@/lib/actions/admin-knowledge'
import type { ArticleSelector } from '@/lib/db/queries/knowledge'

interface AgentKnowledgeSectionProps {
  agentId: string
  initialAssociatedIds: string[]
  allArticles: ArticleSelector[]
}

export function AgentKnowledgeSection({
  agentId,
  initialAssociatedIds,
  allArticles,
}: AgentKnowledgeSectionProps) {
  const [associatedIds, setAssociatedIds] = useState(() => new Set(initialAssociatedIds))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [pending, startTransition] = useTransition()

  const normalizedSearch = search.trim().toLowerCase()
  const filtered = allArticles.filter(
    (a) =>
      normalizedSearch.length === 0 ||
      a.title.toLowerCase().includes(normalizedSearch) ||
      (a.category ?? '').toLowerCase().includes(normalizedSearch),
  )

  function toggleSelect(articleId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(articleId)) next.delete(articleId)
      else next.add(articleId)
      return next
    })
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id))

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((a) => next.delete(a.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((a) => next.add(a.id))
        return next
      })
    }
  }

  function singleToggle(articleId: string, isAssociated: boolean) {
    startTransition(async () => {
      try {
        const result = isAssociated
          ? await disassociateArticlesAction(agentId, [articleId])
          : await associateArticlesAction(agentId, [articleId])

        if ('error' in result) {
          toast.error(result.error)
          return
        }

        setAssociatedIds((prev) => {
          const next = new Set(prev)
          if (isAssociated) next.delete(articleId)
          else next.add(articleId)
          return next
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  const selectedNonAssoc = [...selectedIds].filter((id) => !associatedIds.has(id))
  const selectedAssoc = [...selectedIds].filter((id) => associatedIds.has(id))

  function bulkAssociate() {
    if (selectedNonAssoc.length === 0) return
    startTransition(async () => {
      try {
        const result = await associateArticlesAction(agentId, selectedNonAssoc)
        if ('error' in result) {
          toast.error(result.error)
          return
        }
        setAssociatedIds((prev) => {
          const next = new Set(prev)
          selectedNonAssoc.forEach((id) => next.add(id))
          return next
        })
        setSelectedIds(new Set())
        toast.success(`${selectedNonAssoc.length} artigo(s) associado(s)`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  function bulkRemove() {
    if (selectedAssoc.length === 0) return
    startTransition(async () => {
      try {
        const result = await disassociateArticlesAction(agentId, selectedAssoc)
        if ('error' in result) {
          toast.error(result.error)
          return
        }
        setAssociatedIds((prev) => {
          const next = new Set(prev)
          selectedAssoc.forEach((id) => next.delete(id))
          return next
        })
        setSelectedIds(new Set())
        toast.success(`${selectedAssoc.length} artigo(s) desassociado(s)`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  return (
    <section className="mt-10 max-w-2xl" aria-label="Base de Conhecimento">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Base de Conhecimento</h2>
          <p className="text-sm text-muted-foreground">
            {associatedIds.size} artigo(s) associado(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedNonAssoc.length > 0 && (
            <Button size="sm" disabled={pending} onClick={bulkAssociate}>
              Adicionar selecionados ({selectedNonAssoc.length})
            </Button>
          )}
          {selectedAssoc.length > 0 && (
            <Button size="sm" variant="destructive" disabled={pending} onClick={bulkRemove}>
              Remover selecionados ({selectedAssoc.length})
            </Button>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Input
          placeholder="Buscar artigos por título ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          aria-label="Buscar artigos"
        />
        {filtered.length > 0 && (
          <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
            {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum artigo encontrado</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {filtered.map((article) => {
            const isAssociated = associatedIds.has(article.id)
            const isSelected = selectedIds.has(article.id)
            return (
              <div key={article.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(article.id)}
                  aria-label={`Selecionar ${article.title}`}
                  className="h-4 w-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{article.title}</p>
                  {article.category && (
                    <p className="text-xs text-muted-foreground">{article.category}</p>
                  )}
                </div>
                {isAssociated ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="default" className="text-xs">Associado</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => singleToggle(article.id, true)}
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => singleToggle(article.id, false)}
                    className="shrink-0"
                  >
                    Associar
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
