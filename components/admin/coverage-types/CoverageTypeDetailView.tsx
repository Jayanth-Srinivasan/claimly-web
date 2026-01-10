'use client'

import { useState } from 'react'
import { Edit, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CoverageTypeDialog } from './CoverageTypeDialog'
import { RulesTab } from './RulesTab'
import { RuleEditor } from './RuleEditor'
import { QuestionsTab } from './QuestionsTab'
import { QuestionEditor } from './QuestionEditor'
import type { CoverageType, Rule, Question, QuestionInsert } from '@/types/policies'

interface CoverageTypeDetailViewProps {
  coverageType: CoverageType
  rules: Rule[]
  questions: Question[]
  onUpdateCoverageType: (data: Partial<CoverageType>) => void
  onAddRule: (data: Omit<Rule, 'id' | 'created_at' | 'updated_at'>) => void
  onUpdateRule: (id: string, data: Partial<Rule>) => void
  onDeleteRule: (id: string) => void
  onToggleRule: (id: string, isActive: boolean) => void
  onAddQuestion: (data: QuestionInsert) => void
  onUpdateQuestion: (id: string, data: Partial<Question>) => void
  onDeleteQuestion: (id: string) => void
  onReorderQuestions: (coverageTypeId: string, reorderedQuestions: Question[]) => void
}

export function CoverageTypeDetailView({
  coverageType,
  rules,
  questions,
  onUpdateCoverageType,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestions,
}: CoverageTypeDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'rules' | 'questions'>('details')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isRuleEditorOpen, setIsRuleEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [isQuestionEditorOpen, setIsQuestionEditorOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  const handleAddRule = () => {
    setEditingRule(null)
    setIsRuleEditorOpen(true)
  }

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule)
    setIsRuleEditorOpen(true)
  }

  const handleRuleSubmit = (data: Omit<Rule, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingRule) {
      onUpdateRule(editingRule.id, data)
    } else {
      onAddRule(data)
    }
    setIsRuleEditorOpen(false)
    setEditingRule(null)
  }

  const handleAddQuestion = () => {
    setEditingQuestion(null)
    setIsQuestionEditorOpen(true)
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setIsQuestionEditorOpen(true)
  }

  const handleQuestionSubmit = (data: Omit<QuestionInsert, 'coverage_type_id' | 'order_index'>) => {
    if (editingQuestion) {
      onUpdateQuestion(editingQuestion.id, data)
    } else {
      onAddQuestion({
        ...data,
        coverage_type_id: coverageType.id,
        order_index: questions.length,
      })
    }
    setIsQuestionEditorOpen(false)
    setEditingQuestion(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-black/10 dark:border-white/10 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-black dark:text-white">
                {coverageType.name}
              </h2>
              {coverageType.category && (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {coverageType.category}
                </Badge>
              )}
              <Badge
                variant={coverageType.is_active ? 'default' : 'secondary'}
                className={
                  coverageType.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60'
                }
              >
                {coverageType.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {coverageType.description && (
              <p className="text-black/60 dark:text-white/60">
                {coverageType.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-black/40 dark:text-white/40">
              <span>
                Created {new Date(coverageType.created_at).toLocaleDateString()}
              </span>
              {coverageType.updated_at !== coverageType.created_at && (
                <span>
                  Updated {new Date(coverageType.updated_at).toLocaleDateString()}
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

      {/* Tabs */}
      <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
        <div className="border-b border-black/10 dark:border-white/10">
          <div className="flex">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'rules'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              Rules ({rules.length})
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'questions'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              Questions ({questions.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-black/60 dark:text-white/60">
                    Name
                  </Label>
                  <p className="text-black dark:text-white mt-1">{coverageType.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-black/60 dark:text-white/60">
                    Slug
                  </Label>
                  <p className="text-black dark:text-white mt-1">{coverageType.slug}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-black/60 dark:text-white/60">
                    Category
                  </Label>
                  <p className="text-black dark:text-white mt-1">
                    {coverageType.category || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-black/60 dark:text-white/60">
                    Display Order
                  </Label>
                  <p className="text-black dark:text-white mt-1">
                    {coverageType.display_order}
                  </p>
                </div>
              </div>
              {coverageType.description && (
                <div>
                  <Label className="text-sm font-medium text-black/60 dark:text-white/60">
                    Description
                  </Label>
                  <p className="text-black dark:text-white mt-1">
                    {coverageType.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <RulesTab
              coverageTypeId={coverageType.id}
              rules={rules}
              onAddRule={handleAddRule}
              onEditRule={handleEditRule}
              onDeleteRule={onDeleteRule}
              onToggleRule={onToggleRule}
            />
          )}

          {activeTab === 'questions' && (
            <QuestionsTab
              coverageTypeId={coverageType.id}
              questions={questions}
              onAddQuestion={handleAddQuestion}
              onEditQuestion={handleEditQuestion}
              onDeleteQuestion={onDeleteQuestion}
              onReorderQuestions={(reorderedQuestions) => onReorderQuestions(coverageType.id, reorderedQuestions)}
            />
          )}
        </div>
      </div>

      {/* Edit Coverage Type Dialog */}
      {isEditDialogOpen && (
        <CoverageTypeDialog
          coverageType={coverageType}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(updatedCoverageType) => {
            onUpdateCoverageType(updatedCoverageType)
            setIsEditDialogOpen(false)
          }}
        />
      )}

      {/* Rule Editor Dialog */}
      <RuleEditor
        open={isRuleEditorOpen}
        onOpenChange={setIsRuleEditorOpen}
        coverageTypeId={coverageType.id}
        rule={editingRule || undefined}
        onSubmit={handleRuleSubmit}
      />

      {/* Question Editor Dialog */}
      <QuestionEditor
        open={isQuestionEditorOpen}
        onOpenChange={setIsQuestionEditorOpen}
        question={editingQuestion || undefined}
        onSubmit={handleQuestionSubmit}
      />
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={className}>{children}</label>
}
