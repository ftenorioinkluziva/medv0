// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { ProfileCard, RecentDocsCard } from '@/app/app/dashboard/dashboard-content'

describe('Dashboard content components', () => {
  it('renders profile card with age, gender, weight and body fat deltas', () => {
    render(
      <ProfileCard
        userName="Maria Silva"
        profile={{
          age: 33,
          gender: 'female',
          height: 165,
          weight: '72.5',
          bodyFatPercentage: '24.3',
          muscleMass: '42.1',
          inbodyScore: 82,
        }}
        bodyComposition={{
          weight: '72.5',
          bodyFat: '24.3',
          measuredAt: '2026-04-22T10:00:00.000Z',
          weightDelta: '-0.5',
          bodyFatDelta: 'estável',
        }}
      />,
    )

    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(screen.getByText('33 anos • Feminino')).toBeInTheDocument()
    expect(screen.getByText('72.5 kg')).toBeInTheDocument()
    expect(screen.getByText('-0.5 vs último registro')).toBeInTheDocument()
    expect(screen.getByText('24.3%')).toBeInTheDocument()
    expect(screen.getByText('Estável vs último registro')).toBeInTheDocument()
    expect(screen.getByText('InBody Score')).toBeInTheDocument()
  })

  it('renders recent documents with category badge, status and analysis link', () => {
    render(
      <RecentDocsCard
        docs={[
          {
            id: 'doc-1',
            originalFileName: 'Hemograma Abril.pdf',
            category: 'blood_test',
            examDate: '2026-04-20',
            processingStatus: 'completed',
            createdAt: new Date('2026-04-20T08:00:00.000Z'),
          },
        ]}
        livingAnalysisId="analysis-123"
      />,
    )

    expect(screen.getByText('Hemograma Abril.pdf')).toBeInTheDocument()
    expect(screen.getByText('Exames de Sangue')).toBeInTheDocument()
    expect(screen.getByText('Processado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver análise' })).toHaveAttribute(
      'href',
      '/app/analyses/analysis-123',
    )
  })
})
