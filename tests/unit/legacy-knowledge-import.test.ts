import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {},
}))

import {
  mapLegacyArticle,
  normalizeLegacyPublishedDate,
  normalizeLegacyTags,
  type LegacyKnowledgeArticle,
} from '@/lib/db/legacy-knowledge-import'

describe('normalizeLegacyTags', () => {
  it('retorna array limpo quando tags ja sao array de strings', () => {
    // #given
    const tags = [' cardiologia ', 'metabolismo', '']

    // #when
    const result = normalizeLegacyTags(tags)

    // #then
    expect(result).toEqual(['cardiologia', 'metabolismo'])
  })

  it('faz parse de json string com tags', () => {
    // #given
    const tags = '["tdah", "dopamina"]'

    // #when
    const result = normalizeLegacyTags(tags)

    // #then
    expect(result).toEqual(['tdah', 'dopamina'])
  })

  it('retorna null para valor invalido', () => {
    // #given
    const tags = { topic: 'x' }

    // #when
    const result = normalizeLegacyTags(tags)

    // #then
    expect(result).toBeNull()
  })
})

describe('normalizeLegacyPublishedDate', () => {
  it('converte Date para yyyy-mm-dd', () => {
    // #given
    const value = new Date('2024-02-03T10:11:12.000Z')

    // #when
    const result = normalizeLegacyPublishedDate(value)

    // #then
    expect(result).toBe('2024-02-03')
  })

  it('retorna null para data invalida', () => {
    // #given
    const value = 'not-a-date'

    // #when
    const result = normalizeLegacyPublishedDate(value)

    // #then
    expect(result).toBeNull()
  })
})

describe('mapLegacyArticle', () => {
  it('mapeia artigo legado para formato do destino', () => {
    // #given
    const article: LegacyKnowledgeArticle = {
      id: 'article-1',
      title: 'Titulo',
      category: 'Categoria',
      subcategory: 'Subcategoria',
      content: 'Conteudo',
      summary: 'Resumo',
      source: 'Fonte',
      source_url: null,
      author: 'Autor',
      published_date: new Date('2024-01-15T12:00:00.000Z'),
      tags: ['a', 'b'],
      language: 'pt-BR',
      relevance_score: null,
      is_verified: 'verified',
      usage_count: 9,
      created_at: new Date('2024-01-10T12:00:00.000Z'),
      updated_at: new Date('2024-01-20T12:00:00.000Z'),
      last_analyzed_at: new Date('2024-01-21T12:00:00.000Z'),
      analysis_version: 'v1',
    }

    // #when
    const result = mapLegacyArticle(article)

    // #then
    expect(result).toEqual({
      id: 'article-1',
      title: 'Titulo',
      content: 'Conteudo',
      summary: 'Resumo',
      source: 'Fonte',
      author: 'Autor',
      publishedDate: '2024-01-15',
      category: 'Categoria',
      subcategory: 'Subcategoria',
      tags: ['a', 'b'],
      language: 'pt-BR',
      isVerified: 'verified',
      usageCount: 9,
      lastAnalyzedAt: new Date('2024-01-21T12:00:00.000Z'),
      analysisVersion: 'v1',
      createdAt: new Date('2024-01-10T12:00:00.000Z'),
      updatedAt: new Date('2024-01-20T12:00:00.000Z'),
    })
  })
})
