import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getMedicalProfile } from '@/lib/actions/medical-profile'
import { getLatestBodyComposition } from '@/lib/db/queries/body-composition'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileForm } from './profile-form'
import { Suspense } from 'react'

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const initials = getInitials(session.user.name)

  return (
    <main className="min-h-screen bg-background">
      <div className="p-4 pb-20">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="flex flex-col items-center gap-3 pt-2">
            <div
              className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold select-none"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground">{session.user.name ?? 'Meu Perfil'}</h1>
              {session.user.email && (
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              )}
            </div>
          </div>
          <Suspense fallback={<ProfileSkeleton />}>
            <ProfileDataLoader userId={session.user.id} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}

async function ProfileDataLoader({ userId }: { userId: string }) {
  const [profile, { latest: latestBodyComposition, delta }] = await Promise.all([
    getMedicalProfile(),
    getLatestBodyComposition(userId),
  ])

  return (
    <ProfileForm
      initialData={profile}
      latestBodyComposition={latestBodyComposition}
      bodyCompositionDelta={delta}
    />
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4" aria-label="Carregando perfil..." role="status">
      <Skeleton className="h-9 w-full rounded-lg" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-md mt-2" />
    </div>
  )
}
