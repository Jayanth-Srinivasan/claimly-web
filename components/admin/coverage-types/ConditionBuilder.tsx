'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RuleCondition, RuleOperator, LogicalOperator } from '@/types/rules'

interface ConditionBuilderProps {
  conditions: RuleCondition[]
  onChange: (conditions: RuleCondition[]) => void
}

const operators: { value: RuleOperator; label: string; valueType: string }[] = [
  { value: 'equals', label: 'Equals', valueType: 'any' },
  { value: 'not_equals', label: 'Not Equals', valueType: 'any' },
  { value: 'contains', label: 'Contains', valueType: 'string' },
  { value: 'not_contains', label: 'Not Contains', valueType: 'string' },
  { value: 'greater_than', label: 'Greater Than', valueType: 'number' },
  { value: 'less_than', label: 'Less Than', valueType: 'number' },
  { value: 'greater_than_or_equal', label: 'Greater Than or Equal', valueType: 'number' },
  { value: 'less_than_or_equal', label: 'Less Than or Equal', valueType: 'number' },
  { value: 'between', label: 'Between', valueType: 'range' },
  { value: 'in', label: 'In List', valueType: 'array' },
  { value: 'not_in', label: 'Not In List', valueType: 'array' },
  { value: 'is_empty', label: 'Is Empty', valueType: 'none' },
  { value: 'is_not_empty', label: 'Is Not Empty', valueType: 'none' },
  { value: 'regex', label: 'Matches Pattern', valueType: 'string' },
  { value: 'date_before', label: 'Date Before', valueType: 'date' },
  { value: 'date_after', label: 'Date After', valueType: 'date' },
  { value: 'date_between', label: 'Date Between', valueType: 'dateRange' },
]

export function ConditionBuilder({
  conditions,
  onChange,
}: ConditionBuilderProps) {
  const addCondition = () => {
    const newCondition: RuleCondition = {
      field: '',
      operator: 'equals',
      value: '',
      logicalOperator: conditions.length > 0 ? 'AND' : undefined,
    }
    onChange([...conditions, newCondition])
  }

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = conditions.map((c, i) =>
      i === index ? { ...c, ...updates } : c
    )
    onChange(newConditions)
  }

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index)
    // Remove logicalOperator from first condition if it exists
    if (newConditions.length > 0 && newConditions[0].logicalOperator) {
      newConditions[0] = { ...newConditions[0], logicalOperator: undefined }
    }
    onChange(newConditions)
  }

  const getValueType = (operator: RuleOperator): string => {
    const op = operators.find((o) => o.value === operator)
    return op?.valueType || 'any'
  }

  const renderValueInput = (condition: RuleCondition, index: number) => {
    const valueType = getValueType(condition.operator)

    if (valueType === 'none') {
      return null
    }

    if (valueType === 'range' || valueType === 'dateRange') {
      const [min, max] = Array.isArray(condition.value) ? condition.value : ['', '']
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Min</Label>
            <Input
              type={valueType === 'dateRange' ? 'date' : 'number'}
              value={min}
              onChange={(e) =>
                updateCondition(index, {
                  value: [e.target.value, max],
                })
              }
              placeholder="Minimum"
            />
          </div>
          <div>
            <Label className="text-xs">Max</Label>
            <Input
              type={valueType === 'dateRange' ? 'date' : 'number'}
              value={max}
              onChange={(e) =>
                updateCondition(index, {
                  value: [min, e.target.value],
                })
              }
              placeholder="Maximum"
            />
          </div>
        </div>
      )
    }

    if (valueType === 'array') {
      const arrayValue = Array.isArray(condition.value)
        ? condition.value.join(', ')
        : String(condition.value || '')
      return (
        <div>
          <Input
            value={arrayValue}
            onChange={(e) =>
              updateCondition(index, {
                value: e.target.value.split(',').map((v) => v.trim()),
              })
            }
            placeholder="value1, value2, value3"
          />
          <p className="text-xs text-black/60 dark:text-white/60 mt-1">
            Comma-separated values
          </p>
        </div>
      )
    }

    const inputType =
      valueType === 'number'
        ? 'number'
        : valueType === 'date'
        ? 'date'
        : 'text'

    return (
      <Input
        type={inputType}
        value={String(condition.value || '')}
        onChange={(e) =>
          updateCondition(index, {
            value: inputType === 'number' ? Number(e.target.value) : e.target.value,
          })
        }
        placeholder={
          valueType === 'string'
            ? 'Enter text value'
            : valueType === 'number'
            ? 'Enter number'
            : valueType === 'date'
            ? 'Select date'
            : 'Enter value'
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Conditions</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCondition}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Add Condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-black/10 dark:border-white/10 rounded-lg">
          <p className="text-sm text-black/60 dark:text-white/60 mb-3">
            No conditions yet
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCondition}
          >
            Add your first condition
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div
              key={index}
              className="p-4 border border-black/10 dark:border-white/10 rounded-lg space-y-3"
            >
              {/* Logical Operator */}
              {index > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-black/60 dark:text-white/60">
                    Operator
                  </Label>
                  <Select
                    value={condition.logicalOperator || 'AND'}
                    onValueChange={(value) =>
                      updateCondition(index, {
                        logicalOperator: value as LogicalOperator,
                      })
                    }
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Field */}
                <div className="space-y-1">
                  <Label className="text-xs">Field</Label>
                  <Input
                    placeholder="e.g., claim_amount, coverage_limit"
                    value={condition.field}
                    onChange={(e) =>
                      updateCondition(index, { field: e.target.value })
                    }
                  />
                </div>

                {/* Operator */}
                <div className="space-y-1">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={condition.operator}
                    onValueChange={(value) =>
                      updateCondition(index, {
                        operator: value as RuleOperator,
                        value: '', // Reset value when operator changes
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Value</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(index)}
                      className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {renderValueInput(condition, index)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {conditions.length > 0 && (
        <p className="text-xs text-black/60 dark:text-white/60">
          {conditions.length} condition{conditions.length !== 1 ? 's' : ''} defined
        </p>
      )}
    </div>
  )
}
