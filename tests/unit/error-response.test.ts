import { describe, it, expect } from 'vitest'
import { errorResponse } from '@/lib/api/error-response'

describe('errorResponse', () => {
  it('returns error message with status', async () => {
    const response = errorResponse('Falha', 400)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'Falha' })
  })

  it('returns error details when provided', async () => {
    const details = { field: 'email', reason: 'invalid' }
    const response = errorResponse('Validation failed', 422, details)
    const payload = await response.json()

    expect(response.status).toBe(422)
    expect(payload).toEqual({ error: 'Validation failed', details })
  })
})
