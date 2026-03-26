import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do banco de dados
vi.mock('@/lib/db/client', () => ({
  db: {
    insert: vi.fn(),
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
import { upsertMedicalProfile, getMedicalProfile } from '@/lib/actions/medical-profile'

const validInput = {
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.insert).mockReturnValue(mockInsert as never)
})

describe('upsertMedicalProfile', () => {
  describe('criação de perfil', () => {
    it('deve criar perfil quando usuário autenticado envia dados válidos', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

      // #when
      const result = await upsertMedicalProfile(validInput)

      // #then
      expect(result).toEqual({ success: true })
      expect(db.insert).toHaveBeenCalledOnce()
      expect(mockInsert.onConflictDoUpdate).toHaveBeenCalledOnce()
    })

    it('deve incluir biomarkers opcionais quando fornecidos', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)
      const inputWithBiomarkers = {
        ...validInput,
        vo2Max: '45.5',
        bodyFatPercentage: '18.2',
        handgripStrength: '42.0',
      }

      // #when
      const result = await upsertMedicalProfile(inputWithBiomarkers)

      // #then
      expect(result).toEqual({ success: true })
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          vo2Max: '45.5',
          bodyFatPercentage: '18.2',
          handgripStrength: '42.0',
        }),
      )
    })
  })

  describe('atualização de perfil existente', () => {
    it('deve executar upsert (onConflictDoUpdate) ao salvar novamente', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

      // #when — chamada duplicada simula atualização
      await upsertMedicalProfile(validInput)
      const result = await upsertMedicalProfile({ ...validInput, age: 36 })

      // #then
      expect(result).toEqual({ success: true })
      expect(mockInsert.onConflictDoUpdate).toHaveBeenCalledTimes(2)
    })
  })

  describe('acesso não-autorizado', () => {
    it('deve retornar erro quando usuário não está autenticado', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue(null as never)

      // #when
      const result = await upsertMedicalProfile(validInput)

      // #then
      expect(result).toEqual({ success: false, error: 'Não autorizado' })
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('deve retornar erro quando sessão não possui user.id', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: null } as never)

      // #when
      const result = await upsertMedicalProfile(validInput)

      // #then
      expect(result).toEqual({ success: false, error: 'Não autorizado' })
    })
  })

  describe('validação Zod', () => {
    it('deve rejeitar age negativa', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

      // #when
      const result = await upsertMedicalProfile({ ...validInput, age: -1 })

      // #then
      expect(result.success).toBe(false)
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('deve rejeitar gender inválido', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

      // #when
      const result = await upsertMedicalProfile({
        ...validInput,
        gender: 'invalido' as never,
      })

      // #then
      expect(result.success).toBe(false)
    })

    it('deve rejeitar healthObjectives vazio', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

      // #when
      const result = await upsertMedicalProfile({ ...validInput, healthObjectives: '' })

      // #then
      expect(result.success).toBe(false)
    })

    it('deve rejeitar quando sistólica < diastólica', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

      // #when
      const result = await upsertMedicalProfile({ ...validInput, systolicPressure: 70, diastolicPressure: 120 })

      // #then
      expect(result.success).toBe(false)
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando sistólica === diastólica', async () => {
      // #given
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

      // #when
      const result = await upsertMedicalProfile({ ...validInput, systolicPressure: 120, diastolicPressure: 120 })

      // #then
      expect(result.success).toBe(false)
      expect(db.insert).not.toHaveBeenCalled()
    })
  })
})

describe('getMedicalProfile', () => {
  it('deve retornar perfil do usuário autenticado', async () => {
    // #given
    const mockProfile = { id: 'profile-1', userId: 'user-123', age: 35 }
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)
    vi.mocked(db.query.medicalProfiles.findFirst).mockResolvedValue(mockProfile as never)

    // #when
    const result = await getMedicalProfile()

    // #then
    expect(result).toEqual(mockProfile)
  })

  it('deve retornar null quando perfil não existe', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)
    vi.mocked(db.query.medicalProfiles.findFirst).mockResolvedValue(undefined as never)

    // #when
    const result = await getMedicalProfile()

    // #then
    expect(result).toBeNull()
  })

  it('deve retornar null quando usuário não autenticado', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue(null as never)

    // #when
    const result = await getMedicalProfile()

    // #then
    expect(result).toBeNull()
    expect(db.query.medicalProfiles.findFirst).not.toHaveBeenCalled()
  })
})
