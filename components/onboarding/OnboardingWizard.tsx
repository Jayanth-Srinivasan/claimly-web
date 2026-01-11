'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, enrollPolicies } from '@/app/onboarding/actions'
import { DemographicsStep } from './DemographicsStep'
import { PolicySelectionStep } from './PolicySelectionStep'
import type { Policy } from '@/types/policies'
import type { Profile } from '@/types/auth'

interface OnboardingWizardProps {
  profile: Profile
  policies: Policy[]
}

export function OnboardingWizard({ profile, policies }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<'demographics' | 'policies'>('demographics')
  const [isLoading, setIsLoading] = useState(false)

  const handleDemographicsComplete = async (formData: FormData) => {
    setIsLoading(true)

    // Convert FormData to object for the action
    const data = {
      dateOfBirth: formData.get('date_of_birth') as string,
      gender: formData.get('gender') as string,
      phoneNumber: formData.get('phone_number') as string,
      country: formData.get('country') as string,
      addressLine1: formData.get('address_line1') as string,
      addressLine2: (formData.get('address_line2') as string) || undefined,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zip_code') as string,
      occupation: (formData.get('occupation') as string) || undefined,
    }

    try {
      const result = await completeOnboarding(data)

      if (result?.error) {
        alert(result.error)
        setIsLoading(false)
        return
      }

      // Successfully saved demographics, move to policy selection step
      setStep('policies')
      setIsLoading(false)
    } catch (error) {
      console.error('Error completing demographics:', error)
      alert('Failed to save your information. Please try again.')
      setIsLoading(false)
    }
  }

  const handlePoliciesComplete = async (formData: FormData) => {
    setIsLoading(true)
    const result = await enrollPolicies(formData)

    if (result?.error) {
      alert(result.error)
      setIsLoading(false)
      return
    }

    // Redirect to dashboard
    router.push('/dashboard')
  }

  const handleSkipPolicies = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div
              className={`flex items-center gap-2 ${step === 'demographics' ? 'text-primary' : 'text-green-600'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === 'demographics'
                    ? 'border-primary bg-primary text-white'
                    : 'border-green-600 bg-green-600 text-white'
                }`}
              >
                {step === 'policies' ? '✓' : '1'}
              </div>
              <span className="font-medium">Personal Info</span>
            </div>

            <div className="h-px w-16 bg-black/10 dark:bg-white/10" />

            <div
              className={`flex items-center gap-2 ${step === 'policies' ? 'text-primary' : 'text-black/40 dark:text-white/40'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === 'policies'
                    ? 'border-primary bg-primary text-white'
                    : 'border-black/20 dark:border-white/20'
                }`}
              >
                2
              </div>
              <span className="font-medium">Select Policies</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {step === 'demographics' && (
          <DemographicsStep
            profile={profile}
            onComplete={handleDemographicsComplete}
            isLoading={isLoading}
          />
        )}

        {step === 'policies' && (
          <PolicySelectionStep
            policies={policies}
            onComplete={handlePoliciesComplete}
            onSkip={handleSkipPolicies}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
