'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Question, QuestionInsert, FieldType } from '@/types/policies'

interface QuestionEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question?: Question
  onSubmit: (data: Omit<QuestionInsert, 'questionnaire_id' | 'order_index'>) => void
}

const fieldTypes: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single or multi-line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input field' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'file', label: 'File', description: 'File upload field' },
  { value: 'select', label: 'Select', description: 'Dropdown selection' },
]

export function QuestionEditor({
  open,
  onOpenChange,
  question,
  onSubmit,
}: QuestionEditorProps) {
  // Initialize state from question prop directly (state initializers only run once per mount)
  // Dialog will remount when question.id changes (via key prop)
  const [questionText, setQuestionText] = useState(question?.question_text || '')
  const [fieldType, setFieldType] = useState<FieldType>(question?.field_type || 'text')
  const [isRequired, setIsRequired] = useState(question?.is_required ?? false)
  const [placeholder, setPlaceholder] = useState(question?.placeholder || '')
  const [helpText, setHelpText] = useState(question?.help_text || '')
  const [options, setOptions] = useState<string[]>(question?.options || [])
  const [newOption, setNewOption] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!questionText.trim()) {
      newErrors.questionText = 'Question text is required'
    }

    if (fieldType === 'select' && options.length === 0) {
      newErrors.options = 'At least one option is required for select fields'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddOption = () => {
    const trimmed = newOption.trim()
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed])
      setNewOption('')
    }
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleFieldTypeChange = (value: FieldType) => {
    setFieldType(value)
    if (value !== 'select') {
      setOptions([])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    onSubmit({
      question_text: questionText.trim(),
      field_type: fieldType,
      is_required: isRequired,
      placeholder: placeholder.trim() || null,
      help_text: helpText.trim() || null,
      options: fieldType === 'select' ? options : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={question?.id || 'new'} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? 'Edit Question' : 'Add New Question'}
          </DialogTitle>
          <DialogDescription>
            {question
              ? 'Update the question details below.'
              : 'Add a new question to the questionnaire.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="question_text">
              Question Text <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="question_text"
              placeholder="e.g., What is your departure date?"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={2}
              className={errors.questionText ? 'border-red-500' : ''}
            />
            {errors.questionText && (
              <p className="text-sm text-red-500">{errors.questionText}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="field_type">
              Field Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={fieldType}
              onValueChange={handleFieldTypeChange}
            >
              <SelectTrigger id="field_type">
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-black/60 dark:text-white/60">
                        {type.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fieldType === 'select' && (
            <div className="space-y-2">
              <Label>
                Options <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Flight Delay, Trip Cancellation"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddOption()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddOption}
                  disabled={!newOption.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-3 border border-black/10 dark:border-white/10 rounded-lg">
                  {options.map((option, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-black/5 dark:bg-white/5 text-black dark:text-white"
                    >
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {errors.options && (
                <p className="text-sm text-red-500">{errors.options}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="placeholder">Placeholder Text</Label>
            <Input
              id="placeholder"
              placeholder="e.g., MM/DD/YYYY"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
            />
            <p className="text-xs text-black/60 dark:text-white/60">
              Hint text shown inside the input field
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="help_text">Help Text</Label>
            <Textarea
              id="help_text"
              placeholder="Additional instructions or clarification..."
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-black/60 dark:text-white/60">
              Additional context shown below the question
            </p>
          </div>

          {/* Required Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_required"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 rounded border-black/20 dark:border-white/20"
            />
            <Label htmlFor="is_required" className="cursor-pointer">
              Required (user must answer this question)
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
              {question ? 'Update' : 'Add'} Question
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
