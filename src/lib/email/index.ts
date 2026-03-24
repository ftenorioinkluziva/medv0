import { Resend } from 'resend'
import { ResetPasswordEmail } from './templates/reset-password'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'SAMI <noreply@sami.app>'

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Redefinir sua senha — SAMI',
    react: ResetPasswordEmail({ resetUrl }),
  })
}
