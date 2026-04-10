import { describe, it, expect } from 'vitest'
import { registerSchema, resetPasswordSchema, loginSchema } from '@/lib/auth/validation'

describe('registerSchema — password policy', () => {
  it('aceita senha com número', () => {
    // #given
    const input = { email: 'user@test.com', password: 'abc1defg' }

    // #when
    const result = registerSchema.safeParse(input)

    // #then
    expect(result.success).toBe(true)
  })

  it('aceita senha com caractere especial', () => {
    // #given
    const input = { email: 'user@test.com', password: 'abc@defg' }

    // #when
    const result = registerSchema.safeParse(input)

    // #then
    expect(result.success).toBe(true)
  })

  it('rejeita senha sem número ou caractere especial', () => {
    // #given
    const input = { email: 'user@test.com', password: 'abcdefgh' }

    // #when
    const result = registerSchema.safeParse(input)

    // #then
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error)).toContain('número ou caractere especial')
  })

  it('rejeita senha com menos de 8 caracteres', () => {
    // #given
    const input = { email: 'user@test.com', password: 'abc' }

    // #when
    const result = registerSchema.safeParse(input)

    // #then
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error)).toContain('mínimo 8 caracteres')
  })
})

describe('resetPasswordSchema — password policy', () => {
  it('aceita senha com número', () => {
    // #given
    const input = { token: 'tok', password: 'abc1defg' }

    // #when
    const result = resetPasswordSchema.safeParse(input)

    // #then
    expect(result.success).toBe(true)
  })

  it('rejeita senha sem número ou caractere especial', () => {
    // #given
    const input = { token: 'tok', password: 'abcdefgh' }

    // #when
    const result = resetPasswordSchema.safeParse(input)

    // #then
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error)).toContain('número ou caractere especial')
  })
})

describe('loginSchema — retrocompatibilidade', () => {
  it('aceita senha sem número (login não aplica complexity policy)', () => {
    // #given
    const input = { email: 'user@test.com', password: 'abcdefgh' }

    // #when
    const result = loginSchema.safeParse(input)

    // #then
    expect(result.success).toBe(true)
  })
})
