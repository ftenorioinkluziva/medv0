import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .refine(
      (val) => /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(val),
      'Senha deve conter pelo menos 1 número ou caractere especial',
    ),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .refine(
      (val) => /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(val),
      'Senha deve conter pelo menos 1 número ou caractere especial',
    ),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
