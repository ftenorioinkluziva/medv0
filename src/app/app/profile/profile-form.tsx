'use client'

import { useState, useTransition, useRef } from 'react'
import { Check } from 'lucide-react'
import { upsertMedicalProfile } from '@/lib/actions/medical-profile'
import { BasicForm } from './basic-form'
import { CompositionForm } from './composition-form'
import { PerformanceForm } from './performance-form'
import { AdvancedForm } from './advanced-form'
import type { MedicalProfile, ExerciseActivity, BodyCompositionHistoryRecord } from '@/lib/db/schema'
import type { BodyCompositionDelta } from '@/lib/db/queries/body-composition'

interface ProfileFormProps {
  initialData: MedicalProfile | null
  latestBodyComposition: BodyCompositionHistoryRecord | null
  bodyCompositionDelta: BodyCompositionDelta | null
}

export function ProfileForm({
  initialData,
  latestBodyComposition,
  bodyCompositionDelta
}: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [medicalConditions, setMedicalConditions] = useState<string[]>(initialData?.medicalConditions ?? [])
  const [medications, setMedications] = useState<string[]>(initialData?.medications ?? [])
  const [allergies, setAllergies] = useState<string[]>(initialData?.allergies ?? [])
  const [surgeries, setSurgeries] = useState<string[]>(initialData?.surgeries ?? [])
  const [activities, setActivities] = useState<ExerciseActivity[]>(initialData?.exerciseActivities as ExerciseActivity[] ?? [])
  const [supplementation, setSupplementation] = useState<string[]>(initialData?.supplementation ?? [])
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(formData: FormData) {
    // Convert FormData to the expected object format
    const profileData = {
      // Required fields
      age: parseInt(formData.get('age') as string),
      gender: formData.get('gender') as 'masculino' | 'feminino' | 'outro',
      height: parseInt(formData.get('height') as string),
      weight: formData.get('weight') as string,
      systolicPressure: parseInt(formData.get('systolicPressure') as string),
      diastolicPressure: parseInt(formData.get('diastolicPressure') as string),
      restingHeartRate: parseInt(formData.get('restingHeartRate') as string),
      healthObjectives: formData.get('healthObjectives') as string,

      // Optional basic fields
      medicalConditions,
      medications,
      allergies,
      surgeries,
      familyHistory: formData.get('familyHistory') as string || null,
      notes: formData.get('notes') as string || null,

      // Body composition
      bodyFatPercentage: formData.get('bodyFatPercentage') as string || undefined,
      muscleMass: formData.get('muscleMass') as string || undefined,
      visceralFatLevel: formData.get('visceralFatLevel') as string || undefined,
      boneMass: formData.get('boneMass') as string || undefined,
      basalMetabolicRate: formData.get('basalMetabolicRate') ? parseInt(formData.get('basalMetabolicRate') as string) : undefined,
      bodyWaterPercentage: formData.get('bodyWaterPercentage') as string || undefined,

      // Performance tests
      handgripStrength: formData.get('handgripStrength') as string || undefined,
      sitToStandTime: formData.get('sitToStandTime') as string || undefined,
      vo2Max: formData.get('vo2Max') as string || undefined,
      co2ToleranceTest: formData.get('co2ToleranceTest') as string || undefined,

      // Sleep
      sleepHours: formData.get('sleepHours') as string || undefined,
      sleepQuality: formData.get('sleepQuality') ? parseInt(formData.get('sleepQuality') as string) : undefined,
      sleepIssues: formData.get('sleepIssues') as string || null,
      timeInBed: formData.get('timeInBed') as string || undefined,
      sleepRegularity: formData.get('sleepRegularity') as string || null,

      // Lifestyle
      dailyWaterIntake: formData.get('dailyWaterIntake') as string || undefined,
      stressLevel: formData.get('stressLevel') ? parseInt(formData.get('stressLevel') as string) : undefined,
      stressManagement: formData.get('stressManagement') as string || null,
      smokingStatus: formData.get('smokingStatus') as 'nunca_fumou' | 'ex-fumante' | 'fumante' || undefined,
      smokingDetails: formData.get('smokingDetails') as string || null,
      alcoholConsumption: formData.get('alcoholConsumption') as 'nunca' | 'social' | 'regular' | 'frequente' || undefined,
      supplementation,
      currentDiet: formData.get('currentDiet') as string || null,

      // Physical activity
      exerciseActivities: activities,
      exerciseTypes: formData.get('exerciseTypes') ? JSON.parse(formData.get('exerciseTypes') as string) : undefined,
      exerciseFrequency: formData.get('exerciseFrequency') ? parseInt(formData.get('exerciseFrequency') as string) : undefined,
      exerciseDuration: formData.get('exerciseDuration') ? parseInt(formData.get('exerciseDuration') as string) : undefined,
      exerciseIntensity: formData.get('exerciseIntensity') as string || null,
      physicalLimitations: formData.get('physicalLimitations') as string || null,

      // Chronobiology
      firstSunlightExposureTime: formData.get('firstSunlightExposureTime') as string || null,
      lastMealTime: formData.get('lastMealTime') as string || null,
      artificialLightExposureStart: formData.get('artificialLightExposureStart') as string || null,
      artificialLightExposureEnd: formData.get('artificialLightExposureEnd') as string || null,
      artificialLightExposureTime: formData.get('artificialLightExposureTime') as string || null,
    }

    startTransition(async () => {
      try {
        await upsertMedicalProfile(profileData)
        // Success feedback could be added here
      } catch (error) {
        console.error('Failed to update profile:', error)
        // Error handling could be added here
      }
    })
  }

  const [activeTab, setActiveTab] = useState<'basicos' | 'composicao' | 'habitos' | 'desempenho'>('basicos')

  const tabs = [
    { value: 'basicos' as const, label: 'Básico' },
    { value: 'composicao' as const, label: 'Composição' },
    { value: 'habitos' as const, label: 'Hábitos' },
    { value: 'desempenho' as const, label: 'Performance' },
  ]

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {/* tab bar */}
      <div
        role="tablist"
        aria-label="Seções do perfil"
        className="flex items-center rounded-full border border-border bg-[#E7E8E5] dark:bg-muted p-1 h-12 gap-1"
      >
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => setActiveTab(value)}
            className={`flex-1 rounded-full text-[11px] font-medium h-10 transition-colors ${
              activeTab === value
                ? 'bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* tab panels — keepMounted via hidden */}
      <div hidden={activeTab !== 'basicos'}>
        <BasicForm
          initialData={initialData}
          onMedicalConditionsChange={setMedicalConditions}
          onMedicationsChange={setMedications}
          onAllergiesChange={setAllergies}
          onSurgeriesChange={setSurgeries}
        />
      </div>
      <div hidden={activeTab !== 'composicao'}>
        <CompositionForm
          initialData={initialData}
          latestBodyComposition={latestBodyComposition}
          bodyCompositionDelta={bodyCompositionDelta}
        />
      </div>
      <div hidden={activeTab !== 'habitos'}>
        <AdvancedForm initialData={initialData} onSupplementationChange={setSupplementation} />
      </div>
      <div hidden={activeTab !== 'desempenho'}>
        <PerformanceForm initialData={initialData} onActivitiesChange={setActivities} />
      </div>

      {/* Save button */}
      <div className="pt-4 border-t border-border">
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-12 rounded-xl bg-primary font-heading text-[15px] font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Salvar Perfil
            </>
          )}
        </button>
      </div>
    </form>
  )
}