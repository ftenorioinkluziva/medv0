'use client'

import { useState } from 'react'
import { DisclaimerStep } from './steps/disclaimer-step'
import { ProfileStep } from './steps/profile-step'
import { UploadStep } from './steps/upload-step'

const STEPS = ['disclaimer', 'profile', 'upload'] as const
type Step = (typeof STEPS)[number]

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<Step>('disclaimer')

  const stepIndex = STEPS.indexOf(currentStep)

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= stepIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {currentStep === 'disclaimer' && (
        <DisclaimerStep onNext={() => setCurrentStep('profile')} />
      )}
      {currentStep === 'profile' && (
        <ProfileStep onNext={() => setCurrentStep('upload')} />
      )}
      {currentStep === 'upload' && <UploadStep />}
    </div>
  )
}
