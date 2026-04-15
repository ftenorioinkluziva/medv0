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
import { deleteArticleAction } from '../_actions/knowledge'
import { toggleArticleGlobalAction } from '@/lib/actions/admin-knowledge'
import type { KnowledgeBase } from '@/lib/db/schema'

const VERIFIED_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  verified: { label: 'Verificado', variant: 'default' },
  unverified: { label: 'Não verificado', variant: 'outline' },
}

interface KnowledgeTableProps {
  articles: KnowledgeBase[]
  agentsByArticle: Record<string, { id: string; name: string }[]>
}

type VerifiedFilter = 'all' | 'verified' | 'unverified'

const PAGE_SIZE = 20
const ALL_CATEGORIES = 'Todas as categorias'
const ALL_AUTHORS = 'Todos os autores'
const ALL_STATUSES = 'Todos os status'

function getArticleSnippet(article: KnowledgeBase): string {
  const sourceText = article.summary ?? article.content
  const normalized = sourceText.replace(/\s+/g, ' ').trim()

  if (normalized.length <= 180) {
    return normalized
  }

  return `${normalized.slice(0, 180).trimEnd()}...`
}

export function KnowledgeTable({ articles, agentsByArticle }: KnowledgeTableProps) {
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES)
  const [authorFilter, setAuthorFilter] = useState(ALL_AUTHORS)
  const [verifiedFilter, setVerifiedFilter] = useState(ALL_STATUSES)
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<KnowledgeBase | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [globalState, setGlobalState] = useState<Map<string, boolean>>(
    () => new Map(articles.map((a) => [a.id, a.isGlobal])),
  )
  const [togglingGlobalIds, setTogglingGlobalIds] = useState<Set<string>>(new Set())

  const normalizedSearch = search.trim().toLowerCase()

  const categories = Array.from(
    new Set(articles.map((article) => article.category).filter((value): value is string => !!value)),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const authors = Array.from(
    new Set(articles.map((article) => article.author).filter((value): value is string => !!value)),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const filtered = articles.filter((article) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      article.title.toLowerCase().includes(normalizedSearch) ||
      (article.category ?? '').toLowerCase().includes(normalizedSearch) ||
      (article.author ?? '').toLowerCase().includes(normalizedSearch)

    const matchesCategory = categoryFilter === ALL_CATEGORIES || article.category === categoryFilter
    const matchesAuthor = authorFilter === ALL_AUTHORS || article.author === authorFilter
    const matchesVerified =
      verifiedFilter === ALL_STATUSES ||
      (verifiedFilter === 'Verificado' ? article.isVerified === 'verified' : article.isVerified === 'unverified')

    return matchesSearch && matchesCategory && matchesAuthor && matchesVerified
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE
  const pageEndIndex = pageStartIndex + PAGE_SIZE
  const paginated = filtered.slice(pageStartIndex, pageEndIndex)

  function handleToggleGlobal(articleId: string) {
    const currentIsGlobal = globalState.get(articleId) ?? false
    setTogglingGlobalIds((prev) => new Set(prev).add(articleId))
    startTransition(async () => {
      try {
        const result = await toggleArticleGlobalAction(articleId, !currentIsGlobal)
        if ('error' in result) {
          toast.error(result.error)
        } else {
          setGlobalState((prev) => new Map(prev).set(articleId, !currentIsGlobal))
          toast.success(!currentIsGlobal ? 'Artigo marcado como global' : 'Artigo desmarcado como global')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err))
      } finally {
        setTogglingGlobalIds((prev) => {
          const next = new Set(prev)
          next.delete(articleId)
          return next
        })
      }
    })
  }

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
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por título, categoria ou autor..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full max-w-sm"
        />

        <Select
          value={categoryFilter}
          onValueChange={(value) => {
            setCategoryFilter(value ?? ALL_CATEGORIES)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={authorFilter}
          onValueChange={(value) => {
            setAuthorFilter(value ?? ALL_AUTHORS)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Autor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_AUTHORS}>Todos os autores</SelectItem>
            {authors.map((author) => (
              <SelectItem key={author} value={author}>
                {author}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={verifiedFilter}
          onValueChange={(value) => {
            setVerifiedFilter(value as VerifiedFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>Todos os status</SelectItem>
            <SelectItem value="Verificado">Verificado</SelectItem>
            <SelectItem value="Não verificado">Não verificado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum artigo encontrado
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artigo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Global</TableHead>
              <TableHead>Agentes</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((article) => {
              const badge = verifiedBadge(article.isVerified)
              const isGlobal = globalState.get(article.id) ?? article.isGlobal
              const agents = agentsByArticle[article.id] ?? []
              return (
                <TableRow key={article.id}>
                  <TableCell className="max-w-105 align-top">
                    <div className="space-y-1.5">
                      <p className="font-medium leading-snug text-foreground">{article.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {getArticleSnippet(article)}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{article.author ?? 'Autor não informado'}</span>
                        <span>{article.source ?? 'Fonte não informada'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {article.category ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={isGlobal}
                      disabled={togglingGlobalIds.has(article.id)}
                      onClick={() => handleToggleGlobal(article.id)}
                      aria-label={`${isGlobal ? 'Desativar' : 'Ativar'} global para ${article.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    {isGlobal ? (
                      <Badge variant="secondary" className="whitespace-nowrap">Global</Badge>
                    ) : agents.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {agents.slice(0, 2).map((a) => (
                          <Badge key={a.id} variant="outline" className="text-xs whitespace-nowrap">
                            {a.name}
                          </Badge>
                        ))}
                        {agents.length > 2 && (
                          <span className="text-xs text-muted-foreground self-center">
                            +{agents.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground whitespace-nowrap">
                        Sem agente
                      </Badge>
                    )}
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

      {filtered.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {pageStartIndex + 1}-{Math.min(pageEndIndex, filtered.length)} de {filtered.length} artigos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}

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
