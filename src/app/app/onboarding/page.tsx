import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from './onboarding-flow'

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.onboardingCompleted) redirect('/app/dashboard')

  return (
    <main className="min-h-screen bg-background">
      <div className="p-4">
        <div className="w-full max-w-md mx-auto">
          <OnboardingFlow />
        </div>
      </div>
    </main>
  )
}
