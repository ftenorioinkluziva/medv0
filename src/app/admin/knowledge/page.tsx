import { getAllArticlesForAdmin } from '@/lib/db/queries/knowledge'
import { KnowledgeTable } from './_components/knowledge-table'

export default async function AdminKnowledgePage() {
  const articles = await getAllArticlesForAdmin()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {articles.length} {articles.length === 1 ? 'artigo indexado' : 'artigos indexados'}
          </p>
        </div>
      </div>
      <KnowledgeTable articles={articles} />
    </div>
  )
}
