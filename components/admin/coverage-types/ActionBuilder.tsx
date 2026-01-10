'use client'

import { Plus, X } from 'lucide-react'
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
import type { RuleAction, ActionType } from '@/types/rules'

interface ActionBuilderProps {
  actions: RuleAction[]
  onChange: (actions: RuleAction[]) => void
}

const actionTypes: { value: ActionType; label: string; description: string }[] = [
  {
    value: 'validate',
    label: 'Validate',
    description: 'Show validation error',
  },
  {
    value: 'require_document',
    label: 'Require Document',
    description: 'Require document upload',
  },
  {
    value: 'block_submission',
    label: 'Block Submission',
    description: 'Prevent form submission',
  },
  {
    value: 'show_warning',
    label: 'Show Warning',
    description: 'Display a warning message',
  },
  {
    value: 'calculate_value',
    label: 'Calculate Value',
    description: 'Calculate field values based on formulas',
  },
]

export function ActionBuilder({ actions, onChange }: ActionBuilderProps) {
  const addAction = () => {
    const newAction: RuleAction = {
      type: 'validate',
      errorMessage: '',
    }
    onChange([...actions, newAction])
  }

  const updateAction = (index: number, updates: Partial<RuleAction>) => {
    const newActions = actions.map((a, i) => (i === index ? { ...a, ...updates } : a))
    onChange(newActions)
  }

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index))
  }

  const renderActionFields = (action: RuleAction, index: number) => {
    switch (action.type) {
      case 'calculate_value':
        return (
          <div className="space-y-2">
            <Label className="text-xs">Target Field</Label>
            <Input
              placeholder="Field name to calculate"
              value={action.targetField || ''}
              onChange={(e) =>
                updateAction(index, { targetField: e.target.value })
              }
            />
            <Label className="text-xs">Formula</Label>
            <Input
              placeholder="e.g., fieldA + fieldB * 0.1"
              value={action.formula || ''}
              onChange={(e) =>
                updateAction(index, { formula: e.target.value })
              }
            />
          </div>
        )

      case 'validate':
        return (
          <div className="space-y-2">
            <Label className="text-xs">Error Message</Label>
            <Textarea
              value={action.errorMessage || ''}
              onChange={(e) => updateAction(index, { errorMessage: e.target.value })}
              placeholder="e.g., Value must be between $100 and $50,000"
              rows={2}
            />
          </div>
        )

      case 'require_document':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Document Types</Label>
              <Input
                value={(action.documentTypes || []).join(', ')}
                onChange={(e) =>
                  updateAction(index, {
                    documentTypes: e.target.value.split(',').map((v) => v.trim()),
                  })
                }
                placeholder="medical_bill, receipt, invoice"
              />
              <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                Comma-separated document types
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Files</Label>
                <Input
                  type="number"
                  min="0"
                  value={action.minFiles || 1}
                  onChange={(e) =>
                    updateAction(index, { minFiles: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Max Files</Label>
                <Input
                  type="number"
                  min="0"
                  value={action.maxFiles || ''}
                  onChange={(e) =>
                    updateAction(index, {
                      maxFiles: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Max File Size (MB)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={action.maxFileSize || ''}
                onChange={(e) =>
                  updateAction(index, {
                    maxFileSize: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="10"
              />
            </div>

            <div>
              <Label className="text-xs">Allowed File Types</Label>
              <Input
                value={(action.allowedFormats || []).join(', ')}
                onChange={(e) =>
                  updateAction(index, {
                    allowedFormats: e.target.value
                      .split(',')
                      .map((v) => v.trim()),
                  })
                }
                placeholder=".pdf, .jpg, .png"
              />
              <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                File extensions (optional)
              </p>
            </div>

            <div>
              <Label className="text-xs">Error Message (optional)</Label>
              <Textarea
                value={action.errorMessage || ''}
                onChange={(e) =>
                  updateAction(index, { errorMessage: e.target.value })
                }
                placeholder="e.g., Please upload medical bills for claims over $1,000"
                rows={2}
              />
            </div>
          </div>
        )

      case 'block_submission':
        return (
          <div className="space-y-2">
            <Label className="text-xs">Block Message</Label>
            <Textarea
              value={action.errorMessage || ''}
              onChange={(e) => updateAction(index, { errorMessage: e.target.value })}
              placeholder="e.g., Claims must be filed within 90 days of incident"
              rows={2}
            />
            <p className="text-xs text-black/60 dark:text-white/60">
              Message shown when user tries to submit
            </p>
          </div>
        )

      case 'show_warning':
        return (
          <div className="space-y-2">
            <Label className="text-xs">Warning Message</Label>
            <Textarea
              value={action.warningMessage || action.errorMessage || ''}
              onChange={(e) =>
                updateAction(index, { warningMessage: e.target.value })
              }
              placeholder="e.g., Processing may take longer for international claims"
              rows={2}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Actions</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAction}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Add Action
        </Button>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-black/10 dark:border-white/10 rounded-lg">
          <p className="text-sm text-black/60 dark:text-white/60 mb-3">
            No actions yet
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addAction}>
            Add your first action
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div
              key={index}
              className="p-4 border border-black/10 dark:border-white/10 rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Action Type</Label>
                  <Select
                    value={action.type}
                    onValueChange={(value) =>
                      updateAction(index, {
                        type: value as ActionType,
                        // Reset action-specific fields
                        targetQuestionId: undefined,
                        errorMessage: undefined,
                        warningMessage: undefined,
                        documentTypes: undefined,
                        minFiles: undefined,
                        maxFiles: undefined,
                        maxFileSize: undefined,
                        allowedFormats: undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((at) => (
                        <SelectItem key={at.value} value={at.value}>
                          <div className="flex flex-col">
                            <span>{at.label}</span>
                            <span className="text-xs text-black/60 dark:text-white/60">
                              {at.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAction(index)}
                  className="mt-6 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {renderActionFields(action, index)}
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <p className="text-xs text-black/60 dark:text-white/60">
          {actions.length} action{actions.length !== 1 ? 's' : ''} defined
        </p>
      )}
    </div>
  )
}
