import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getDocumentsWithHistory } from '@/lib/db/queries/history'
import { computeEvolution } from '@/lib/history/evolution'
import { HistoryList } from './_components/history-list'
import type { ParameterEvolution } from '@/lib/history/evolution'

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const docs = await getDocumentsWithHistory(session.user.id)

  const evolutionMap: Record<string, ParameterEvolution[]> = {}
  for (let i = 0; i < docs.length; i++) {
    const current = docs[i]
    const samePrevious = docs.slice(i + 1).find((d) => d.documentType === current.documentType)
    evolutionMap[current.id] = computeEvolution(current, samePrevious)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Histórico de Uploads de Exames</h1>
          {docs.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {docs.length} {docs.length === 1 ? 'exame' : 'exames'}
            </p>
          )}
        </div>
        <HistoryList documents={docs} evolutionMap={evolutionMap} />
      </div>
    </main>
  )
}
