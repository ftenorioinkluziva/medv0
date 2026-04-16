'use client'

import { useCallback, useRef, useState } from 'react'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

type ChatStatus = 'idle' | 'loading' | 'streaming' | 'error'

interface UseChatStreamOptions {
  api: string
  body: Record<string, unknown>
  initialMessages?: ChatMessage[]
  onRateLimit?: () => void
}

interface UseChatStreamReturn {
  messages: ChatMessage[]
  input: string
  status: ChatStatus
  isLoading: boolean
  error: Error | null
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSubmit: (e?: React.FormEvent) => void
  append: (content: string) => Promise<void>
  stop: () => void
}

function generateId(): string {
  return crypto.randomUUID()
}

export function useChatStream({
  api,
  body,
  initialMessages = [],
  onRateLimit,
}: UseChatStreamOptions): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const bodyRef = useRef(body)
  bodyRef.current = body

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStatus('idle')
  }, [])

  const append = useCallback(
    async (content: string) => {
      if (status !== 'idle') return

      setError(null)

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content }
      setMessages((prev) => [...prev, userMsg])
      setStatus('loading')

      const abortController = new AbortController()
      abortRef.current = abortController

      const assistantId = generateId()

      try {
        const response = await fetch(api, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...bodyRef.current, message: content }),
          signal: abortController.signal,
        })

        if (response.status === 429) {
          onRateLimit?.()
          setStatus('idle')
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
          return
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? `Request failed with status ${response.status}`)
        }

        if (!response.body) {
          throw new Error('Empty response body')
        }

        setStatus('streaming')
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let full = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          full += chunk
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m)),
          )
        }

        setStatus('idle')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setStatus('idle')
          return
        }
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setStatus('error')
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      }
    },
    [api, status, onRateLimit],
  )

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const content = input.trim()
      if (!content) return
      setInput('')
      void append(content)
    },
    [input, append],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    [],
  )

  return {
    messages,
    input,
    status,
    isLoading: status !== 'idle' && status !== 'error',
    error,
    handleInputChange,
    handleSubmit,
    append,
    stop,
  }
}
