import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getHistoryData } from '@/lib/db/queries/history'
import { HistoryList } from './_components/history-list'

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const { documents: docs, analyses } = await getHistoryData(session.user.id)

  return (
    <main className="min-h-screen bg-background">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-24">
        <div className="flex flex-col gap-0.5 pt-2">
          <h1 className="font-heading text-[20px] font-bold leading-[1.4286] text-foreground">
            Histórico
          </h1>
          {(docs.length > 0 || analyses.length > 0) && (
            <p className="text-[12px] font-medium text-muted-foreground">
              {docs.length} {docs.length === 1 ? 'exame' : 'exames'} · {analyses.length}{' '}
              {analyses.length === 1 ? 'análise' : 'análises'}
            </p>
          )}
        </div>
        <HistoryList documents={docs} analyses={analyses} />
      </div>
    </main>
  )
}
