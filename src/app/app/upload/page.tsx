import { Suspense, lazy } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

const UploadForm = lazy(() => import('@/components/upload/upload-form').then(mod => ({ default: mod.UploadForm })))

function UploadSkeleton() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}

export default async function UploadPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (!session.user.onboardingCompleted) redirect('/app/onboarding')

  return (
    <main className="min-h-screen bg-background">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1 px-0 pt-2">
          <h1 className="font-heading text-[22px] font-bold leading-[1.4286] text-foreground">
            Enviar exame
          </h1>
          <p className="text-[13px] font-medium text-muted-foreground">
            Foto ou PDF — processado em segurança.
          </p>
        </div>
        <Suspense fallback={<UploadSkeleton />}>
          <UploadForm />
        </Suspense>
      </div>
    </main>
  )
}
