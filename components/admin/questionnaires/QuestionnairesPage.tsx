'use client'

import { useState } from 'react'
import { Plus, ClipboardList, Search, ArrowLeft } from 'lucide-react'
import { TopBar } from '../TopBar'
import { QuestionnaireCard } from './QuestionnaireCard'
import { QuestionnaireDialog } from './QuestionnaireDialog'
import { QuestionnaireDetailView } from './QuestionnaireDetailView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addQuestionnaire,
  editQuestionnaire,
  removeQuestionnaire,
  toggleQuestionnaire,
  addQuestion,
  editQuestion,
  removeQuestion,
  updateQuestionOrder,
} from '@/app/admin/rules/actions'
import type { Profile } from '@/types/auth'
import type { Questionnaire, QuestionnaireInsert, Question, QuestionInsert } from '@/types/policies'

interface QuestionnairesPageProps {
  profile: Profile
  initialQuestionnaires: Questionnaire[]
  initialQuestions: Question[]
}

export function QuestionnairesPage({ profile, initialQuestionnaires, initialQuestions }: QuestionnairesPageProps) {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>(initialQuestionnaires)
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<Questionnaire | null>(null)
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null)

  // Filter questionnaires based on search query
  const filteredQuestionnaires = questionnaires.filter(
    (q) =>
      q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.claim_type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateQuestionnaire = async (data: QuestionnaireInsert) => {
    try {
      const newQuestionnaire = await addQuestionnaire(data)
      setQuestionnaires([newQuestionnaire, ...questionnaires])
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Failed to create questionnaire:', error)
      alert('Failed to create questionnaire. Please try again.')
    }
  }

  const handleUpdateQuestionnaire = async (id: string, data: Partial<Questionnaire>) => {
    try {
      const updated = await editQuestionnaire(id, data)
      setQuestionnaires(
        questionnaires.map((q) =>
          q.id === id ? updated : q
        )
      )
      setEditingQuestionnaire(null)
      if (selectedQuestionnaire?.id === id) {
        setSelectedQuestionnaire(updated)
      }
    } catch (error) {
      console.error('Failed to update questionnaire:', error)
      alert('Failed to update questionnaire. Please try again.')
    }
  }

  const handleToggleActive = async (id: string) => {
    const questionnaire = questionnaires.find((q) => q.id === id)
    if (!questionnaire) return

    try {
      const updated = await toggleQuestionnaire(id, !questionnaire.is_active)
      setQuestionnaires(
        questionnaires.map((q) =>
          q.id === id ? updated : q
        )
      )
    } catch (error) {
      console.error('Failed to toggle questionnaire:', error)
      alert('Failed to toggle questionnaire status. Please try again.')
    }
  }

  const handleDeleteQuestionnaire = async (id: string) => {
    if (!confirm('Are you sure you want to delete this questionnaire? All associated questions will be deleted.')) {
      return
    }

    try {
      await removeQuestionnaire(id)
      setQuestionnaires(questionnaires.filter((q) => q.id !== id))
      setQuestions(questions.filter((q) => q.questionnaire_id !== id))
      if (selectedQuestionnaire?.id === id) {
        setSelectedQuestionnaire(null)
      }
    } catch (error) {
      console.error('Failed to delete questionnaire:', error)
      alert('Failed to delete questionnaire. Please try again.')
    }
  }

  const handleAddQuestion = async (data: QuestionInsert) => {
    try {
      const newQuestion = await addQuestion(data)
      setQuestions([...questions, newQuestion])
    } catch (error) {
      console.error('Failed to add question:', error)
      alert('Failed to add question. Please try again.')
    }
  }

  const handleUpdateQuestion = async (id: string, data: Partial<Question>) => {
    try {
      const updated = await editQuestion(id, data)
      setQuestions(
        questions.map((q) =>
          q.id === id ? updated : q
        )
      )
    } catch (error) {
      console.error('Failed to update question:', error)
      alert('Failed to update question. Please try again.')
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return
    }

    try {
      await removeQuestion(id)
      setQuestions(questions.filter((q) => q.id !== id))
    } catch (error) {
      console.error('Failed to delete question:', error)
      alert('Failed to delete question. Please try again.')
    }
  }

  const handleReorderQuestions = async (questionnaireId: string, reorderedQuestions: Question[]) => {
    const otherQuestions = questions.filter((q) => q.questionnaire_id !== questionnaireId)
    setQuestions([...otherQuestions, ...reorderedQuestions])

    try {
      await updateQuestionOrder(
        reorderedQuestions.map((q) => ({ id: q.id, order_index: q.order_index }))
      )
    } catch (error) {
      console.error('Failed to reorder questions:', error)
      alert('Failed to reorder questions. Please refresh the page.')
    }
  }

  const stats = {
    total: questionnaires.length,
    active: questionnaires.filter((q) => q.is_active).length,
    inactive: questionnaires.filter((q) => !q.is_active).length,
  }

  // If a questionnaire is selected, show detail view
  if (selectedQuestionnaire) {
    const questionnaireQuestions = questions
      .filter((q) => q.questionnaire_id === selectedQuestionnaire.id)
      .sort((a, b) => a.order_index - b.order_index)

    return (
      <div className="flex flex-col h-screen bg-white dark:bg-black overflow-hidden">
        <TopBar profile={profile} />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-480 mx-auto p-4 md:p-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedQuestionnaire(null)}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Questionnaires
            </Button>

            <QuestionnaireDetailView
              questionnaire={selectedQuestionnaire}
              questions={questionnaireQuestions}
              onUpdateQuestionnaire={(data) =>
                handleUpdateQuestionnaire(selectedQuestionnaire.id, data)
              }
              onAddQuestion={handleAddQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onReorderQuestions={handleReorderQuestions}
            />
          </div>
        </div>
      </div>
    )
  }

  // Otherwise, show questionnaire list
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black overflow-hidden">
      <TopBar profile={profile} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-480 mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white">
                  Questionnaires & Rules
                </h1>
                <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                  Manage claim submission forms and validation rules
                </p>
              </div>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Questionnaire
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-black/10 dark:border-white/10 rounded-xl p-4">
                <p className="text-sm text-black/60 dark:text-white/60">
                  Total Questionnaires
                </p>
                <p className="text-2xl font-bold text-black dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="border border-black/10 dark:border-white/10 rounded-xl p-4">
                <p className="text-sm text-black/60 dark:text-white/60">
                  Active
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="border border-black/10 dark:border-white/10 rounded-xl p-4">
                <p className="text-sm text-black/60 dark:text-white/60">
                  Inactive
                </p>
                <p className="text-2xl font-bold text-black/40 dark:text-white/40 mt-1">
                  {stats.inactive}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
              <Input
                placeholder="Search questionnaires..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Questionnaires List */}
          <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-black">
            <div className="p-6">
              {filteredQuestionnaires.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardList className="h-12 w-12 text-black/20 dark:text-white/20 mb-3" />
                  <p className="text-black/60 dark:text-white/60">
                    {searchQuery
                      ? 'No questionnaires match your search'
                      : 'No questionnaires yet'}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      variant="outline"
                      className="mt-4"
                    >
                      Add your first questionnaire
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuestionnaires.map((questionnaire) => {
                    const questionCount = questions.filter(
                      (q) => q.questionnaire_id === questionnaire.id
                    ).length
                    return (
                      <QuestionnaireCard
                        key={questionnaire.id}
                        questionnaire={questionnaire}
                        questionCount={questionCount}
                        onView={() => setSelectedQuestionnaire(questionnaire)}
                        onEdit={() => setEditingQuestionnaire(questionnaire)}
                        onToggleActive={() => handleToggleActive(questionnaire.id)}
                        onDelete={() => handleDeleteQuestionnaire(questionnaire.id)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <QuestionnaireDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateQuestionnaire}
      />

      {/* Edit Dialog */}
      {editingQuestionnaire && (
        <QuestionnaireDialog
          open={true}
          onOpenChange={(open) => !open && setEditingQuestionnaire(null)}
          questionnaire={editingQuestionnaire}
          onSubmit={(data) => handleUpdateQuestionnaire(editingQuestionnaire.id, data)}
        />
      )}
    </div>
  )
}
