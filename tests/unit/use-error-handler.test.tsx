// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useErrorHandler } from '@/hooks/use-error-handler'

describe('useErrorHandler', () => {
  it('starts with no error', () => {
    const { result } = renderHook(() => useErrorHandler())

    expect(result.current.errorMessage).toBeNull()
  })

  it('sets and clears error message', () => {
    const { result } = renderHook(() => useErrorHandler())

    act(() => {
      result.current.handleError('Algo deu errado')
    })

    expect(result.current.errorMessage).toBe('Algo deu errado')

    act(() => {
      result.current.clearError()
    })

    expect(result.current.errorMessage).toBeNull()
  })
})
