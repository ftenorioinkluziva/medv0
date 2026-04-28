import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { getBodyCompositionHistory } from '@/lib/db/queries/body-composition'

export default async function BodyCompositionHistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const records = await getBodyCompositionHistory(session.user.id, 50)

  return (
    <main className="min-h-screen bg-background">
      <div className="p-4 pb-20">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <Link
              href="/app/profile"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Voltar ao perfil"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Perfil
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
            <h1 className="font-heading text-[18px] font-semibold text-foreground">
              Histórico de Composição Corporal
            </h1>
          </div>

          {records.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {records.map((record) => {
                const date = new Date(record.measuredAt + 'T00:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })

                return (
                  <Link
                    key={record.id}
                    href={`/app/profile/body-composition/${record.id}`}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-heading text-[13px] font-medium text-foreground">{date}</span>
                      <div className="flex items-center gap-3">
                        {record.weight && (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {parseFloat(record.weight).toFixed(1)} kg
                          </span>
                        )}
                        {record.bodyFat && (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {parseFloat(record.bodyFat).toFixed(1)}% gordura
                          </span>
                        )}
                        {record.muscleMass && (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {parseFloat(record.muscleMass).toFixed(1)} kg músculo
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-primary">Ver →</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
