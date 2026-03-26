import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { medicalProfiles, documents } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (!session.user.onboardingCompleted) redirect('/app/onboarding')

  const [profile, recentDocs] = await Promise.all([
    db.query.medicalProfiles.findFirst({
      where: eq(medicalProfiles.userId, session.user.id),
    }),
    db.query.documents.findMany({
      where: eq(documents.userId, session.user.id),
      orderBy: desc(documents.createdAt),
      limit: 5,
    }),
  ])

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo, {session.user.email}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">Perfil de Saúde</h2>
            {profile ? (
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Idade</dt>
                  <dd>{profile.age} anos</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Altura</dt>
                  <dd>{profile.height} cm</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Peso</dt>
                  <dd>{profile.weight} kg</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Pressão arterial</dt>
                  <dd>{profile.systolicPressure}/{profile.diastolicPressure} mmHg</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">FC repouso</dt>
                  <dd>{profile.restingHeartRate} bpm</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Perfil não preenchido.</p>
            )}
            <Link
              href="/app/profile"
              className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              {profile ? 'Editar perfil' : 'Preencher perfil'}
            </Link>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">Exames Recentes</h2>
            {recentDocs.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {recentDocs.map((doc) => (
                  <li key={doc.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="truncate">{doc.originalFileName}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {doc.examDate ?? new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum exame enviado.</p>
            )}
            <Link
              href="/app/documents/upload"
              className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Enviar exame
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
