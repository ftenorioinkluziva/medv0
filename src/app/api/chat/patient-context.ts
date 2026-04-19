import type { MedicalProfile } from '@/lib/db/schema'
import type { ContextBlock } from './intent'

export type PatientContextInput = {
  profile: MedicalProfile | null
  livingAnalysisReport: string | null
  blocks: Set<ContextBlock>
}

const MAX_ANALYSIS_CHARS = 3000

export function buildPatientContext({ profile, livingAnalysisReport, blocks }: PatientContextInput): string {
  if (!profile) return ''

  const sections: string[] = []

  if (blocks.has('profile_basic')) {
    const bmi = computeBmi(profile.height, String(profile.weight))
    const lines = [
      `- Idade: ${profile.age} anos, ${profile.gender}`,
      `- Altura: ${profile.height} cm | Peso: ${profile.weight} kg${bmi ? ` | IMC: ${bmi}` : ''}`,
      `- Pressão arterial: ${profile.systolicPressure}/${profile.diastolicPressure} mmHg`,
      `- FC repouso: ${profile.restingHeartRate} bpm`,
    ]
    sections.push(`### Perfil Básico\n${lines.join('\n')}`)
  }

  if (blocks.has('objectives_conditions')) {
    const lines: string[] = [`- Objetivos: ${profile.healthObjectives}`]
    if (profile.medicalConditions?.length) lines.push(`- Condições: ${profile.medicalConditions.join(', ')}`)
    if (profile.medications?.length) lines.push(`- Medicamentos: ${profile.medications.join(', ')}`)
    if (profile.allergies?.length) lines.push(`- Alergias: ${profile.allergies.join(', ')}`)
    if (profile.surgeries?.length) lines.push(`- Cirurgias: ${profile.surgeries.join(', ')}`)
    if (profile.familyHistory) lines.push(`- Histórico familiar: ${profile.familyHistory}`)
    sections.push(`### Objetivos e Condições\n${lines.join('\n')}`)
  }

  if (blocks.has('biomarkers')) {
    const lines: string[] = []
    if (profile.vo2Max) lines.push(`- VO2 máx: ${profile.vo2Max}`)
    if (profile.handgripStrength) lines.push(`- Força preensão: ${profile.handgripStrength} kg`)
    if (profile.sitToStandTime) lines.push(`- Sit-to-stand: ${profile.sitToStandTime} s`)
    if (profile.bodyFatPercentage) lines.push(`- % gordura: ${profile.bodyFatPercentage}%`)
    if (profile.muscleMass) lines.push(`- Massa muscular: ${profile.muscleMass} kg`)
    if (profile.visceralFatLevel) lines.push(`- Gordura visceral: ${profile.visceralFatLevel}`)
    if (profile.boneMass) lines.push(`- Massa óssea: ${profile.boneMass} kg`)
    if (profile.basalMetabolicRate) lines.push(`- TMB: ${profile.basalMetabolicRate} kcal`)
    if (profile.bodyWaterPercentage) lines.push(`- % água corporal: ${profile.bodyWaterPercentage}%`)
    if (profile.co2ToleranceTest) lines.push(`- Tolerância CO2: ${profile.co2ToleranceTest} s`)
    if (profile.latestBiomarkers) {
      lines.push(`- Biomarcadores laboratoriais: ${JSON.stringify(profile.latestBiomarkers)}`)
    }
    if (lines.length) sections.push(`### Biomarcadores e Exames\n${lines.join('\n')}`)
  }

  if (blocks.has('sleep_lifestyle')) {
    const lines: string[] = []
    if (profile.sleepHours) lines.push(`- Sono: ${profile.sleepHours}h/noite${profile.sleepQuality ? ` (qualidade ${profile.sleepQuality}/10)` : ''}`)
    if (profile.sleepIssues) lines.push(`- Problemas de sono: ${profile.sleepIssues}`)
    if (profile.sleepRegularity) lines.push(`- Regularidade do sono: ${profile.sleepRegularity}`)
    if (profile.stressLevel) lines.push(`- Estresse: ${profile.stressLevel}/10${profile.stressManagement ? ` — ${profile.stressManagement}` : ''}`)
    if (profile.dailyWaterIntake) lines.push(`- Ingestão de água: ${profile.dailyWaterIntake} L/dia`)
    if (profile.smokingStatus) lines.push(`- Tabaco: ${profile.smokingStatus}${profile.smokingDetails ? ` (${profile.smokingDetails})` : ''}`)
    if (profile.alcoholConsumption) lines.push(`- Álcool: ${profile.alcoholConsumption}`)
    if (profile.supplementation?.length) lines.push(`- Suplementação: ${profile.supplementation.join(', ')}`)
    if (profile.currentDiet) lines.push(`- Dieta atual: ${profile.currentDiet}`)
    if (lines.length) sections.push(`### Sono e Estilo de Vida\n${lines.join('\n')}`)
  }

  if (blocks.has('exercise_chronobiology')) {
    const lines: string[] = []
    if (profile.exerciseActivities) {
      lines.push(`- Atividades: ${JSON.stringify(profile.exerciseActivities)}`)
    } else {
      if (profile.exerciseFrequency) lines.push(`- Frequência: ${profile.exerciseFrequency}x/semana`)
      if (profile.exerciseDuration) lines.push(`- Duração média: ${profile.exerciseDuration} min`)
      if (profile.exerciseIntensity) lines.push(`- Intensidade: ${profile.exerciseIntensity}`)
      if (profile.exerciseTypes?.length) lines.push(`- Tipos: ${profile.exerciseTypes.join(', ')}`)
    }
    if (profile.physicalLimitations) lines.push(`- Limitações físicas: ${profile.physicalLimitations}`)
    if (profile.firstSunlightExposureTime) lines.push(`- Exposição solar: ${profile.firstSunlightExposureTime}`)
    if (profile.lastMealTime) lines.push(`- Última refeição: ${profile.lastMealTime}`)
    if (profile.artificialLightExposureStart) {
      lines.push(`- Luz artificial: ${profile.artificialLightExposureStart} – ${profile.artificialLightExposureEnd ?? '?'}`)
    }
    if (lines.length) sections.push(`### Exercício e Cronobiologia\n${lines.join('\n')}`)
  }

  if (blocks.has('living_analysis') && livingAnalysisReport) {
    const truncated =
      livingAnalysisReport.length > MAX_ANALYSIS_CHARS
        ? livingAnalysisReport.slice(0, MAX_ANALYSIS_CHARS) + '\n...[truncado]'
        : livingAnalysisReport
    sections.push(`### Última Análise do Paciente\n${truncated}`)
  }

  return sections.join('\n\n')
}

function computeBmi(heightCm: number, weightKg: string): string | null {
  const w = parseFloat(weightKg)
  if (!heightCm || !w) return null
  const bmi = w / Math.pow(heightCm / 100, 2)
  return bmi.toFixed(1)
}
