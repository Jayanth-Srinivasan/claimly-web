'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Questionnaire, QuestionnaireInsert, ClaimType } from '@/types/policies'

interface QuestionnaireDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  questionnaire?: Questionnaire
  onSubmit: (data: QuestionnaireInsert) => void
}

const claimTypes: { value: ClaimType; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'medical', label: 'Medical' },
  { value: 'baggage', label: 'Baggage' },
  { value: 'flight', label: 'Flight' },
]

export function QuestionnaireDialog({
  open,
  onOpenChange,
  questionnaire,
  onSubmit,
}: QuestionnaireDialogProps) {
  const [claimType, setClaimType] = useState<ClaimType>('travel')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes or questionnaire changes
  useEffect(() => {
    if (open) {
      if (questionnaire) {
        setClaimType(questionnaire.claim_type)
        setName(questionnaire.name)
        setDescription(questionnaire.description || '')
        setIsActive(questionnaire.is_active)
      } else {
        setClaimType('travel')
        setName('')
        setDescription('')
        setIsActive(true)
      }
      setErrors({})
    }
  }, [open, questionnaire])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Questionnaire name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    onSubmit({
      claim_type: claimType,
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {questionnaire ? 'Edit Questionnaire' : 'Create New Questionnaire'}
          </DialogTitle>
          <DialogDescription>
            {questionnaire
              ? 'Update the questionnaire details below.'
              : 'Add a new questionnaire for claim submissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Claim Type */}
          <div className="space-y-2">
            <Label htmlFor="claim_type">
              Claim Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={claimType}
              onValueChange={(value) => setClaimType(value as ClaimType)}
              disabled={!!questionnaire}
            >
              <SelectTrigger id="claim_type">
                <SelectValue placeholder="Select claim type" />
              </SelectTrigger>
              <SelectContent>
                {claimTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {questionnaire && (
              <p className="text-xs text-black/60 dark:text-white/60">
                Claim type cannot be changed after creation
              </p>
            )}
          </div>

          {/* Questionnaire Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Questionnaire Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Travel Claims Questionnaire"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose of this questionnaire..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-black/20 dark:border-white/20"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active (questionnaire is available for use)
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
            <Button type="submit">
              {questionnaire ? 'Update' : 'Create'} Questionnaire
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
