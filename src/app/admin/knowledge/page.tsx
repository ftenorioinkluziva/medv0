import dynamic from 'next/dynamic'
import { getAllArticlesForAdmin, getAgentsByArticleIds } from '@/lib/db/queries/knowledge'
import { Pagination } from '@/components/ui/pagination'

const KnowledgeTable = dynamic(
  () => import('./_components/knowledge-table').then((module) => module.KnowledgeTable),
  {
    loading: () => (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">Carregando knowledge base...</div>
    ),
  },
)

const PAGE_SIZE = 20

export default async function AdminKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const params = await searchParams
  const rawPage = Math.trunc(Number(params.page))
  const rawSize = Math.trunc(Number(params.size))
  const page = Math.max(1, Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1)
  const size = Math.max(1, Math.min(100, Number.isFinite(rawSize) && rawSize > 0 ? rawSize : PAGE_SIZE))
  const offset = (page - 1) * size

  const { data: articles, total } = await getAllArticlesForAdmin(size, offset)
  const totalPages = Math.ceil(total / size)

  const articleIds = articles.map((a) => a.id)
  const agentsByArticle = await getAgentsByArticleIds(articleIds)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? 'artigo indexado' : 'artigos indexados'}
          </p>
        </div>
      </div>
      <KnowledgeTable articles={articles} agentsByArticle={agentsByArticle} />
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  )
}
