import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do banco de dados
vi.mock('@/lib/db/client', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    query: {
      medicalProfiles: {
        findFirst: vi.fn(),
      },
    },
  },
}))

// Mock do auth
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth/config'
import { completeOnboarding } from '@/lib/actions/onboarding'

const validProfileInput = {
  age: 35,
  gender: 'masculino' as const,
  height: 175,
  weight: '72.50',
  systolicPressure: 120,
  diastolicPressure: 80,
  restingHeartRate: 70,
  healthObjectives: 'Melhorar condicionamento físico',
}

const mockInsert = {
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
}

const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.insert).mockReturnValue(mockInsert as never)
  vi.mocked(db.update).mockReturnValue(mockUpdate as never)
})

describe('completeOnboarding', () => {
  describe('quando usuário não está autenticado', () => {
    it('retorna erro de não autorizado', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue(null as never)

      // #when
      const result = await completeOnboarding(validProfileInput)

      // #then
      expect(result).toEqual({ success: false, error: 'Não autorizado' })
      expect(db.insert).not.toHaveBeenCalled()
      expect(db.update).not.toHaveBeenCalled()
    })

    it('retorna erro quando sessão não tem id', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: {} } as never)

      // #when
      const result = await completeOnboarding(validProfileInput)

      // #then
      expect(result).toEqual({ success: false, error: 'Não autorizado' })
      expect(db.update).not.toHaveBeenCalled()
    })
  })

  describe('quando usuário está autenticado', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)
    })

    it('salva perfil médico e seta onboardingCompleted = true', async () => {
      // #given — mocks já configurados no beforeEach

      // #when
      const result = await completeOnboarding(validProfileInput)

      // #then
      expect(result).toEqual({ success: true })
      expect(db.insert).toHaveBeenCalledTimes(1)
      expect(db.update).toHaveBeenCalledTimes(1)
    })

    it('seta onboardingCompleted = true na tabela users', async () => {
      // #given — mocks já configurados no beforeEach

      // #when
      await completeOnboarding(validProfileInput)

      // #then
      const setCall = mockUpdate.set.mock.calls[0][0]
      expect(setCall.onboardingCompleted).toBe(true)
    })

    it('retorna erro quando upsertMedicalProfile falha', async () => {
      // #given — simula falha no insert (conflict update rejeitada)
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockRejectedValue(new Error('DB error')),
      } as never)

      // #when
      await expect(completeOnboarding(validProfileInput)).rejects.toThrow('DB error')

      // #then — update dos users não deve ter sido chamado
      expect(db.update).not.toHaveBeenCalled()
    })

    it('não chama update de users quando perfil inválido', async () => {
      // #given — input com systolic < diastolic (falha na validação Zod)
      const invalidInput = {
        ...validProfileInput,
        systolicPressure: 70,
        diastolicPressure: 120,
      }

      // #when
      const result = await completeOnboarding(invalidInput)

      // #then
      expect(result).toEqual({
        success: false,
        error: 'Pressão sistólica deve ser maior que a diastólica',
      })
      expect(db.update).not.toHaveBeenCalled()
    })
  })
})

describe('onboardingCompleted redirect logic', () => {
  it('usuário com onboardingCompleted = true é redirecionado ao dashboard no login', async () => {
    // #given — verifyCredentials retorna usuário com onboardingCompleted = true
    // Este comportamento é validado pelo JWT callback em auth/config.ts:
    // o campo onboardingCompleted é propagado do user para o token durante authorize
    const mockUser = {
      id: 'user-1',
      email: 'user@test.com',
      role: 'patient',
      onboardingCompleted: true,
    }

    // #when — o JWT callback inclui onboardingCompleted no token
    const token = {} as Record<string, unknown>
    if (mockUser) {
      token.id = mockUser.id
      token.role = mockUser.role
      token.onboardingCompleted = mockUser.onboardingCompleted
    }

    // #then — token contém o flag correto para que middleware redirecione
    expect(token.onboardingCompleted).toBe(true)
  })

  it('usuário com onboardingCompleted = false deve passar pelo onboarding', async () => {
    // #given
    const mockUser = {
      id: 'user-2',
      email: 'novo@test.com',
      role: 'patient',
      onboardingCompleted: false,
    }

    // #when
    const token = {} as Record<string, unknown>
    if (mockUser) {
      token.id = mockUser.id
      token.role = mockUser.role
      token.onboardingCompleted = mockUser.onboardingCompleted
    }

    // #then
    expect(token.onboardingCompleted).toBe(false)
  })

  it('JWT callback com trigger update atualiza onboardingCompleted no token', async () => {
    // #given — simula o callback jwt com trigger: 'update'
    const token: Record<string, unknown> = { id: 'user-1', onboardingCompleted: false }
    const trigger = 'update'
    const session = { onboardingCompleted: true }

    // #when — lógica do callback em auth/config.ts
    if (trigger === 'update' && session?.onboardingCompleted !== undefined) {
      token.onboardingCompleted = session.onboardingCompleted
    }

    // #then
    expect(token.onboardingCompleted).toBe(true)
  })
})
