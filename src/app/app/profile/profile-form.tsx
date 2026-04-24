'use client'

import { useState, useTransition, useRef } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Activity, Dumbbell, HeartPulse, UserRound, Check } from 'lucide-react'
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

  const tabs = [
    { value: 'basicos', label: 'Básicos', icon: UserRound },
    { value: 'composicao', label: 'Composição', icon: Activity },
    { value: 'desempenho', label: 'Desempenho', icon: Dumbbell },
    { value: 'habitos', label: 'Hábitos', icon: HeartPulse },
  ]

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basicos" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto py-1 bg-foreground/5 rounded-xl">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex flex-col items-center gap-1 px-1 sm:flex-row sm:gap-2">
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="text-[10px] sm:text-sm">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Tab Básicos ───────────────────────────────── */}
        <TabsContent value="basicos" keepMounted className="mt-6">
          <BasicForm
            initialData={initialData}
            onMedicalConditionsChange={setMedicalConditions}
            onMedicationsChange={setMedications}
            onAllergiesChange={setAllergies}
            onSurgeriesChange={setSurgeries}
          />
        </TabsContent>

        {/* ── Tab Composição ────────────────────────────── */}
        <TabsContent value="composicao" keepMounted className="mt-6">
          <CompositionForm
            initialData={initialData}
            latestBodyComposition={latestBodyComposition}
            bodyCompositionDelta={bodyCompositionDelta}
          />
        </TabsContent>

        {/* ── Tab Desempenho ────────────────────────────── */}
        <TabsContent value="desempenho" keepMounted className="mt-6">
          <PerformanceForm initialData={initialData} onActivitiesChange={setActivities} />
        </TabsContent>

        {/* ── Tab Hábitos ───────────────────────────────── */}
        <TabsContent value="habitos" keepMounted className="mt-6">
          <AdvancedForm initialData={initialData} onSupplementationChange={setSupplementation} />
        </TabsContent>
      </Tabs>

      {/* Save button */}
      <div className="flex justify-end pt-6 border-t border-border">
        <Button type="submit" disabled={isPending} className="min-w-32">
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Salvar Perfil
            </>
          )}
        </Button>
      </div>
    </form>
  )
}