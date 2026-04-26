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
      {/* topbar */}
      <div className="flex items-center justify-between h-14 px-4 bg-background">
        <p className="font-heading text-[18px] font-medium leading-[1.4286] text-foreground">
          Meu Perfil
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-24">
        {/* avatar section */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div
            className="flex size-18 items-center justify-center rounded-full bg-primary select-none"
            aria-hidden="true"
          >
            <span className="font-heading text-[24px] font-medium text-foreground">{initials}</span>
          </div>
          <p className="font-heading text-[16px] font-medium leading-[1.4286] text-foreground">
            {session.user.name ?? 'Meu Perfil'}
          </p>
          {session.user.email && (
            <p className="text-[13px] font-medium text-muted-foreground">{session.user.email}</p>
          )}
        </div>

        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileDataLoader userId={session.user.id} />
        </Suspense>
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
