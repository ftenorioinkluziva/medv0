import { describe, it, expect, vi, beforeEach } from 'vitest'

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

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth/config'
import { upsertMedicalProfile } from '@/lib/actions/medical-profile'

const baseInput = {
  age: 35,
  gender: 'masculino' as const,
  height: 175,
  weight: '72.50',
  systolicPressure: 120,
  diastolicPressure: 80,
  restingHeartRate: 70,
  healthObjectives: 'Melhorar condicionamento',
}

const mockInsert = {
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.insert).mockReturnValue(mockInsert as never)
  vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)
})

describe('upsertMedicalProfile — dados avançados', () => {
  describe('perfil parcial (apenas campos básicos)', () => {
    it('deve salvar sem campos avançados', async () => {
      // #given — sem nenhum campo avançado

      // #when
      const result = await upsertMedicalProfile(baseInput)

      // #then
      expect(result).toEqual({ success: true })
      expect(db.insert).toHaveBeenCalledOnce()
    })

    it('deve aceitar apenas sono preenchido', async () => {
      // #given
      const input = {
        ...baseInput,
        sleepHours: '7.5',
        sleepQuality: 8,
        sleepIssues: 'roncos ocasionais',
      }

      // #when
      const result = await upsertMedicalProfile(input)

      // #then
      expect(result).toEqual({ success: true })
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          sleepHours: '7.5',
          sleepQuality: 8,
          sleepIssues: 'roncos ocasionais',
        }),
      )
    })

    it('deve aceitar apenas cronobiologia preenchida', async () => {
      // #given
      const input = {
        ...baseInput,
        firstSunlightExposureTime: '07:00',
        lastMealTime: '20:30',
        artificialLightExposureStart: '19:00',
        artificialLightExposureEnd: '23:00',
      }

      // #when
      const result = await upsertMedicalProfile(input)

      // #then
      expect(result).toEqual({ success: true })
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          firstSunlightExposureTime: '07:00',
          lastMealTime: '20:30',
        }),
      )
    })
  })

  describe('perfil completo (básicos + avançados)', () => {
    it('deve salvar perfil completo com atividades físicas', async () => {
      // #given
      const input = {
        ...baseInput,
        sleepHours: '7.0',
        sleepQuality: 7,
        dailyWaterIntake: '2.5',
        stressLevel: 5,
        smokingStatus: 'nunca_fumou' as const,
        alcoholConsumption: 'social' as const,
        exerciseActivities: [
          { type: 'corrida', frequency: 3, duration: 45, intensity: 'moderada' as const },
          { type: 'musculação', frequency: 2, duration: 60, intensity: 'intensa' as const },
        ],
        firstSunlightExposureTime: '06:30',
        lastMealTime: '19:00',
      }

      // #when
      const result = await upsertMedicalProfile(input)

      // #then
      expect(result).toEqual({ success: true })
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          smokingStatus: 'nunca_fumou',
          alcoholConsumption: 'social',
          exerciseActivities: [
            { type: 'corrida', frequency: 3, duration: 45, intensity: 'moderada' },
            { type: 'musculação', frequency: 2, duration: 60, intensity: 'intensa' },
          ],
        }),
      )
    })

    it('deve salvar lista de suplementos como array', async () => {
      // #given
      const input = {
        ...baseInput,
        supplementation: ['vitamina D', 'ômega 3', 'magnésio'],
      }

      // #when
      const result = await upsertMedicalProfile(input)

      // #then
      expect(result).toEqual({ success: true })
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          supplementation: ['vitamina D', 'ômega 3', 'magnésio'],
        }),
      )
    })
  })

  describe('validação dos campos avançados', () => {
    it('deve rejeitar sleepQuality fora do intervalo 1-10', async () => {
      // #given
      const input = { ...baseInput, sleepQuality: 11 }

      // #when
      const result = await upsertMedicalProfile(input)

      // #then
      expect(result.success).toBe(false)
    })

    it('deve rejeitar stressLevel fora do intervalo 1-10', async () => {
      // #given
      const input = { ...baseInput, stressLevel: 0 }

      // #when
      const result = await upsertMedicalProfile(input)

      // #then
      expect(result.success).toBe(false)
    })

    it('deve rejeitar smokingStatus inválido', async () => {
      // #given
      const input = { ...baseInput, smokingStatus: 'fumante_social' as never }

      // #when
      const result = await upsertMedicalProfile(input)

      // #then
      expect(result.success).toBe(false)
    })

    it('deve rejeitar exerciseActivities com intensity inválida', async () => {
      // #given
      const input = {
        ...baseInput,
        exerciseActivities: [
          { type: 'corrida', frequency: 3, duration: 45, intensity: 'extrema' as never },
        ],
      }

      // #when
      const result = await upsertMedicalProfile(input)

      // #then
      expect(result.success).toBe(false)
    })

    it('deve aceitar exerciseActivities vazio (lista sem atividades)', async () => {
      // #given
      const input = { ...baseInput, exerciseActivities: [] }

      // #when
      const result = await upsertMedicalProfile(input)

      // #then
      expect(result).toEqual({ success: true })
    })
  })
})
