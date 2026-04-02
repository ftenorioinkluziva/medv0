import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/db/queries/users', () => ({
  getUserById: vi.fn(),
  getAllUsersForAdmin: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

import { db } from '@/lib/db/client'
import { getUserById, getAllUsersForAdmin } from '@/lib/db/queries/users'
import { auth } from '@/lib/auth/config'
import { toggleUserActiveAction } from '@/app/admin/users/_actions/users'
import type { User } from '@/lib/db/schema'
import type { UserForAdmin } from '@/lib/db/queries/users'

const mockUser: User = {
  id: 'user-1',
  email: 'paciente@test.com',
  passwordHash: 'hash',
  role: 'patient',
  onboardingCompleted: true,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const mockUserForAdmin: UserForAdmin = {
  id: 'user-1',
  email: 'paciente@test.com',
  role: 'patient',
  isActive: true,
  onboardingCompleted: true,
  createdAt: new Date('2026-01-01'),
  documentsCount: 3,
  analysesCount: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toggleUserActiveAction', () => {
  it('deactivates user and returns success', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1' } } as never)
    vi.mocked(getUserById).mockResolvedValue(mockUser)
    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    // #when
    const result = await toggleUserActiveAction('user-1', false)

    // #then
    expect(result).toEqual({ success: true })
    expect(db.update).toHaveBeenCalledTimes(1)
  })

  it('returns error when user does not exist', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1' } } as never)
    vi.mocked(getUserById).mockResolvedValue(undefined)

    // #when
    const result = await toggleUserActiveAction('non-existent-id', false)

    // #then
    expect(result).toEqual({ error: 'Usuário não encontrado' })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('blocks admin from deactivating own account', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1' } } as never)

    // #when
    const result = await toggleUserActiveAction('admin-1', false)

    // #then
    expect(result).toEqual({ error: 'Não é possível desativar a própria conta.' })
    expect(getUserById).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })
})

describe('getAllUsersForAdmin', () => {
  it('returns all users with counts', async () => {
    // #given
    vi.mocked(getAllUsersForAdmin).mockResolvedValue([mockUserForAdmin])

    // #when
    const result = await getAllUsersForAdmin()

    // #then
    expect(result).toHaveLength(1)
    expect(result[0].documentsCount).toBe(3)
    expect(result[0].analysesCount).toBe(2)
  })

  it('returns empty array when no users exist', async () => {
    // #given
    vi.mocked(getAllUsersForAdmin).mockResolvedValue([])

    // #when
    const result = await getAllUsersForAdmin()

    // #then
    expect(result).toEqual([])
  })
})

describe('getUserById', () => {
  it('returns user when found', async () => {
    // #given
    vi.mocked(getUserById).mockResolvedValue(mockUser)

    // #when
    const result = await getUserById('user-1')

    // #then
    expect(result).toEqual(mockUser)
    expect(getUserById).toHaveBeenCalledWith('user-1')
  })

  it('returns undefined when user not found', async () => {
    // #given
    vi.mocked(getUserById).mockResolvedValue(undefined)

    // #when
    const result = await getUserById('non-existent-id')

    // #then
    expect(result).toBeUndefined()
  })
})
