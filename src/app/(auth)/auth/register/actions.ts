'use server'

import bcryptjs from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { registerSchema } from '@/lib/auth/validation'

export type RegisterState = {
  error?: string
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, password } = parsed.data

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing) {
    return { error: 'Este email já está cadastrado.' }
  }

  const passwordHash = await bcryptjs.hash(password, 12)

  await db.insert(users).values({ email, passwordHash })

  redirect('/app/onboarding')
}
