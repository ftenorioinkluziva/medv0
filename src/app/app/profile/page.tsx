import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getMedicalProfile } from '@/lib/actions/medical-profile'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileForm } from './profile-form'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Preencha seus dados de saúde para personalizar as análises.
        </p>
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileDataLoader />
        </Suspense>
      </div>
    </main>
  )
}

async function ProfileDataLoader() {
  const profile = await getMedicalProfile()
  return <ProfileForm initialData={profile} />
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4" aria-label="Carregando perfil..." role="status">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-md mt-2" />
    </div>
  )
}
