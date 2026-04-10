import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    user: { id: 'admin-1', role: 'admin', email: 'admin@test.com', name: 'Admin', onboardingCompleted: true },
  }),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db/queries/knowledge', () => ({
  getArticleById: vi.fn(),
  getAllArticlesForAdmin: vi.fn(),
  searchArticles: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { db } from '@/lib/db/client'
import { getArticleById, getAllArticlesForAdmin, searchArticles } from '@/lib/db/queries/knowledge'
import { deleteArticleAction } from '@/app/admin/knowledge/_actions/knowledge'
import type { KnowledgeBase } from '@/lib/db/schema'

const mockArticle: KnowledgeBase = {
  id: 'article-1',
  title: 'Artigo de Teste',
  content: 'Conteúdo do artigo de teste para validação',
  summary: null,
  source: null,
  author: null,
  publishedDate: null,
  category: 'Nutrição',
  subcategory: null,
  tags: null,
  language: 'pt-BR',
  isVerified: 'unverified',
  usageCount: 3,
  lastAnalyzedAt: null,
  analysisVersion: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('deleteArticleAction', () => {
  it('deletes article and returns success when article exists', async () => {
    // #given
    vi.mocked(getArticleById).mockResolvedValue(mockArticle)
    ;(db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    // #when
    const result = await deleteArticleAction('article-1')

    // #then
    expect(result).toEqual({ success: true })
    expect(db.delete).toHaveBeenCalledTimes(1)
  })

  it('returns error when article does not exist', async () => {
    // #given
    vi.mocked(getArticleById).mockResolvedValue(undefined)

    // #when
    const result = await deleteArticleAction('non-existent-id')

    // #then
    expect(result).toEqual({ error: 'Artigo não encontrado' })
    expect(db.delete).not.toHaveBeenCalled()
  })
})

describe('getAllArticlesForAdmin', () => {
  it('returns all articles ordered by createdAt desc', async () => {
    // #given
    const articles = [mockArticle, { ...mockArticle, id: 'article-2', title: 'Outro Artigo' }]
    vi.mocked(getAllArticlesForAdmin).mockResolvedValue({ data: articles, total: 2 })

    // #when
    const result = await getAllArticlesForAdmin()

    // #then
    expect(result.data).toHaveLength(2)
    expect(result.data[0].id).toBe('article-1')
    expect(result.total).toBe(2)
  })

  it('returns empty array when no articles exist', async () => {
    // #given
    vi.mocked(getAllArticlesForAdmin).mockResolvedValue({ data: [], total: 0 })

    // #when
    const result = await getAllArticlesForAdmin()

    // #then
    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe('searchArticles', () => {
  it('filters articles by title', async () => {
    // #given
    vi.mocked(searchArticles).mockResolvedValue([mockArticle])

    // #when
    const result = await searchArticles('Teste')

    // #then
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Artigo de Teste')
    expect(searchArticles).toHaveBeenCalledWith('Teste')
  })

  it('filters articles by category', async () => {
    // #given
    vi.mocked(searchArticles).mockResolvedValue([mockArticle])

    // #when
    const result = await searchArticles('Nutrição')

    // #then
    expect(result).toHaveLength(1)
    expect(result[0].category).toBe('Nutrição')
  })

  it('returns empty array when no matches found', async () => {
    // #given
    vi.mocked(searchArticles).mockResolvedValue([])

    // #when
    const result = await searchArticles('inexistente')

    // #then
    expect(result).toEqual([])
  })
})
