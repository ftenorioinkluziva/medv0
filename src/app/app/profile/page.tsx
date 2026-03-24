import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getMedicalProfile } from '@/lib/actions/medical-profile'
import { ProfileForm } from './profile-form'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')

  const profile = await getMedicalProfile()

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Preencha seus dados de saúde para personalizar as análises.
        </p>
        <ProfileForm initialData={profile} />
      </div>
    </main>
  )
}
