'use client'

import { useState } from 'react'
import { Plus, Edit, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuestionEditor } from './QuestionEditor'
import { QuestionnaireDialog } from './QuestionnaireDialog'
import type { Questionnaire, Question, QuestionInsert, ClaimType } from '@/types/policies'

interface QuestionnaireDetailViewProps {
  questionnaire: Questionnaire
  questions: Question[]
  onUpdateQuestionnaire: (data: Partial<Questionnaire>) => void
  onAddQuestion: (data: QuestionInsert) => void
  onUpdateQuestion: (id: string, data: Partial<Question>) => void
  onDeleteQuestion: (id: string) => void
  onReorderQuestions: (questionnaireId: string, reorderedQuestions: Question[]) => void
}

const claimTypeLabels: Record<ClaimType, string> = {
  travel: 'Travel',
  medical: 'Medical',
  baggage: 'Baggage',
  flight: 'Flight',
}

export function QuestionnaireDetailView({
  questionnaire,
  questions,
  onUpdateQuestionnaire,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestions,
}: QuestionnaireDetailViewProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newQuestions = [...questions]
    const draggedQuestion = newQuestions[draggedIndex]
    newQuestions.splice(draggedIndex, 1)
    newQuestions.splice(index, 0, draggedQuestion)

    // Update order_index for all questions
    const reorderedQuestions = newQuestions.map((q, i) => ({
      ...q,
      order_index: i + 1,
    }))

    onReorderQuestions(questionnaire.id, reorderedQuestions)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleAddQuestionSubmit = (data: Omit<QuestionInsert, 'questionnaire_id' | 'order_index'>) => {
    onAddQuestion({
      ...data,
      questionnaire_id: questionnaire.id,
      order_index: questions.length + 1,
    })
    setIsAddingQuestion(false)
  }

  const handleEditQuestionSubmit = (data: Omit<QuestionInsert, 'questionnaire_id' | 'order_index'>) => {
    if (editingQuestion) {
      onUpdateQuestion(editingQuestion.id, data)
      setEditingQuestion(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-black/10 dark:border-white/10 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-black dark:text-white">
                {questionnaire.name}
              </h2>
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {claimTypeLabels[questionnaire.claim_type]}
              </Badge>
              <Badge
                variant={questionnaire.is_active ? 'default' : 'secondary'}
                className={
                  questionnaire.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60'
                }
              >
                {questionnaire.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {questionnaire.description && (
              <p className="text-black/60 dark:text-white/60">
                {questionnaire.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-black/40 dark:text-white/40">
              <span>
                Created {new Date(questionnaire.created_at).toLocaleDateString()}
              </span>
              {questionnaire.updated_at !== questionnaire.created_at && (
                <span>
                  Updated {new Date(questionnaire.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Details
          </Button>
        </div>
      </div>

      {/* Questions Section */}
      <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-black dark:text-white">
                Questions ({questions.length})
              </h3>
              <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                Drag and drop to reorder questions
              </p>
            </div>
            <Button
              onClick={() => setIsAddingQuestion(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-black/60 dark:text-white/60 mb-4">
                No questions yet
              </p>
              <Button
                onClick={() => setIsAddingQuestion(true)}
                variant="outline"
              >
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
                  className="group flex items-start gap-3 p-4 border border-black/10 dark:border-white/10 rounded-lg hover:border-black/20 dark:hover:border-white/20 transition-colors cursor-move bg-white dark:bg-black"
                >
                  <GripVertical className="h-5 w-5 text-black/40 dark:text-white/40 mt-0.5 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-black/40 dark:text-white/40">
                            Q{question.order_index}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {question.field_type}
                          </Badge>
                          {question.is_required && (
                            <Badge variant="outline" className="text-xs text-red-600 dark:text-red-400">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-black dark:text-white mb-1">
                          {question.question_text}
                        </p>
                        {question.placeholder && (
                          <p className="text-sm text-black/60 dark:text-white/60">
                            Placeholder: {question.placeholder}
                          </p>
                        )}
                        {question.help_text && (
                          <p className="text-sm text-black/60 dark:text-white/60">
                            Help: {question.help_text}
                          </p>
                        )}
                        {question.options && question.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {question.options.map((option, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70"
                              >
                                {option}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingQuestion(question)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteQuestion(question.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Questionnaire Dialog */}
      <QuestionnaireDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        questionnaire={questionnaire}
        onSubmit={(data) => {
          onUpdateQuestionnaire(data)
          setIsEditDialogOpen(false)
        }}
      />

      {/* Add Question Dialog */}
      {isAddingQuestion && (
        <QuestionEditor
          open={isAddingQuestion}
          onOpenChange={setIsAddingQuestion}
          onSubmit={handleAddQuestionSubmit}
        />
      )}

      {/* Edit Question Dialog */}
      {editingQuestion && (
        <QuestionEditor
          open={true}
          onOpenChange={(open) => !open && setEditingQuestion(null)}
          question={editingQuestion}
          onSubmit={handleEditQuestionSubmit}
        />
      )}
    </div>
  )
}
