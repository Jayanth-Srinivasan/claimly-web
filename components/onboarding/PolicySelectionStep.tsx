'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Policy } from '@/types/policies'

interface PolicySelectionStepProps {
  policies: Policy[]
  onComplete: (formData: FormData) => void
  onSkip: () => void
  isLoading: boolean
}

export function PolicySelectionStep({
  policies,
  onComplete,
  onSkip,
  isLoading,
}: PolicySelectionStepProps) {
  const [selectedPolicies, setSelectedPolicies] = useState<Set<string>>(new Set())

  const togglePolicy = (policyId: string) => {
    const newSelected = new Set(selectedPolicies)
    if (newSelected.has(policyId)) {
      newSelected.delete(policyId)
    } else {
      newSelected.add(policyId)
    }
    setSelectedPolicies(newSelected)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onComplete(formData)
  }

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl p-8">
      <h2 className="text-2xl font-bold mb-2">Select Your Insurance Policies</h2>
      <p className="text-black/60 dark:text-white/60 mb-6">
        Choose the policies you currently have or would like to enroll in. You can add more later.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {policies.map((policy) => (
            <label
              key={policy.id}
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedPolicies.has(policy.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedPolicies.has(policy.id)
                        ? 'border-primary bg-primary'
                        : 'border-black/20 dark:border-white/20'
                    }`}
                  >
                    {selectedPolicies.has(policy.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    name="policy_ids"
                    value={policy.id}
                    checked={selectedPolicies.has(policy.id)}
                    onChange={() => togglePolicy(policy.id)}
                    className="sr-only"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-black dark:text-white">{policy.name}</h3>
                      <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                        {policy.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-primary">
                        ${policy.premium}
                        <span className="text-sm font-normal text-black/60 dark:text-white/60">
                          /{policy.premium_frequency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Coverage Items Preview */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(policy.coverage_items as any[]).slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70"
                      >
                        {item.name}: ${item.limit.toLocaleString()}
                      </span>
                    ))}
                    {(policy.coverage_items as any[]).length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs text-black/50 dark:text-white/50">
                        +{(policy.coverage_items as any[]).length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onSkip}
            disabled={isLoading}
            className="flex-1 border-2 border-black/10 dark:border-white/10 py-3 rounded-md hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
          >
            Skip for Now
          </button>
          <button
            type="submit"
            disabled={isLoading || selectedPolicies.size === 0}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading
              ? 'Enrolling...'
              : `Enroll in ${selectedPolicies.size} ${selectedPolicies.size === 1 ? 'Policy' : 'Policies'}`}
          </button>
        </div>
      </form>
    </div>
  )
}
