'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { upsertMedicalProfile } from '@/lib/actions/medical-profile'
import { AdvancedForm } from './advanced-form'
import { TagInput } from './tag-input'
import type { MedicalProfile, ExerciseActivity } from '@/lib/db/schema'

interface ProfileFormProps {
  initialData: MedicalProfile | null
  children: React.ReactNode
}

export function ProfileForm({ initialData, children }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState('basicos')
  const scrollRef = useRef<Record<string, number>>({})

  const [height, setHeight] = useState(initialData?.height ?? 0)
  const [weight, setWeight] = useState(parseFloat(initialData?.weight ?? '0'))
  const bmi =
    height > 0 && weight > 0
      ? (weight / Math.pow(height / 100, 2)).toFixed(1)
      : null

  const [activities, setActivities] = useState<ExerciseActivity[]>(
    (initialData?.exerciseActivities as ExerciseActivity[] | null) ?? [],
  )
  const [medicalConditions, setMedicalConditions] = useState<string[]>(
    initialData?.medicalConditions ?? [],
  )
  const [medications, setMedications] = useState<string[]>(initialData?.medications ?? [])
  const [allergies, setAllergies] = useState<string[]>(initialData?.allergies ?? [])
  const [surgeries, setSurgeries] = useState<string[]>(initialData?.surgeries ?? [])
  const [supplementation, setSupplementation] = useState<string[]>(
    initialData?.supplementation ?? [],
  )

  function handleTabChange(tab: string) {
    scrollRef.current[activeTab] = window.scrollY
    setActiveTab(tab)
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollRef.current[tab] ?? 0)
    })
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await upsertMedicalProfile({
        age: Number(fd.get('age')),
        gender: fd.get('gender') as 'masculino' | 'feminino' | 'outro',
        height: Number(fd.get('height')),
        weight: String(fd.get('weight')),
        systolicPressure: Number(fd.get('systolicPressure')),
        diastolicPressure: Number(fd.get('diastolicPressure')),
        restingHeartRate: Number(fd.get('restingHeartRate')),
        healthObjectives: String(fd.get('healthObjectives')),
        medicalConditions: medicalConditions.length > 0 ? medicalConditions : undefined,
        medications: medications.length > 0 ? medications : undefined,
        allergies: allergies.length > 0 ? allergies : undefined,
        surgeries: surgeries.length > 0 ? surgeries : undefined,
        familyHistory: (fd.get('familyHistory') as string) || undefined,
        notes: (fd.get('notes') as string) || undefined,
        bodyFatPercentage: (fd.get('bodyFatPercentage') as string) || undefined,
        muscleMass: (fd.get('muscleMass') as string) || undefined,
        handgripStrength: (fd.get('handgripStrength') as string) || undefined,
        sitToStandTime: (fd.get('sitToStandTime') as string) || undefined,
        vo2Max: (fd.get('vo2Max') as string) || undefined,
        co2ToleranceTest: (fd.get('co2ToleranceTest') as string) || undefined,
        sleepHours: (fd.get('sleepHours') as string) || undefined,
        sleepQuality: Number(fd.get('sleepQuality')) || undefined,
        sleepIssues: (fd.get('sleepIssues') as string) || undefined,
        timeInBed: (fd.get('timeInBed') as string) || undefined,
        sleepRegularity: (fd.get('sleepRegularity') as string) || undefined,
        dailyWaterIntake: (fd.get('dailyWaterIntake') as string) || undefined,
        stressLevel: Number(fd.get('stressLevel')) || undefined,
        stressManagement: (fd.get('stressManagement') as string) || undefined,
        smokingStatus:
          (fd.get('smokingStatus') as 'nunca_fumou' | 'ex-fumante' | 'fumante') || undefined,
        smokingDetails: (fd.get('smokingDetails') as string) || undefined,
        alcoholConsumption:
          (fd.get('alcoholConsumption') as
            | 'nunca'
            | 'social'
            | 'regular'
            | 'frequente') || undefined,
        supplementation: supplementation.length > 0 ? supplementation : undefined,
        currentDiet: (fd.get('currentDiet') as string) || undefined,
        exerciseActivities: activities.length > 0 ? activities : undefined,
        physicalLimitations: (fd.get('physicalLimitations') as string) || undefined,
        firstSunlightExposureTime:
          (fd.get('firstSunlightExposureTime') as string) || undefined,
        lastMealTime: (fd.get('lastMealTime') as string) || undefined,
        artificialLightExposureStart:
          (fd.get('artificialLightExposureStart') as string) || undefined,
        artificialLightExposureEnd:
          (fd.get('artificialLightExposureEnd') as string) || undefined,
        artificialLightExposureTime:
          (fd.get('artificialLightExposureTime') as string) || undefined,
      })

      if (result.success) {
        showToast('success', 'Perfil salvo com sucesso!')
      } else {
        showToast('error', result.error)
      }
    })
  }

  const biomarkers = initialData?.latestBiomarkers as Record<string, unknown> | null | undefined

  const selectCls =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  const textareaCls =
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full">
          <TabsTrigger value="basicos" className="flex-1 text-xs px-1">
            Básicos
          </TabsTrigger>
          <TabsTrigger value="composicao" className="flex-1 text-xs px-1">
            Composição
          </TabsTrigger>
          <TabsTrigger value="estilo" className="flex-1 text-xs px-1">
            Estilo
          </TabsTrigger>
          <TabsTrigger value="biomarcadores" className="flex-1 text-xs px-1">
            Biomarcadores
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Dados básicos, cardiovasculares, histórico médico, composição básica */}
        <div role="tabpanel" className={activeTab === 'basicos' ? 'space-y-4 mt-4' : 'hidden'}>
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">Dados Básicos</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  required
                  min={0}
                  max={150}
                  defaultValue={initialData?.age ?? ''}
                  placeholder="Ex: 35"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gender">Sexo</Label>
                <select
                  id="gender"
                  name="gender"
                  required
                  defaultValue={initialData?.gender ?? ''}
                  className={selectCls}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  name="height"
                  type="number"
                  required
                  min={1}
                  max={300}
                  value={height || ''}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  placeholder="Ex: 175"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  required
                  step="0.01"
                  min={1}
                  value={weight || ''}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  placeholder="Ex: 72.5"
                />
              </div>
            </div>

            {bmi && (
              <p className="text-sm text-muted-foreground">
                IMC:{' '}
                <span className="font-semibold text-foreground">{bmi}</span>
              </p>
            )}
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">Dados Cardiovasculares</h2>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="systolicPressure">PA Sistólica</Label>
                <Input
                  id="systolicPressure"
                  name="systolicPressure"
                  type="number"
                  required
                  min={1}
                  max={300}
                  defaultValue={initialData?.systolicPressure ?? ''}
                  placeholder="120"
                />
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="diastolicPressure">PA Diastólica</Label>
                <Input
                  id="diastolicPressure"
                  name="diastolicPressure"
                  type="number"
                  required
                  min={1}
                  max={200}
                  defaultValue={initialData?.diastolicPressure ?? ''}
                  placeholder="80"
                />
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="restingHeartRate">FC Repouso</Label>
                <Input
                  id="restingHeartRate"
                  name="restingHeartRate"
                  type="number"
                  required
                  min={1}
                  defaultValue={initialData?.restingHeartRate ?? ''}
                  placeholder="70"
                />
                <p className="text-xs text-muted-foreground">bpm</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">Objetivos e Histórico</h2>

            <div className="space-y-1">
              <Label htmlFor="healthObjectives">Objetivos de Saúde</Label>
              <textarea
                id="healthObjectives"
                name="healthObjectives"
                required
                rows={3}
                defaultValue={initialData?.healthObjectives ?? ''}
                placeholder="Ex: Perder peso, controlar pressão arterial, melhorar condicionamento físico"
                className={`min-h-20 ${textareaCls}`}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="familyHistory">Histórico Familiar (opcional)</Label>
              <textarea
                id="familyHistory"
                name="familyHistory"
                rows={2}
                defaultValue={initialData?.familyHistory ?? ''}
                placeholder="Ex: Diabetes tipo 2 no pai, hipertensão na mãe"
                className={`min-h-[60px] ${textareaCls}`}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={initialData?.notes ?? ''}
                placeholder="Outras informações relevantes"
                className={`min-h-[60px] ${textareaCls}`}
              />
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">Histórico Médico</h2>
            <p className="text-xs text-muted-foreground">
              Opcional — todos os campos aceitam múltiplos itens.
            </p>
            <TagInput
              id="medicalConditions"
              label="Condições médicas"
              placeholder="Ex: hipertensão, diabetes"
              initialValues={initialData?.medicalConditions}
              onChange={setMedicalConditions}
            />
            <TagInput
              id="medications"
              label="Medicamentos em uso"
              placeholder="Ex: metformina 500mg, losartana"
              initialValues={initialData?.medications}
              onChange={setMedications}
            />
            <TagInput
              id="allergies"
              label="Alergias"
              placeholder="Ex: penicilina, látex"
              initialValues={initialData?.allergies}
              onChange={setAllergies}
            />
            <TagInput
              id="surgeries"
              label="Cirurgias"
              placeholder="Ex: apendicectomia 2015"
              initialValues={initialData?.surgeries}
              onChange={setSurgeries}
            />
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">Composição Corporal Básica</h2>
            <p className="text-xs text-muted-foreground">
              Opcional — dados de bioimpedância ou DEXA.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bodyFatPercentage">Gordura corporal (%)</Label>
                <Input
                  id="bodyFatPercentage"
                  name="bodyFatPercentage"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  defaultValue={initialData?.bodyFatPercentage ?? ''}
                  placeholder="Ex: 18.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="muscleMass">Massa muscular (kg)</Label>
                <Input
                  id="muscleMass"
                  name="muscleMass"
                  type="number"
                  step="0.1"
                  min={0}
                  defaultValue={initialData?.muscleMass ?? ''}
                  placeholder="Ex: 32.0"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Tab 2: Composição — display-only InBody data */}
        <div role="tabpanel" className={activeTab === 'composicao' ? 'mt-4' : 'hidden'}>
          {children}
        </div>

        {/* Tab 3: Estilo de vida — physical performance + AdvancedForm */}
        <div role="tabpanel" className={activeTab === 'estilo' ? 'space-y-4 mt-4' : 'hidden'}>
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">Desempenho Físico</h2>
            <p className="text-xs text-muted-foreground">
              Opcional — testes de capacidade funcional.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="handgripStrength">Força de preensão (kgf)</Label>
                <Input
                  id="handgripStrength"
                  name="handgripStrength"
                  type="number"
                  step="0.1"
                  min={0}
                  defaultValue={initialData?.handgripStrength ?? ''}
                  placeholder="Ex: 42.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sitToStandTime">Sentar-levantar (s)</Label>
                <Input
                  id="sitToStandTime"
                  name="sitToStandTime"
                  type="number"
                  step="0.1"
                  min={0}
                  defaultValue={initialData?.sitToStandTime ?? ''}
                  placeholder="Ex: 12.3"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="vo2Max">VO2 máx</Label>
                <Input
                  id="vo2Max"
                  name="vo2Max"
                  type="number"
                  step="0.1"
                  min={0}
                  defaultValue={initialData?.vo2Max ?? ''}
                  placeholder="Ex: 45.0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="co2ToleranceTest">Tolerância CO2 (s)</Label>
                <Input
                  id="co2ToleranceTest"
                  name="co2ToleranceTest"
                  type="number"
                  step="0.1"
                  min={0}
                  defaultValue={initialData?.co2ToleranceTest ?? ''}
                  placeholder="Ex: 40"
                />
              </div>
            </div>
          </Card>

          <AdvancedForm
            initialData={initialData}
            onActivitiesChange={setActivities}
            onSupplementationChange={setSupplementation}
          />
        </div>

        {/* Tab 4: Biomarcadores — display-only latestBiomarkers jsonb */}
        <div role="tabpanel" className={activeTab === 'biomarcadores' ? 'mt-4' : 'hidden'}>
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">Últimos Biomarcadores</h2>
            {biomarkers && Object.keys(biomarkers).length > 0 ? (
              <dl className="space-y-2">
                {Object.entries(biomarkers).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between border-b border-border/40 pb-1"
                  >
                    <dt className="text-sm text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="text-sm font-medium text-foreground">
                      {String(value ?? '—')}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum biomarcador registrado. Envie um documento laboratorial para análise.
              </p>
            )}
          </Card>
        </div>
      </Tabs>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Salvando...' : 'Salvar Perfil'}
      </Button>
    </form>
  )
}
