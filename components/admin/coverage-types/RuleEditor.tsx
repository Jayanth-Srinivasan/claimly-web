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
import { ConditionBuilder } from './ConditionBuilder'
import { ActionBuilder } from './ActionBuilder'
import type { Rule } from '@/types/policies'
import type { RuleType, RuleCondition, RuleAction } from '@/types/rules'

interface RuleEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coverageTypeId: string
  rule?: Rule
  onSubmit: (data: Omit<Rule, 'id' | 'created_at' | 'updated_at'>) => void
}

const ruleTypes: { value: RuleType; label: string; description: string }[] = [
  {
    value: 'conditional',
    label: 'Conditional',
    description: 'Show or hide questions based on answers',
  },
  {
    value: 'validation',
    label: 'Validation',
    description: 'Validate field values with custom rules',
  },
  {
    value: 'document',
    label: 'Document',
    description: 'Require specific documents to be uploaded',
  },
  {
    value: 'eligibility',
    label: 'Eligibility',
    description: 'Determine if user is eligible to submit',
  },
]

export function RuleEditor({
  open,
  onOpenChange,
  coverageTypeId,
  rule,
  onSubmit,
}: RuleEditorProps) {
  const isEdit = !!rule

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ruleType, setRuleType] = useState<RuleType>('conditional')
  const [conditions, setConditions] = useState<RuleCondition[]>([])
  const [actions, setActions] = useState<RuleAction[]>([])
  const [priority, setPriority] = useState(10)
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form from rule prop
  useEffect(() => {
    if (rule) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(rule.name)
      setDescription(rule.description || '')
      setRuleType(rule.rule_type)
      setConditions((rule.conditions as RuleCondition[]) || [])
      setActions((rule.actions as RuleAction[]) || [])
      setPriority(rule.priority || 10)
      setIsActive(rule.is_active ?? true)
      /* eslint-enable react-hooks/set-state-in-effect */
    } else {
      /* eslint-disable react-hooks/set-state-in-effect */
      // Reset for new rule
      setName('')
      setDescription('')
      setRuleType('conditional')
      setConditions([])
      setActions([])
      setPriority(10)
      setIsActive(true)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setErrors({})
  }, [rule, open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Rule name is required'
    }

    if (conditions.length === 0) {
      newErrors.conditions = 'At least one condition is required'
    }

    if (actions.length === 0) {
      newErrors.actions = 'At least one action is required'
    }

    // Validate that all conditions have required fields
    conditions.forEach((condition, index) => {
      if (!condition.field) {
        newErrors[`condition_${index}_field`] = 'Field is required'
      }
      if (
        condition.operator !== 'is_empty' &&
        condition.operator !== 'is_not_empty' &&
        (condition.value === '' || condition.value === null || condition.value === undefined)
      ) {
        newErrors[`condition_${index}_value`] = 'Value is required'
      }
    })

    // Validate that all actions have required fields
    actions.forEach((action, index) => {
      if (
        (action.type === 'show_question' || action.type === 'hide_question') &&
        !action.targetQuestionId
      ) {
        newErrors[`action_${index}_target`] = 'Target question is required'
      }
      if (
        (action.type === 'validate' ||
          action.type === 'block_submission') &&
        !action.errorMessage
      ) {
        newErrors[`action_${index}_message`] = 'Error message is required'
      }
      if (action.type === 'require_document' && (!action.documentTypes || action.documentTypes.length === 0)) {
        newErrors[`action_${index}_documents`] = 'At least one document type is required'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    onSubmit({
      coverage_type_id: coverageTypeId,
      rule_type: ruleType,
      name: name.trim(),
      description: description.trim() || null,
      conditions,
      actions,
      priority,
      is_active: isActive,
      error_message: null,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Rule' : 'Add New Rule'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the rule details below.'
              : 'Create a new rule to control questionnaire behavior.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Rule Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Show medical questions for medical emergencies"
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rule does..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule_type">
                  Rule Type <span className="text-red-500">*</span>
                </Label>
                <Select value={ruleType} onValueChange={(v) => setRuleType(v as RuleType)}>
                  <SelectTrigger id="rule_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-black/60 dark:text-white/60">
                            {type.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  min="0"
                />
                <p className="text-xs text-black/60 dark:text-white/60">
                  Higher priority rules are evaluated first
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Status</Label>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-black/20 dark:border-white/20"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Active (rule is enabled)
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="border-t border-black/10 dark:border-white/10 pt-6">
            <ConditionBuilder
              conditions={conditions}
              onChange={setConditions}
            />
            {errors.conditions && (
              <p className="text-sm text-red-500 mt-2">{errors.conditions}</p>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-black/10 dark:border-white/10 pt-6">
            <ActionBuilder
              actions={actions}
              onChange={setActions}
            />
            {errors.actions && (
              <p className="text-sm text-red-500 mt-2">{errors.actions}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Update' : 'Create'} Rule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
