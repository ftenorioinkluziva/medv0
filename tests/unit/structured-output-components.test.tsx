// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkoutPlanView } from '@/components/structured-outputs/workout-plan-view'
import { GenericStructuredView } from '@/components/structured-outputs/generic-structured-view'
import { getStructuredComponent } from '@/components/structured-outputs/registry'

// ---------------------------------------------------------------------------
// Registry — detector AC1
// ---------------------------------------------------------------------------

describe('getStructuredComponent — detector', () => {
  it('retorna WorkoutPlanView para agente "Plano de Exercícios"', () => {
    // #given / #when
    const Component = getStructuredComponent('Plano de Exercícios')

    // #then
    expect(Component).toBe(WorkoutPlanView)
  })

  it('retorna GenericStructuredView para agente desconhecido', () => {
    // #given / #when
    const Component = getStructuredComponent('Agente Inexistente')

    // #then
    expect(Component).toBe(GenericStructuredView)
  })

  it('retorna GenericStructuredView para string vazia', () => {
    // #given / #when
    const Component = getStructuredComponent('')

    // #then
    expect(Component).toBe(GenericStructuredView)
  })
})

// ---------------------------------------------------------------------------
// WorkoutPlanView — AC2
// ---------------------------------------------------------------------------

const SAMPLE_PLAN = {
  overview: 'Plano voltado para iniciantes com foco cardiovascular',
  weeklyGoal: 'Melhorar resistência e condicionamento físico geral',
  workouts: [
    {
      day: 'Segunda',
      type: 'Cardio',
      duration: '30 min',
      warmup: '5 min de caminhada leve',
      exercises: [
        { name: 'Corrida leve', sets: 3, reps: '10 min', notes: 'Ritmo confortável' },
        { name: 'Pular corda', sets: 2, reps: '5 min' },
      ],
      cooldown: 'Alongamento de 5 minutos',
    },
    {
      day: 'Quarta',
      type: 'Descanso ativo',
    },
  ],
  restDays: ['Domingo'],
  progressionTips: ['Aumente 10% por semana', 'Descanse se sentir dor'],
}

describe('WorkoutPlanView — AC2', () => {
  it('exibe overview no topo', () => {
    // #given / #when
    render(<WorkoutPlanView data={SAMPLE_PLAN} />)

    // #then
    expect(screen.getByText('Plano voltado para iniciantes com foco cardiovascular')).toBeInTheDocument()
  })

  it('exibe meta semanal destacada', () => {
    // #given / #when
    render(<WorkoutPlanView data={SAMPLE_PLAN} />)

    // #then
    expect(screen.getByText('Meta semanal')).toBeInTheDocument()
    expect(screen.getByText('Melhorar resistência e condicionamento físico geral')).toBeInTheDocument()
  })

  it('exibe card para cada dia da semana', () => {
    // #given / #when
    render(<WorkoutPlanView data={SAMPLE_PLAN} />)

    // #then
    expect(screen.getByText('Segunda')).toBeInTheDocument()
    expect(screen.getByText('Quarta')).toBeInTheDocument()
  })

  it('exibe tipo de treino em badge', () => {
    // #given / #when
    render(<WorkoutPlanView data={SAMPLE_PLAN} />)

    // #then
    expect(screen.getByText('Cardio')).toBeInTheDocument()
    expect(screen.getByText('Descanso ativo')).toBeInTheDocument()
  })

  it('exibe duração em badge', () => {
    // #given / #when
    render(<WorkoutPlanView data={SAMPLE_PLAN} />)

    // #then
    expect(screen.getByText('30 min')).toBeInTheDocument()
  })

  it('exibe nome e sets/reps dos exercícios', () => {
    // #given / #when
    render(<WorkoutPlanView data={SAMPLE_PLAN} />)

    // #then
    expect(screen.getByText('Corrida leve')).toBeInTheDocument()
    expect(screen.getByText('Pular corda')).toBeInTheDocument()
  })

  it('exibe dias de descanso', () => {
    // #given / #when
    render(<WorkoutPlanView data={SAMPLE_PLAN} />)

    // #then
    expect(screen.getByText('Domingo')).toBeInTheDocument()
    expect(screen.getByText('Descanso:')).toBeInTheDocument()
  })

  it('exibe dicas de progressão', () => {
    // #given / #when
    render(<WorkoutPlanView data={SAMPLE_PLAN} />)

    // #then
    expect(screen.getByText('Aumente 10% por semana')).toBeInTheDocument()
    expect(screen.getByText('Descanse se sentir dor')).toBeInTheDocument()
  })

  it('não crasha com dados mínimos (apenas campos required)', () => {
    // #given
    const minimal = {
      overview: 'Visão geral',
      weeklyGoal: 'Meta',
      workouts: [{ day: 'Terça', type: 'Força' }],
    }

    // #when / #then
    expect(() => render(<WorkoutPlanView data={minimal} />)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// GenericStructuredView — AC3
// ---------------------------------------------------------------------------

describe('GenericStructuredView — AC3', () => {
  it('renderiza string primitiva sem mostrar raw JSON', () => {
    // #given / #when
    render(<GenericStructuredView data={{ status: 'ativo', score: 8 }} />)

    // #then — shows formatted values, not raw JSON
    expect(screen.getByText('ativo')).toBeInTheDocument()
    expect(screen.queryByText('{')).not.toBeInTheDocument()
    expect(screen.queryByText('}')).not.toBeInTheDocument()
  })

  it('renderiza array de strings como lista', () => {
    // #given / #when
    render(<GenericStructuredView data={{ recomendacoes: ['Dormir cedo', 'Beber água'] }} />)

    // #then
    expect(screen.getByText('Dormir cedo')).toBeInTheDocument()
    expect(screen.getByText('Beber água')).toBeInTheDocument()
  })

  it('converte camelCase para label legível', () => {
    // #given / #when
    render(<GenericStructuredView data={{ weeklyGoal: 'Correr 5km' }} />)

    // #then
    expect(screen.getByText('Weekly Goal')).toBeInTheDocument()
  })

  it('não mostra JSON bruto em nenhum cenário', () => {
    // #given
    const data = { nested: { a: 1, b: 'x' }, list: [1, 2, 3] }

    // #when
    render(<GenericStructuredView data={data} />)

    // #then
    expect(screen.queryByText(/^\{/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^\[/)).not.toBeInTheDocument()
  })

  it('não crasha com dados null/undefined', () => {
    // #given / #when / #then
    expect(() => render(<GenericStructuredView data={null} />)).not.toThrow()
    expect(() => render(<GenericStructuredView data={undefined} />)).not.toThrow()
  })
})
