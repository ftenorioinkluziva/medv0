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

vi.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: vi.fn(),
}))

import { db } from '@/lib/db/client'
import { getUserById, getAllUsersForAdmin } from '@/lib/db/queries/users'
import { requireAdmin } from '@/lib/auth/require-admin'
import { toggleUserActiveAction } from '@/app/admin/users/_actions/users'
import type { User } from '@/lib/db/schema'
import type { UserForAdmin } from '@/lib/db/queries/users'

const mockAdminSession = {
  user: { id: 'admin-1', role: 'admin', email: 'admin@test.com', name: 'Admin', onboardingCompleted: true },
} as never

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
  vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession)
})

describe('toggleUserActiveAction', () => {
  it('deactivates user and returns success', async () => {
    // #given
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
    vi.mocked(getUserById).mockResolvedValue(undefined)

    // #when
    const result = await toggleUserActiveAction('non-existent-id', false)

    // #then
    expect(result).toEqual({ error: 'Usuário não encontrado' })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('blocks admin from deactivating own account', async () => {
    // #given — requireAdmin returns session with id: 'admin-1'

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
    vi.mocked(getAllUsersForAdmin).mockResolvedValue({ data: [mockUserForAdmin], total: 1 })

    // #when
    const result = await getAllUsersForAdmin()

    // #then
    expect(result.data).toHaveLength(1)
    expect(result.data[0].documentsCount).toBe(3)
    expect(result.data[0].analysesCount).toBe(2)
    expect(result.total).toBe(1)
  })

  it('returns empty array when no users exist', async () => {
    // #given
    vi.mocked(getAllUsersForAdmin).mockResolvedValue({ data: [], total: 0 })

    // #when
    const result = await getAllUsersForAdmin()

    // #then
    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
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
