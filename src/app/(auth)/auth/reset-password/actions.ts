'use server'

import bcryptjs from 'bcryptjs'
import { and, eq, isNull, gt } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { users, passwordResetTokens } from '@/lib/db/schema'
import { resetPasswordSchema } from '@/lib/auth/validation'

export type ResetPasswordState = {
  error?: string
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { token, password } = parsed.data

  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!resetToken) {
    return { error: 'Link inválido ou expirado. Solicite um novo link.' }
  }

  const passwordHash = await bcryptjs.hash(password, 12)

  await Promise.all([
    db.update(users).set({ passwordHash }).where(eq(users.id, resetToken.userId)),
    db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id)),
  ])

  redirect('/auth/login?reset=success')
}
