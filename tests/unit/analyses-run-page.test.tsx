// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RunAnalysisPage from '@/app/app/analyses/run/page'

const mockReplace = vi.fn()
const mockRefresh = vi.fn()
let mockDocumentId = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  useSearchParams: () => ({ get: (key: string) => (key === 'documentId' ? mockDocumentId : null) }),
}))

describe('RunAnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('shows validation error for invalid documentId and allows retry', async () => {
    mockDocumentId = 'invalid-id'

    render(<RunAnalysisPage />)

    await screen.findByText('Nao foi possivel iniciar a analise')
    expect(screen.getByText('Documento invalido para iniciar analise.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('redirects to analysis page when API returns livingAnalysisId', async () => {
    mockDocumentId = '11111111-1111-4111-8111-111111111111'

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ livingAnalysisId: '22222222-2222-4222-8222-222222222222' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    render(<RunAnalysisPage />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/app/analyses/22222222-2222-4222-8222-222222222222')
    })
  })
})
