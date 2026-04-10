import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { db } from '@/lib/db/client'
import { getAllUsersForAdmin } from '@/lib/db/queries/users'
import { getAllArticlesForAdmin } from '@/lib/db/queries/knowledge'
import { getAllAgentsForAdmin } from '@/lib/db/queries/health-agents'

function buildUsersRowsChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(rows),
  }
}

function buildSimpleRowsChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(rows),
  }
}

function buildCountChain(total: number) {
  return {
    from: vi.fn().mockResolvedValue([{ count: total }]),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin pagination queries', () => {
  it('users query applies default pagination and returns total', async () => {
    // #given
    const rowsChain = buildUsersRowsChain([{ id: 'u1' }])
    const countChain = buildCountChain(11)

    vi.mocked(db.select)
      .mockReturnValueOnce(rowsChain as never)
      .mockReturnValueOnce(countChain as never)

    // #when
    const result = await getAllUsersForAdmin()

    // #then
    expect(rowsChain.limit).toHaveBeenCalledWith(50)
    expect(rowsChain.offset).toHaveBeenCalledWith(0)
    expect(result.total).toBe(11)
    expect(result.data).toHaveLength(1)
  })

  it('users query applies custom limit and offset', async () => {
    // #given
    const rowsChain = buildUsersRowsChain([{ id: 'u2' }])
    const countChain = buildCountChain(99)

    vi.mocked(db.select)
      .mockReturnValueOnce(rowsChain as never)
      .mockReturnValueOnce(countChain as never)

    // #when
    await getAllUsersForAdmin(20, 40)

    // #then
    expect(rowsChain.limit).toHaveBeenCalledWith(20)
    expect(rowsChain.offset).toHaveBeenCalledWith(40)
  })

  it('knowledge query applies pagination and returns total', async () => {
    // #given
    const rowsChain = buildSimpleRowsChain([{ id: 'k1' }])
    const countChain = buildCountChain(7)

    vi.mocked(db.select)
      .mockReturnValueOnce(rowsChain as never)
      .mockReturnValueOnce(countChain as never)

    // #when
    const result = await getAllArticlesForAdmin(20, 20)

    // #then
    expect(rowsChain.limit).toHaveBeenCalledWith(20)
    expect(rowsChain.offset).toHaveBeenCalledWith(20)
    expect(result.total).toBe(7)
    expect(result.data).toHaveLength(1)
  })

  it('knowledge query falls back to defaults', async () => {
    // #given
    const rowsChain = buildSimpleRowsChain([])
    const countChain = buildCountChain(0)

    vi.mocked(db.select)
      .mockReturnValueOnce(rowsChain as never)
      .mockReturnValueOnce(countChain as never)

    // #when
    await getAllArticlesForAdmin()

    // #then
    expect(rowsChain.limit).toHaveBeenCalledWith(50)
    expect(rowsChain.offset).toHaveBeenCalledWith(0)
  })

  it('agents query applies pagination and returns total', async () => {
    // #given
    const rowsChain = buildSimpleRowsChain([{ id: 'a1' }])
    const countChain = buildCountChain(13)

    vi.mocked(db.select)
      .mockReturnValueOnce(rowsChain as never)
      .mockReturnValueOnce(countChain as never)

    // #when
    const result = await getAllAgentsForAdmin(10, 30)

    // #then
    expect(rowsChain.limit).toHaveBeenCalledWith(10)
    expect(rowsChain.offset).toHaveBeenCalledWith(30)
    expect(result.total).toBe(13)
    expect(result.data).toHaveLength(1)
  })

  it('agents query falls back to defaults', async () => {
    // #given
    const rowsChain = buildSimpleRowsChain([])
    const countChain = buildCountChain(0)

    vi.mocked(db.select)
      .mockReturnValueOnce(rowsChain as never)
      .mockReturnValueOnce(countChain as never)

    // #when
    await getAllAgentsForAdmin()

    // #then
    expect(rowsChain.limit).toHaveBeenCalledWith(50)
    expect(rowsChain.offset).toHaveBeenCalledWith(0)
  })
})
