import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from './onboarding-flow'

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.onboardingCompleted) redirect('/app/dashboard')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <OnboardingFlow />
      </div>
    </main>
  )
}
