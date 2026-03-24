import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcryptjs from 'bcryptjs'
import { eq, and, isNull, gt } from 'drizzle-orm'

// Mock do módulo de banco de dados
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { db } from '@/lib/db/client'
import { registerAction } from '@/app/(auth)/auth/register/actions'
import { forgotPasswordAction } from '@/app/(auth)/auth/forgot-password/actions'
import { resetPasswordAction } from '@/app/(auth)/auth/reset-password/actions'
import { verifyCredentials } from '@/lib/auth/verify-credentials'

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

function buildSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  }
  chain.from.mockReturnValue(chain)
  chain.where.mockReturnValue(chain)
  mockDb.select.mockReturnValue(chain)
  return chain
}

function buildInsertChain() {
  const chain = { values: vi.fn().mockResolvedValue(undefined) }
  mockDb.insert.mockReturnValue(chain)
  return chain
}

describe('registerAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna erro para email já cadastrado', async () => {
    // #given
    buildSelectChain([{ id: 'existing-user-id' }])

    const formData = new FormData()
    formData.set('email', 'user@test.com')
    formData.set('password', 'senha123')

    // #when
    const result = await registerAction({}, formData)

    // #then
    expect(result.error).toBe('Este email já está cadastrado.')
  })

  it('retorna erro para senha com menos de 8 caracteres', async () => {
    // #given
    const formData = new FormData()
    formData.set('email', 'user@test.com')
    formData.set('password', '123')

    // #when
    const result = await registerAction({}, formData)

    // #then
    expect(result.error).toContain('mínimo 8 caracteres')
  })

  it('retorna erro para email inválido', async () => {
    // #given
    const formData = new FormData()
    formData.set('email', 'nao-e-email')
    formData.set('password', 'senha123')

    // #when
    const result = await registerAction({}, formData)

    // #then
    expect(result.error).toContain('Email inválido')
  })

  it('insere usuário quando dados são válidos e email não existe', async () => {
    // #given
    buildSelectChain([])
    buildInsertChain()

    const formData = new FormData()
    formData.set('email', 'novo@test.com')
    formData.set('password', 'senha12345')

    // #when
    await registerAction({}, formData).catch(() => {
      // redirect lança exceção interna no Next.js
    })

    // #then
    expect(mockDb.insert).toHaveBeenCalled()
    const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0]
    expect(insertCall.email).toBe('novo@test.com')
    expect(insertCall.passwordHash).toBeDefined()
    const valid = await bcryptjs.compare('senha12345', insertCall.passwordHash)
    expect(valid).toBe(true)
  })
})

describe('forgotPasswordAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna success:true mesmo quando email não existe (não revela existência)', async () => {
    // #given
    buildSelectChain([])

    const formData = new FormData()
    formData.set('email', 'naoexiste@test.com')

    // #when
    const result = await forgotPasswordAction({}, formData)

    // #then
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('resetPasswordAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna erro para token inválido ou expirado', async () => {
    // #given — token não encontrado
    buildSelectChain([])

    const formData = new FormData()
    formData.set('token', 'token-invalido')
    formData.set('password', 'novasenha123')

    // #when
    const result = await resetPasswordAction({}, formData)

    // #then
    expect(result.error).toContain('inválido ou expirado')
  })

  it('retorna erro para senha com menos de 8 caracteres', async () => {
    // #given
    const formData = new FormData()
    formData.set('token', 'qualquer-token')
    formData.set('password', '123')

    // #when
    const result = await resetPasswordAction({}, formData)

    // #then
    expect(result.error).toContain('mínimo 8 caracteres')
  })
})

describe('verifyCredentials', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna null para usuário não encontrado', async () => {
    // #given
    buildSelectChain([])

    // #when
    const result = await verifyCredentials('naoexiste@test.com', 'senha12345')

    // #then
    expect(result).toBeNull()
  })

  it('retorna null para usuário inativo', async () => {
    // #given
    buildSelectChain([{
      id: 'user-1',
      email: 'user@test.com',
      passwordHash: await bcryptjs.hash('senha12345', 12),
      role: 'patient',
      onboardingCompleted: false,
      isActive: false,
    }])

    // #when
    const result = await verifyCredentials('user@test.com', 'senha12345')

    // #then
    expect(result).toBeNull()
  })

  it('retorna null para senha incorreta', async () => {
    // #given
    buildSelectChain([{
      id: 'user-1',
      email: 'user@test.com',
      passwordHash: await bcryptjs.hash('senhaCorreta', 12),
      role: 'patient',
      onboardingCompleted: false,
      isActive: true,
    }])

    // #when
    const result = await verifyCredentials('user@test.com', 'senhaErrada')

    // #then
    expect(result).toBeNull()
  })

  it('retorna AuthUser para credenciais válidas', async () => {
    // #given
    const passwordHash = await bcryptjs.hash('senha12345', 12)
    buildSelectChain([{
      id: 'user-1',
      email: 'user@test.com',
      passwordHash,
      role: 'patient',
      onboardingCompleted: true,
      isActive: true,
    }])

    // #when
    const result = await verifyCredentials('user@test.com', 'senha12345')

    // #then
    expect(result).toEqual({
      id: 'user-1',
      email: 'user@test.com',
      role: 'patient',
      onboardingCompleted: true,
    })
  })
})
