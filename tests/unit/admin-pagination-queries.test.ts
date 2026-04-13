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

// Chain for subquery builders (docs_count / analyses_count) — needs .as()
function buildSubqueryChain() {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn().mockReturnValue(chain)
  chain.groupBy = vi.fn().mockReturnValue(chain)
  chain.as = vi.fn().mockReturnValue(chain)
  return chain
}

// Chain for the main users rows query — needs leftJoin + orderBy + limit + offset
function buildUsersRowsChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.from = vi.fn().mockReturnValue(chain)
  chain.leftJoin = vi.fn().mockReturnValue(chain)
  chain.orderBy = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.offset = vi.fn().mockResolvedValue(rows)
  return chain
}

// Chain for simple queries (knowledge, agents) — orderBy + limit + offset
function buildSimpleRowsChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn().mockReturnValue(chain)
  chain.orderBy = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.offset = vi.fn().mockResolvedValue(rows)
  return chain
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
  describe('users', () => {
    it('applies default pagination and returns total', async () => {
      // #given
      // getAllUsersForAdmin calls db.select() 4 times:
      // 1. subquery docs_count  2. subquery analyses_count
      // 3. main rows query      4. count query
      const docsSubquery = buildSubqueryChain()
      const analysesSubquery = buildSubqueryChain()
      const rowsChain = buildUsersRowsChain([{ id: 'u1' }])
      const countChain = buildCountChain(11)

      vi.mocked(db.select)
        .mockReturnValueOnce(docsSubquery as never)
        .mockReturnValueOnce(analysesSubquery as never)
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

    it('applies custom limit and offset', async () => {
      // #given
      const docsSubquery = buildSubqueryChain()
      const analysesSubquery = buildSubqueryChain()
      const rowsChain = buildUsersRowsChain([{ id: 'u2' }])
      const countChain = buildCountChain(99)

      vi.mocked(db.select)
        .mockReturnValueOnce(docsSubquery as never)
        .mockReturnValueOnce(analysesSubquery as never)
        .mockReturnValueOnce(rowsChain as never)
        .mockReturnValueOnce(countChain as never)

      // #when
      await getAllUsersForAdmin(20, 40)

      // #then
      expect(rowsChain.limit).toHaveBeenCalledWith(20)
      expect(rowsChain.offset).toHaveBeenCalledWith(40)
    })
  })

  describe('knowledge', () => {
    it('applies pagination and returns total', async () => {
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

    it('falls back to defaults', async () => {
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
  })

  describe('agents', () => {
    it('applies pagination and returns total', async () => {
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

    it('falls back to defaults', async () => {
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
})
