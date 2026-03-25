import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

describe('next config', () => {
  it('uses standalone output', () => {
    expect(nextConfig.output).toBe('standalone')
  })
})
