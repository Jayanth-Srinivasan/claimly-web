'use client'

import { useState} from 'react'
import { X, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Policy, PolicyInsert, CoverageItem } from '@/types/policies'

interface PolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy?: Policy
  onSubmit: (data: PolicyInsert) => void
}

export function PolicyDialog({
  open,
  onOpenChange,
  policy,
  onSubmit,
}: PolicyDialogProps) {
  // Initialize state from policy prop directly (state initializers only run once per mount)
  // Dialog will remount when policy.id changes (via key prop)
  const [name, setName] = useState(policy?.name || '')
  const [description, setDescription] = useState(policy?.description || '')
  const [coverageItems, setCoverageItems] = useState<CoverageItem[]>(policy?.coverage_items || [])
  const [newCoverageItemName, setNewCoverageItemName] = useState('')
  const [newCoverageItemLimit, setNewCoverageItemLimit] = useState('')
  const [isActive, setIsActive] = useState(policy?.is_active ?? true)

  const [deductible, setDeductible] = useState(policy?.deductible?.toString() || '')
  const [premium, setPremium] = useState(policy?.premium?.toString() || '')
  const [currency, setCurrency] = useState(policy?.currency || 'USD')
  const [premiumFrequency, setPremiumFrequency] = useState<'monthly' | 'quarterly' | 'annually'>(policy?.premium_frequency || 'annually')
  const [policyTermMonths, setPolicyTermMonths] = useState(policy?.policy_term_months?.toString() || '')

  const [exclusions, setExclusions] = useState<string[]>(policy?.exclusions || [])
  const [newExclusion, setNewExclusion] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Policy name is required'
    }

    if (coverageItems.length === 0) {
      newErrors.coverageItems = 'At least one coverage item is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddCoverageItem = () => {
    const trimmedName = newCoverageItemName.trim()
    const limit = parseFloat(newCoverageItemLimit)

    if (trimmedName && !isNaN(limit) && limit > 0) {
      const exists = coverageItems.some(item => item.name === trimmedName)
      if (!exists) {
        setCoverageItems([...coverageItems, { name: trimmedName, limit }])
        setNewCoverageItemName('')
        setNewCoverageItemLimit('')
      }
    }
  }

  const handleRemoveCoverageItem = (index: number) => {
    setCoverageItems(coverageItems.filter((_, i) => i !== index))
  }

  const handleAddExclusion = () => {
    const trimmed = newExclusion.trim()
    if (trimmed && !exclusions.includes(trimmed)) {
      setExclusions([...exclusions, trimmed])
      setNewExclusion('')
    }
  }

  const handleRemoveExclusion = (index: number) => {
    setExclusions(exclusions.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      coverage_items: coverageItems,
      deductible: deductible ? parseFloat(deductible) : null,
      premium: premium ? parseFloat(premium) : null,
      currency: currency || null,
      premium_frequency: premiumFrequency,
      policy_term_months: policyTermMonths ? parseInt(policyTermMonths) : null,
      exclusions: exclusions,
      is_active: isActive,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={policy?.id || 'new'} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {policy ? 'Edit Policy' : 'Create New Policy'}
          </DialogTitle>
          <DialogDescription>
            {policy
              ? 'Update the insurance policy details below.'
              : 'Add a new insurance policy with coverage details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-2">
              Basic Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="name">
                Policy Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Travel Insurance Basic"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the policy coverage and benefits..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-2">
              Financial Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deductible">Deductible</Label>
                <Input
                  id="deductible"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 500"
                  value={deductible}
                  onChange={(e) => setDeductible(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="premium">Premium Amount</Label>
                <Input
                  id="premium"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 299.99"
                  value={premium}
                  onChange={(e) => setPremium(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="premiumFrequency">Premium Frequency</Label>
                <select
                  id="premiumFrequency"
                  value={premiumFrequency}
                  onChange={(e) => setPremiumFrequency(e.target.value as 'monthly' | 'quarterly' | 'annually')}
                  className="flex h-10 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-2">
              Policy Terms
            </h3>

            <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="policyTermMonths">Policy Term (Months)</Label>
                <Input
                  id="policyTermMonths"
                  type="number"
                  placeholder="e.g., 12"
                  value={policyTermMonths}
                  onChange={(e) => setPolicyTermMonths(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-2">
              Coverage Details
            </h3>

            <div className="space-y-2">
              <Label>
                Coverage Items <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Coverage name (e.g., Medical)"
                  value={newCoverageItemName}
                  onChange={(e) => setNewCoverageItemName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Limit"
                  value={newCoverageItemLimit}
                  onChange={(e) => setNewCoverageItemLimit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCoverageItem()
                    }
                  }}
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCoverageItem}
                  disabled={!newCoverageItemName.trim() || !newCoverageItemLimit}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {coverageItems.length > 0 && (
                <div className="space-y-2 mt-3 p-3 border border-black/10 dark:border-white/10 rounded-lg">
                  {coverageItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-green-500/10 text-green-700 dark:text-green-400"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm">
                          {currency || 'USD'} {item.limit.toLocaleString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoverageItem(index)}
                        className="hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {errors.coverageItems && (
                <p className="text-sm text-red-500">{errors.coverageItems}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-2">
              Exclusions
            </h3>

            <div className="space-y-2">
              <Label>Items Not Covered</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Pre-existing conditions, War zones"
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddExclusion()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddExclusion}
                  disabled={!newExclusion.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {exclusions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-3 border border-black/10 dark:border-white/10 rounded-lg">
                  {exclusions.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-red-500/10 text-red-700 dark:text-red-400"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveExclusion(index)}
                        className="hover:text-red-800 dark:hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-black/10 dark:border-white/10">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-black/20 dark:border-white/20"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active (policy is available for selection)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{policy ? 'Update' : 'Create'} Policy</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
