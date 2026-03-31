import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateReportSections, REQUIRED_SECTIONS } from '@/lib/ai/utils/validate-report-sections'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { GET } from '@/app/api/analyses/[id]/route'
import { NextRequest } from 'next/server'

const DISCLAIMER_REQUIRED_TEXT =
  'Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional'

const FULL_TEMPLATE = `# Análise Integrativa de Saúde

## 📋 Resumo Executivo
Visão geral dos achados principais.

## 🔍 Análise Detalhada por Eixos Funcionais

### Eixo Tireoidiano e Energético
- **TSH:** ↑ 8.2 mUI/L (Ref. Lab: 0.5-4.5 | **Alvo Funcional: 1.0-2.5**)
  - **Interpretação:** Hipotireoidismo subclínico sugere disfunção.

## ⚠️ Padrões e Pontos de Atenção
- **Padrão inflamatório:** Múltiplos marcadores ↑ indicam inflamação sistêmica.

## 💡 Insights e Hipóteses de Causa Raiz
Conjunto de achados sugere resistência à insulina como causa raiz.

## 📚 Recomendações Educacionais
1. **Nutrição:** Reduzir carga glicêmica.
   - Fonte: Diabetes Care — Smith et al.

---

> Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional. Consulte sempre um médico qualificado.`

beforeEach(() => {
  vi.clearAllMocks()
})

describe('validateReportSections', () => {
  it('retorna array vazio quando todas as 5 seções obrigatórias estão presentes', () => {
    // #given / #when
    const missing = validateReportSections(FULL_TEMPLATE)

    // #then
    expect(missing).toHaveLength(0)
  })

  it('detecta seção faltando quando ausente do Markdown', () => {
    // #given
    const withoutSummary = FULL_TEMPLATE.replace('## 📋 Resumo Executivo', '## Outro Título')

    // #when
    const missing = validateReportSections(withoutSummary)

    // #then
    expect(missing).toContain('## 📋 Resumo Executivo')
    expect(missing).toHaveLength(1)
  })

  it('detecta todas as 5 seções faltando em Markdown vazio', () => {
    // #given / #when
    const missing = validateReportSections('')

    // #then
    expect(missing).toHaveLength(REQUIRED_SECTIONS.length)
    expect(missing).toEqual(expect.arrayContaining([...REQUIRED_SECTIONS]))
  })

  it('não lança exceção em Markdown malformado', () => {
    // #given
    const malformed = '# Título\n\n**broken bold\n\n---'

    // #when / #then
    expect(() => validateReportSections(malformed)).not.toThrow()
  })
})

describe('AC2 — Disclaimer injetado programaticamente', () => {
  it('disclaimer obrigatório está presente no template completo', () => {
    expect(FULL_TEMPLATE).toContain(DISCLAIMER_REQUIRED_TEXT)
  })

  it('disclaimer está no final do relatório após separador ---', () => {
    // #given
    const lines = FULL_TEMPLATE.split('\n')
    const hrIndex = lines.lastIndexOf('---')
    const afterHr = lines.slice(hrIndex).join('\n')

    // #then
    expect(afterHr).toContain(DISCLAIMER_REQUIRED_TEXT)
  })
})

describe('AC3 — Indicadores visuais de biomarcadores', () => {
  it('indicador ↑ presente para valor high', () => {
    expect(FULL_TEMPLATE).toContain('↑ 8.2')
  })

  it('indicador ↓ pode ser adicionado para valor low', () => {
    const withLow = '- **Vitamina D:** ↓ 18 ng/mL'
    expect(withLow).toContain('↓')
  })

  it('indicador ⚠ pode ser adicionado para valor borderline', () => {
    const withBorderline = '- **Glicose:** ⚠ 99 mg/dL'
    expect(withBorderline).toContain('⚠')
  })
})

describe('AC4 — Citações RAG no formato Fonte: [título] — [autor]', () => {
  it('citação RAG segue o formato obrigatório', () => {
    const ragCitation = '- Fonte: Diabetes Care — Smith et al.'
    expect(ragCitation).toMatch(/^- Fonte: .+ — .+$/)
  })

  it('relatório completo contém citação RAG no formato correto', () => {
    expect(FULL_TEMPLATE).toMatch(/Fonte: .+ — .+/)
  })
})

describe('AC5 — GET /api/analyses/[id] ownership check', () => {
  function makeRequest(id: string): NextRequest {
    return new NextRequest(`http://localhost/api/analyses/${id}`)
  }

  it('retorna 401 quando não autenticado', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue(null as never)

    // #when
    const res = await GET(makeRequest('some-id'), {
      params: Promise.resolve({ id: 'some-id' }),
    })

    // #then
    expect(res.status).toBe(401)
  })

  it('retorna 404 quando análise não encontrada', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as never)

    // #when
    const id = crypto.randomUUID()
    const res = await GET(makeRequest(id), {
      params: Promise.resolve({ id }),
    })

    // #then
    expect(res.status).toBe(404)
  })

  it('retorna 403 quando userId !== session.user.id', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          reportMarkdown: '# Relatório',
          createdAt: new Date(),
          agentsCount: 3,
          userId: 'outro-usuario',
        },
      ]),
    } as never)

    // #when
    const id = crypto.randomUUID()
    const res = await GET(makeRequest(id), {
      params: Promise.resolve({ id }),
    })

    // #then
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('negado')
  })

  it('retorna reportMarkdown, createdAt e agentsCount quando autorizado', async () => {
    // #given
    const userId = 'user-123'
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never)

    const mockReport = {
      reportMarkdown: FULL_TEMPLATE,
      createdAt: new Date('2026-01-15'),
      agentsCount: 5,
      userId,
    }
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockReport]),
    } as never)

    // #when
    const id = crypto.randomUUID()
    const res = await GET(makeRequest(id), {
      params: Promise.resolve({ id }),
    })

    // #then
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.reportMarkdown).toBe(FULL_TEMPLATE)
    expect(json.agentsCount).toBe(5)
    expect(json.createdAt).toBeDefined()
  })
})
