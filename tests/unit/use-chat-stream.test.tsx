// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChatStream } from '@/hooks/use-chat-stream'

function makeTextStream(chunks: string[]) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

function makeResponse(chunks: string[], status = 200): Response {
  return new Response(makeTextStream(chunks), {
    status,
    headers: { 'content-type': 'text/plain' },
  })
}

const SESSION_ID = 'sess-uuid-1234'
const AGENT_ID = 'agent-uuid-1234'

const DEFAULT_OPTS = {
  api: '/api/chat',
  body: { sessionId: SESSION_ID, agentId: AGENT_ID },
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─────────────────────────────────────────────────────────────────
// Estado inicial
// ─────────────────────────────────────────────────────────────────

describe('useChatStream — estado inicial', () => {
  it('inicia com messages vazio e status idle', () => {
    // #given / #when
    const { result } = renderHook(() => useChatStream(DEFAULT_OPTS))

    // #then
    expect(result.current.messages).toHaveLength(0)
    expect(result.current.status).toBe('idle')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.input).toBe('')
  })

  it('aceita initialMessages e as exibe', () => {
    // #given
    const initial = [
      { id: 'm1', role: 'user' as const, content: 'Oi' },
      { id: 'm2', role: 'assistant' as const, content: 'Olá!' },
    ]

    // #when
    const { result } = renderHook(() =>
      useChatStream({ ...DEFAULT_OPTS, initialMessages: initial }),
    )

    // #then
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].content).toBe('Oi')
  })
})

// ─────────────────────────────────────────────────────────────────
// handleInputChange + handleSubmit
// ─────────────────────────────────────────────────────────────────

describe('useChatStream — input', () => {
  it('atualiza input via handleInputChange', () => {
    // #given
    const { result } = renderHook(() => useChatStream(DEFAULT_OPTS))

    // #when
    act(() => {
      result.current.handleInputChange({
        target: { value: 'Qual é minha vitamina D?' },
      } as React.ChangeEvent<HTMLInputElement>)
    })

    // #then
    expect(result.current.input).toBe('Qual é minha vitamina D?')
  })

  it('handleSubmit não envia quando input vazio', async () => {
    // #given
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useChatStream(DEFAULT_OPTS))

    // #when
    await act(async () => {
      result.current.handleSubmit()
    })

    // #then
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.messages).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────
// Streaming — mensagens aparecem progressivamente (AC3)
// ─────────────────────────────────────────────────────────────────

describe('useChatStream — streaming', () => {
  it('adiciona mensagem do usuário imediatamente', async () => {
    // #given
    vi.mocked(fetch).mockResolvedValue(makeResponse(['Olá!']))
    const { result } = renderHook(() => useChatStream(DEFAULT_OPTS))

    // #when
    act(() => {
      result.current.handleInputChange({
        target: { value: 'Oi' },
      } as React.ChangeEvent<HTMLInputElement>)
    })
    await act(async () => {
      result.current.handleSubmit()
    })

    // #then — mensagem do usuário aparece antes do fetch resolver
    expect(result.current.messages.some((m) => m.role === 'user' && m.content === 'Oi')).toBe(true)
    await waitFor(() => expect(result.current.status).toBe('idle'))
  })

  it('constrói resposta do agente progressivamente e status vai idle após conclusão', async () => {
    // #given
    vi.mocked(fetch).mockResolvedValue(makeResponse(['Ol', 'á ', 'Paciente!']))
    const { result } = renderHook(() => useChatStream(DEFAULT_OPTS))

    // #when
    await act(async () => {
      await result.current.append('Oi')
    })

    // #then
    await waitFor(() => expect(result.current.status).toBe('idle'))
    const assistantMsg = result.current.messages.find((m) => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('Olá Paciente!')
  })

  it('envia body com sessionId, agentId e message', async () => {
    // #given
    vi.mocked(fetch).mockResolvedValue(makeResponse(['ok']))
    const { result } = renderHook(() => useChatStream(DEFAULT_OPTS))

    // #when
    await act(async () => {
      await result.current.append('minha dúvida')
    })

    // #then
    expect(fetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sessionId: SESSION_ID, agentId: AGENT_ID, message: 'minha dúvida' }),
      }),
    )
  })

  it('input é limpo após handleSubmit', async () => {
    // #given
    vi.mocked(fetch).mockResolvedValue(makeResponse(['ok']))
    const { result } = renderHook(() => useChatStream(DEFAULT_OPTS))

    act(() => {
      result.current.handleInputChange({
        target: { value: 'teste' },
      } as React.ChangeEvent<HTMLInputElement>)
    })

    // #when
    await act(async () => {
      result.current.handleSubmit()
    })

    // #then
    expect(result.current.input).toBe('')
    await waitFor(() => expect(result.current.status).toBe('idle'))
  })
})

// ─────────────────────────────────────────────────────────────────
// Rate limit — UI feedback (AC6)
// ─────────────────────────────────────────────────────────────────

describe('useChatStream — rate limit', () => {
  it('chama onRateLimit e remove mensagem do usuário ao receber 429', async () => {
    // #given
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 429 }))
    const onRateLimit = vi.fn()
    const { result } = renderHook(() => useChatStream({ ...DEFAULT_OPTS, onRateLimit }))

    // #when
    await act(async () => {
      await result.current.append('teste')
    })

    // #then
    expect(onRateLimit).toHaveBeenCalledOnce()
    expect(result.current.messages).toHaveLength(0)
    expect(result.current.status).toBe('idle')
  })
})

// ─────────────────────────────────────────────────────────────────
// Erro genérico
// ─────────────────────────────────────────────────────────────────

describe('useChatStream — erro', () => {
  it('define status error e armazena error quando fetch falha com 500', async () => {
    // #given
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }),
    )
    const { result } = renderHook(() => useChatStream(DEFAULT_OPTS))

    // #when
    await act(async () => {
      await result.current.append('oi')
    })

    // #then
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).not.toBeNull()
  })

  it('não envia nova mensagem enquanto já está processando (status !== idle)', async () => {
    // #given
    let resolveFirst!: (v: Response) => void
    const firstFetch = new Promise<Response>((r) => { resolveFirst = r })
    vi.mocked(fetch).mockReturnValueOnce(firstFetch as Promise<Response>)
    const fetchMock = vi.mocked(fetch)

    const { result } = renderHook(() => useChatStream(DEFAULT_OPTS))

    // #when — primeiro append (fica em loading)
    act(() => { void result.current.append('primeira') })

    // tentar segundo append enquanto loading
    await act(async () => { await result.current.append('segunda') })

    // #then — apenas 1 fetch (a segunda foi ignorada)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // cleanup
    resolveFirst(makeResponse(['ok']))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
