import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { UploadForm } from '@/components/upload/upload-form'

export default async function UploadPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (!session.user.onboardingCompleted) redirect('/app/onboarding')

  return (
    <main className="flex min-h-screen flex-col items-start justify-start p-6 pt-10">
      <div className="w-full max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Enviar exame</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Foto ou arquivo PDF — processado em segurança e nunca armazenado.
        </p>
        <UploadForm />
      </div>
    </main>
  )
}
