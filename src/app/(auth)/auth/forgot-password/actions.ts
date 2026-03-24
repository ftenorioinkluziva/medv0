'use server'

import { randomUUID } from 'crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users, passwordResetTokens } from '@/lib/db/schema'
import { forgotPasswordSchema } from '@/lib/auth/validation'
import { sendPasswordResetEmail } from '@/lib/email'

export type ForgotPasswordState = {
  error?: string
  success?: boolean
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email } = parsed.data

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  // Não revelar se email existe ou não
  if (!user) {
    return { success: true }
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // +1h

  await db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)))

    await tx.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    })
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

  // Envio assíncrono — não bloqueia resposta
  sendPasswordResetEmail(email, resetUrl).catch(console.error)

  return { success: true }
}
