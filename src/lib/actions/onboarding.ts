'use server'

import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { upsertMedicalProfile } from './medical-profile'
import type { UpsertMedicalProfileInput } from './medical-profile'

export type OnboardingResult =
  | { success: true }
  | { success: false; error: string }

export async function completeOnboarding(
  profileData: UpsertMedicalProfileInput,
): Promise<OnboardingResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Não autorizado' }
  }

  const profileResult = await upsertMedicalProfile(profileData)
  if (!profileResult.success) {
    return profileResult
  }

  await db
    .update(users)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(users.id, session.user.id))

  return { success: true }
}
