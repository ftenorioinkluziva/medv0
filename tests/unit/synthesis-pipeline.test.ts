import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/client', () => ({ db: {} }))

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('@/lib/ai/core/resolve-model', () => ({
  resolveModel: vi.fn((model: string) => `resolved:${model}`),
}))

import { generateText } from 'ai'
import { resolveModel } from '@/lib/ai/core/resolve-model'
import { runSynthesisPhase } from '@/lib/ai/orchestrator/pipeline'

const agentOutput = {
  agentId: 'agent-1',
  agentName: 'Nutrição',
  role: 'specialized',
  content: 'Análise nutricional completa.',
  status: 'completed' as const,
}

const baseParams = {
  outputs: [agentOutput],
  snapshotContext: '{"glucose": 99}',
  globalDeadline: Date.now() + 60_000,
  synthesisTimeoutMs: 30_000,
  synthesisPrompt: 'Consolide as análises.',
  disclaimerText: 'Não substitui consulta médica.',
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  delete process.env.SYNTHESIS_MODEL
})

describe('runSynthesisPhase — resolveModel wiring', () => {
  it('chama resolveModel com o modelo padrão e passa o resultado ao generateText', async () => {
    // #given
    vi.mocked(generateText).mockResolvedValue({ text: 'Relatório consolidado.' } as never)

    // #when
    await runSynthesisPhase(baseParams)

    // #then — wiring: resolveModel must be called, and generateText must receive its return value
    expect(resolveModel).toHaveBeenCalledWith('google/gemini-2.5-flash')
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'resolved:google/gemini-2.5-flash' }),
    )
  })

  it('usa synthesisModel do params quando fornecido em vez do padrão', async () => {
    // #given
    vi.mocked(generateText).mockResolvedValue({ text: 'Relatório.' } as never)

    // #when
    await runSynthesisPhase({ ...baseParams, synthesisModel: 'google/gemini-2.5-pro' })

    // #then
    expect(resolveModel).toHaveBeenCalledWith('google/gemini-2.5-pro')
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'resolved:google/gemini-2.5-pro' }),
    )
  })

  it('usa SYNTHESIS_MODEL env var quando synthesisModel não está nos params', async () => {
    // #given
    process.env.SYNTHESIS_MODEL = 'google/gemini-2.5-pro'
    vi.mocked(generateText).mockResolvedValue({ text: 'Relatório.' } as never)

    // #when
    await runSynthesisPhase(baseParams)

    // #then
    expect(resolveModel).toHaveBeenCalledWith('google/gemini-2.5-pro')
  })

  it('synthesisModel do params tem precedência sobre SYNTHESIS_MODEL env var', async () => {
    // #given
    process.env.SYNTHESIS_MODEL = 'google/gemini-2.5-pro'
    vi.mocked(generateText).mockResolvedValue({ text: 'Relatório.' } as never)

    // #when
    await runSynthesisPhase({ ...baseParams, synthesisModel: 'google/gemini-2.0-flash' })

    // #then
    expect(resolveModel).toHaveBeenCalledWith('google/gemini-2.0-flash')
  })
})

describe('runSynthesisPhase — output formatting', () => {
  it('retorna markdown formatado com disclaimer quando generateText tem sucesso', async () => {
    // #given
    vi.mocked(generateText).mockResolvedValue({ text: 'Síntese final.' } as never)

    // #when
    const result = await runSynthesisPhase(baseParams)

    // #then
    expect(result).toContain('Síntese final.')
    expect(result).toContain('Não substitui consulta médica.')
    expect(result).toMatch(/Síntese final\..*---.*Não substitui/s)
  })

  it('chama validate com o relatório gerado', async () => {
    // #given
    vi.mocked(generateText).mockResolvedValue({ text: 'Relatório OK.' } as never)
    const validate = vi.fn()

    // #when
    await runSynthesisPhase({ ...baseParams, validate })

    // #then
    expect(validate).toHaveBeenCalledOnce()
    expect(validate).toHaveBeenCalledWith(expect.stringContaining('Relatório OK.'))
  })

  it('inclui agentName e content no prompt enviado ao generateText', async () => {
    // #given
    vi.mocked(generateText).mockResolvedValue({ text: 'Síntese.' } as never)

    // #when
    await runSynthesisPhase(baseParams)

    // #then
    const call = vi.mocked(generateText).mock.calls[0][0] as { prompt: string }
    expect(call.prompt).toContain('Nutrição')
    expect(call.prompt).toContain('Análise nutricional completa.')
  })
})

describe('runSynthesisPhase — fallback behavior', () => {
  it('lança erro quando outputs está vazio', async () => {
    // #given / #when / #then
    await expect(
      runSynthesisPhase({ ...baseParams, outputs: [] }),
    ).rejects.toThrow('runSynthesisPhase: no agent outputs available for synthesis')
  })

  it('retorna fallback report quando deadline é iminente (<=5s)', async () => {
    // #given — deadline 3 seconds away
    const params = { ...baseParams, globalDeadline: Date.now() + 3_000 }

    // #when
    const result = await runSynthesisPhase(params)

    // #then — resolveModel and generateText must NOT be called (deadline guard)
    expect(resolveModel).not.toHaveBeenCalled()
    expect(generateText).not.toHaveBeenCalled()
    expect(result).toContain('Análise nutricional completa.')
    expect(result).toContain('Não substitui consulta médica.')
  })

  it('retorna fallback report quando generateText falha', async () => {
    // #given
    vi.mocked(generateText).mockRejectedValue(new Error('provider unavailable'))

    // #when
    const result = await runSynthesisPhase(baseParams)

    // #then — swallows error and returns raw agent content + disclaimer
    expect(result).toContain('Análise nutricional completa.')
    expect(result).toContain('Não substitui consulta médica.')
  })

  it('não chama validate quando generateText falha e retorna fallback', async () => {
    // #given
    vi.mocked(generateText).mockRejectedValue(new Error('timeout'))
    const validate = vi.fn()

    // #when
    await runSynthesisPhase({ ...baseParams, validate })

    // #then
    expect(validate).not.toHaveBeenCalled()
  })
})
