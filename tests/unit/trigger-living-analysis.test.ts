import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockGetActiveAgentsByRole = vi.fn()
const mockRunLivingAnalysis = vi.fn()

vi.mock('@/lib/db/client', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}))

vi.mock('@/lib/db/schema', () => ({
  documents: { id: 'documents.id' },
  livingAnalyses: {
    id: 'living_analyses.id',
    userId: 'living_analyses.userId',
    currentVersion: 'living_analyses.currentVersion',
  },
  livingAnalysisVersions: {
    id: 'living_analysis_versions.id',
    livingAnalysisId: 'living_analysis_versions.livingAnalysisId',
    createdAt: 'living_analysis_versions.createdAt',
    status: 'living_analysis_versions.status',
    version: 'living_analysis_versions.version',
  },
  snapshots: {
    id: 'snapshots.id',
    documentId: 'snapshots.documentId',
    userId: 'snapshots.userId',
    structuredData: 'snapshots.structuredData',
  },
}))

vi.mock('@/lib/db/queries/health-agents', () => ({
  getActiveAgentsByRole: mockGetActiveAgentsByRole,
}))

vi.mock('@/lib/ai/orchestrator/living-analysis', () => ({
  runLivingAnalysis: mockRunLivingAnalysis,
}))

const { triggerLivingAnalysis } = await import('@/lib/ai/orchestrator/trigger-living-analysis')

function makeLimitChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
}

function makeWhereChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  }
}

describe('triggerLivingAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('marca documento como failed e não roda análise quando o snapshot está vazio', async () => {
    // #given
    mockGetActiveAgentsByRole.mockResolvedValue([{ id: 'agent-1' }])
    mockSelect.mockReturnValueOnce(makeLimitChain([{ structuredData: {
      documentType: 'UNKNOWN',
      overallSummary: 'Não foi possível extrair os dados',
      patientInfo: {},
      modules: [],
    } }]) as never)
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as never)

    // #when
    await triggerLivingAnalysis('user-1', 'doc-1')

    // #then
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockRunLivingAnalysis).not.toHaveBeenCalled()
  })

  it('reagenda o trigger durante a janela de debounce em vez de descartar o documento', async () => {
    // #given
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-03T00:00:00.000Z'))

    mockGetActiveAgentsByRole.mockResolvedValue([{ id: 'agent-1' }])

    mockSelect
      .mockReturnValueOnce(makeLimitChain([{ structuredData: {
        documentType: 'Hemograma',
        overallSummary: 'Resumo válido',
        patientInfo: {},
        modules: [{ moduleName: 'A', category: 'B', status: 'normal', summary: 'ok', parameters: [{ name: 'LDL', value: 100, unit: 'mg/dL' }] }],
      } }]) as never)
      .mockReturnValueOnce(makeLimitChain([{ id: 'living-1' }]) as never)
      .mockReturnValueOnce(makeLimitChain([{ createdAt: new Date('2026-04-02T23:59:30.000Z'), status: 'completed' }]) as never)
      .mockReturnValueOnce(makeLimitChain([{ createdAt: new Date('2026-04-02T23:59:30.000Z'), status: 'completed' }]) as never)
      .mockReturnValueOnce(makeLimitChain([{ id: 'living-1', currentVersion: 1 }]) as never)
      .mockReturnValueOnce(makeWhereChain([{ id: 'snap-1' }]) as never)

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'version-2' }]),
      }),
    } as never)
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as never)

    // #when
    const promise = triggerLivingAnalysis('user-1', 'doc-1')
    await vi.advanceTimersByTimeAsync(31_000)
    await promise

    // #then
    expect(mockInsert).toHaveBeenCalled()
    expect(mockRunLivingAnalysis).toHaveBeenCalledWith('user-1', 'doc-1', 'living-1', 'version-2')
  })
})