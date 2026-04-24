'use client'

import { useCallback, useState } from 'react'

export function useErrorHandler() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  const handleError = useCallback((message: string) => {
    setErrorMessage(message)
  }, [])

  return {
    errorMessage,
    handleError,
    clearError,
  }
}
