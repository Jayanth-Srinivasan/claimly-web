'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Question } from '@/types/policies'

interface QuestionsTabProps {
  coverageTypeId: string
  questions: Question[]
  onAddQuestion: () => void
  onEditQuestion: (question: Question) => void
  onDeleteQuestion: (id: string) => void
  onReorderQuestions: (reorderedQuestions: Question[]) => void
}

const fieldTypeLabels: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  file: 'File',
  select: 'Select',
}

const fieldTypeColors: Record<string, string> = {
  text: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  number: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  date: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  file: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  select: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
}

export function QuestionsTab({
  coverageTypeId: _coverageTypeId,
  questions,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onReorderQuestions,
}: QuestionsTabProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDelete = (id: string, questionText: string) => {
    if (confirm(`Are you sure you want to delete the question "${questionText}"?`)) {
      onDeleteQuestion(id)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const reordered = [...questions]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(index, 0, removed)

    // Update order_index for all affected questions
    const updated = reordered.map((q, i) => ({ ...q, order_index: i }))

    onReorderQuestions(updated)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-white">
            Questions ({questions.length})
          </h3>
          <p className="text-sm text-black/60 dark:text-white/60">
            Manage questions for this coverage type
          </p>
        </div>
        <Button onClick={onAddQuestion} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-black/10 dark:border-white/10 rounded-lg">
          <p className="text-black/60 dark:text-white/60 mb-4">
            No questions yet
          </p>
          <Button onClick={onAddQuestion} variant="outline">
            Add your first question
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div
              key={question.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`group p-4 border border-black/10 dark:border-white/10 rounded-lg hover:border-black/20 dark:hover:border-white/20 transition-colors bg-white dark:bg-black cursor-move ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Drag Handle */}
                <div className="flex-shrink-0 mt-1">
                  <GripVertical className="h-5 w-5 text-black/40 dark:text-white/40" />
                </div>

                {/* Question Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={fieldTypeColors[question.field_type] || 'bg-gray-100 text-gray-700'}>
                          {fieldTypeLabels[question.field_type] || question.field_type}
                        </Badge>
                        {question.is_required && (
                          <Badge variant="outline" className="text-xs text-red-600 dark:text-red-400">
                            Required
                          </Badge>
                        )}
                        <span className="text-xs text-black/60 dark:text-white/60">
                          #{index + 1}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {question.question_text}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditQuestion(question)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(question.id, question.question_text)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-1 text-xs text-black/60 dark:text-white/60">
                    {question.placeholder && (
                      <div>
                        <span className="font-medium">Placeholder:</span> {question.placeholder}
                      </div>
                    )}
                    {question.help_text && (
                      <div>
                        <span className="font-medium">Help:</span> {question.help_text}
                      </div>
                    )}
                    {question.field_type === 'select' && question.options && (
                      <div>
                        <span className="font-medium">Options:</span>{' '}
                        {question.options.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <p className="text-xs text-black/60 dark:text-white/60 text-center">
          Drag and drop to reorder questions
        </p>
      )}
    </div>
  )
}
