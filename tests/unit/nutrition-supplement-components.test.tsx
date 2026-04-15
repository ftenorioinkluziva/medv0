// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NutritionPlanView } from '@/components/structured-outputs/nutrition-plan-view'
import { SupplementPlanView } from '@/components/structured-outputs/supplement-plan-view'
import { getStructuredComponent } from '@/components/structured-outputs/registry'
import { WorkoutPlanView } from '@/components/structured-outputs/workout-plan-view'

// ---------------------------------------------------------------------------
// Registry — detector AC1/AC2 (novos agentes)
// ---------------------------------------------------------------------------

describe('getStructuredComponent — novos agentes (Story 10.3)', () => {
  it('retorna NutritionPlanView para "Plano Alimentar"', () => {
    // #given / #when
    const Component = getStructuredComponent('Plano Alimentar')

    // #then
    expect(Component).toBe(NutritionPlanView)
  })

  it('retorna SupplementPlanView para "Plano de Suplementação"', () => {
    // #given / #when
    const Component = getStructuredComponent('Plano de Suplementação')

    // #then
    expect(Component).toBe(SupplementPlanView)
  })

  it('ainda retorna WorkoutPlanView para "Plano de Exercícios" (regressão)', () => {
    // #given / #when
    const Component = getStructuredComponent('Plano de Exercícios')

    // #then
    expect(Component).toBe(WorkoutPlanView)
  })
})

// ---------------------------------------------------------------------------
// NutritionPlanView — AC5
// ---------------------------------------------------------------------------

const SAMPLE_NUTRITION = {
  overview: 'Plano focado em alimentação anti-inflamatória',
  weeklyGoal: 'Reduzir inflamação e melhorar energia',
  meals: [
    {
      meal: 'Café da manhã',
      time: '07:00',
      foods: ['Aveia com frutas vermelhas', 'Ovos mexidos', 'Café sem açúcar'],
      calories: 450,
      macros: { protein: '25g', carbs: '50g', fat: '15g' },
    },
    {
      meal: 'Almoço',
      time: '12:00',
      foods: ['Arroz integral', 'Frango grelhado', 'Salada verde'],
      calories: 600,
    },
    {
      meal: 'Jantar',
      foods: ['Salmão assado', 'Legumes no vapor'],
    },
  ],
  restrictions: ['Glúten', 'Lactose'],
  hydration: 'Beba ao menos 2,5L de água por dia',
  notes: 'Evite alimentos ultraprocessados',
}

describe('NutritionPlanView — AC5', () => {
  it('exibe overview no topo', () => {
    // #given / #when
    render(<NutritionPlanView data={SAMPLE_NUTRITION} />)

    // #then
    expect(screen.getByText('Plano focado em alimentação anti-inflamatória')).toBeInTheDocument()
  })

  it('exibe meta semanal destacada', () => {
    // #given / #when
    render(<NutritionPlanView data={SAMPLE_NUTRITION} />)

    // #then
    expect(screen.getByText('Meta semanal')).toBeInTheDocument()
    expect(screen.getByText('Reduzir inflamação e melhorar energia')).toBeInTheDocument()
  })

  it('exibe card para cada refeição', () => {
    // #given / #when
    render(<NutritionPlanView data={SAMPLE_NUTRITION} />)

    // #then
    expect(screen.getByText('Café da manhã')).toBeInTheDocument()
    expect(screen.getByText('Almoço')).toBeInTheDocument()
    expect(screen.getByText('Jantar')).toBeInTheDocument()
  })

  it('exibe horário em badge quando presente', () => {
    // #given / #when
    render(<NutritionPlanView data={SAMPLE_NUTRITION} />)

    // #then
    expect(screen.getByText('07:00')).toBeInTheDocument()
  })

  it('exibe calorias em badge quando presente', () => {
    // #given / #when
    render(<NutritionPlanView data={SAMPLE_NUTRITION} />)

    // #then
    expect(screen.getByText('450 kcal')).toBeInTheDocument()
  })

  it('exibe alimentos como lista', () => {
    // #given / #when
    render(<NutritionPlanView data={SAMPLE_NUTRITION} />)

    // #then
    expect(screen.getByText('Aveia com frutas vermelhas')).toBeInTheDocument()
    expect(screen.getByText('Salmão assado')).toBeInTheDocument()
  })

  it('exibe macros quando presentes', () => {
    // #given / #when
    render(<NutritionPlanView data={SAMPLE_NUTRITION} />)

    // #then
    expect(screen.getByText('P: 25g')).toBeInTheDocument()
    expect(screen.getByText('C: 50g')).toBeInTheDocument()
    expect(screen.getByText('G: 15g')).toBeInTheDocument()
  })

  it('exibe restrições alimentares', () => {
    // #given / #when
    render(<NutritionPlanView data={SAMPLE_NUTRITION} />)

    // #then
    expect(screen.getByText('Glúten')).toBeInTheDocument()
    expect(screen.getByText('Lactose')).toBeInTheDocument()
    expect(screen.getByText('Restrições:')).toBeInTheDocument()
  })

  it('exibe orientação de hidratação', () => {
    // #given / #when
    render(<NutritionPlanView data={SAMPLE_NUTRITION} />)

    // #then
    expect(screen.getByText('Beba ao menos 2,5L de água por dia')).toBeInTheDocument()
  })

  it('não crasha com dados mínimos', () => {
    // #given
    const minimal = {
      overview: 'Plano básico',
      weeklyGoal: 'Saúde geral',
      meals: [{ meal: 'Café', foods: ['Café com leite'] }],
    }

    // #when / #then
    expect(() => render(<NutritionPlanView data={minimal} />)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// SupplementPlanView — AC5
// ---------------------------------------------------------------------------

const SAMPLE_SUPPLEMENT = {
  overview: 'Plano de suplementação para suporte imunológico e energético',
  supplements: [
    {
      name: 'Vitamina D3',
      dosage: '2000 UI',
      timing: 'Manhã com refeição',
      purpose: 'Suporte imunológico e saúde óssea',
      interactions: ['Evitar com anticoagulantes sem orientação médica'],
    },
    {
      name: 'Ômega-3',
      dosage: '1g',
      timing: 'Almoço',
      purpose: 'Redução de inflamação cardiovascular',
    },
    {
      name: 'Magnésio Bisglicinato',
      dosage: '300mg',
      timing: 'Noite antes de dormir',
      purpose: 'Relaxamento muscular e qualidade do sono',
    },
  ],
  reviewDate: 'Julho 2026',
  warnings: ['Não iniciar suplementação sem consulta médica se usar anticoagulantes'],
  notes: 'Reavalie com médico após 90 dias',
}

describe('SupplementPlanView — AC5', () => {
  it('exibe overview no topo', () => {
    // #given / #when
    render(<SupplementPlanView data={SAMPLE_SUPPLEMENT} />)

    // #then
    expect(screen.getByText('Plano de suplementação para suporte imunológico e energético')).toBeInTheDocument()
  })

  it('exibe warnings destacados', () => {
    // #given / #when
    render(<SupplementPlanView data={SAMPLE_SUPPLEMENT} />)

    // #then
    expect(screen.getByText('Avisos importantes')).toBeInTheDocument()
    expect(screen.getByText('Não iniciar suplementação sem consulta médica se usar anticoagulantes')).toBeInTheDocument()
  })

  it('exibe card para cada suplemento', () => {
    // #given / #when
    render(<SupplementPlanView data={SAMPLE_SUPPLEMENT} />)

    // #then
    expect(screen.getByText('Vitamina D3')).toBeInTheDocument()
    expect(screen.getByText('Ômega-3')).toBeInTheDocument()
    expect(screen.getByText('Magnésio Bisglicinato')).toBeInTheDocument()
  })

  it('exibe dosagem em badge', () => {
    // #given / #when
    render(<SupplementPlanView data={SAMPLE_SUPPLEMENT} />)

    // #then
    expect(screen.getByText('2000 UI')).toBeInTheDocument()
    expect(screen.getByText('1g')).toBeInTheDocument()
  })

  it('exibe timing de cada suplemento', () => {
    // #given / #when
    render(<SupplementPlanView data={SAMPLE_SUPPLEMENT} />)

    // #then
    expect(screen.getByText('Manhã com refeição')).toBeInTheDocument()
    expect(screen.getByText('Noite antes de dormir')).toBeInTheDocument()
  })

  it('exibe propósito de cada suplemento', () => {
    // #given / #when
    render(<SupplementPlanView data={SAMPLE_SUPPLEMENT} />)

    // #then
    expect(screen.getByText('Suporte imunológico e saúde óssea')).toBeInTheDocument()
    expect(screen.getByText('Relaxamento muscular e qualidade do sono')).toBeInTheDocument()
  })

  it('exibe interações quando presentes', () => {
    // #given / #when
    render(<SupplementPlanView data={SAMPLE_SUPPLEMENT} />)

    // #then
    expect(screen.getByText('Interações:')).toBeInTheDocument()
    expect(screen.getByText('Evitar com anticoagulantes sem orientação médica')).toBeInTheDocument()
  })

  it('exibe data de revisão', () => {
    // #given / #when
    render(<SupplementPlanView data={SAMPLE_SUPPLEMENT} />)

    // #then
    expect(screen.getByText('Revisão recomendada:')).toBeInTheDocument()
    expect(screen.getByText('Julho 2026')).toBeInTheDocument()
  })

  it('não exibe warnings quando ausentes', () => {
    // #given
    const noWarnings = {
      overview: 'Plano simples',
      supplements: [{ name: 'Vitamina C', dosage: '500mg', timing: 'Manhã', purpose: 'Imunidade' }],
    }

    // #when
    render(<SupplementPlanView data={noWarnings} />)

    // #then
    expect(screen.queryByText('Avisos importantes')).not.toBeInTheDocument()
  })

  it('não crasha com dados mínimos', () => {
    // #given
    const minimal = {
      overview: 'Plano básico',
      supplements: [{ name: 'Vitamina C', dosage: '500mg', timing: 'Manhã', purpose: 'Imunidade' }],
    }

    // #when / #then
    expect(() => render(<SupplementPlanView data={minimal} />)).not.toThrow()
  })
})
