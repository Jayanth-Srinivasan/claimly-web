'use client'

import { useState } from 'react'
import { Plus, Search, Filter, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TopBar } from '../TopBar'
import type { CoverageType, Rule, Question, QuestionInsert } from '@/types/policies'
import type { Profile } from '@/types/auth'
import { CoverageTypeCard } from './CoverageTypeCard'
import { CoverageTypeDialog } from './CoverageTypeDialog'
import { CoverageTypeDetailView } from './CoverageTypeDetailView'
import {
  addQuestion,
  editQuestion,
  removeQuestion,
  updateQuestionOrder,
  addRule,
  editRule,
  removeRule,
  toggleRule,
} from '@/app/admin/coverage-types/actions'

interface CoverageTypesPageProps {
  profile: Profile
  initialCoverageTypes: CoverageType[]
  initialRules: Rule[]
  initialQuestions: Question[]
}

export function CoverageTypesPage({ profile, initialCoverageTypes, initialRules, initialQuestions }: CoverageTypesPageProps) {
  const [coverageTypes, setCoverageTypes] = useState<CoverageType[]>(initialCoverageTypes)
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCoverageType, setEditingCoverageType] = useState<CoverageType | null>(null)
  const [selectedCoverageType, setSelectedCoverageType] = useState<CoverageType | null>(null)

  // Get unique categories
  const categories = ['all', ...new Set(coverageTypes.map((ct) => ct.category).filter(Boolean))]

  // Filter coverage types
  const filteredCoverageTypes = coverageTypes.filter((coverageType) => {
    const matchesSearch =
      coverageType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coverageType.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coverageType.slug.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' || coverageType.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Calculate stats
  const stats = {
    total: coverageTypes.length,
    active: coverageTypes.filter((ct) => ct.is_active).length,
    inactive: coverageTypes.filter((ct) => !ct.is_active).length,
    byCategory: coverageTypes.reduce(
      (acc, ct) => {
        const cat = ct.category || 'uncategorized'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),
  }

  // Rule handlers
  const handleAddRule = async (data: Omit<Rule, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newRule = await addRule(data)
      setRules([...rules, newRule])
    } catch (error) {
      console.error('Failed to add rule:', error)
      alert('Failed to add rule. Please try again.')
    }
  }

  const handleUpdateRule = async (id: string, data: Partial<Rule>) => {
    try {
      const updated = await editRule(id, data)
      setRules(rules.map((r) => (r.id === id ? updated : r)))
    } catch (error) {
      console.error('Failed to update rule:', error)
      alert('Failed to update rule. Please try again.')
    }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      await removeRule(id)
      setRules(rules.filter((r) => r.id !== id))
    } catch (error) {
      console.error('Failed to delete rule:', error)
      alert('Failed to delete rule. Please try again.')
    }
  }

  const handleToggleRule = async (id: string, isActive: boolean) => {
    try {
      const updated = await toggleRule(id, isActive)
      setRules(rules.map((r) => (r.id === id ? updated : r)))
    } catch (error) {
      console.error('Failed to toggle rule:', error)
      alert('Failed to toggle rule. Please try again.')
    }
  }

  // Question handlers
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
      setQuestions(questions.map((q) => (q.id === id ? updated : q)))
    } catch (error) {
      console.error('Failed to update question:', error)
      alert('Failed to update question. Please try again.')
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    try {
      await removeQuestion(id)
      setQuestions(questions.filter((q) => q.id !== id))
    } catch (error) {
      console.error('Failed to delete question:', error)
      alert('Failed to delete question. Please try again.')
    }
  }

  const handleReorderQuestions = async (coverageTypeId: string, reorderedQuestions: Question[]) => {
    try {
      // Update local state immediately for better UX
      setQuestions((prev) =>
        prev.map((q) => {
          const reordered = reorderedQuestions.find((rq) => rq.id === q.id)
          return reordered || q
        })
      )

      // Update in database
      const updates = reorderedQuestions.map((q) => ({
        id: q.id,
        order_index: q.order_index,
      }))
      await updateQuestionOrder(updates)
    } catch (error) {
      console.error('Failed to reorder questions:', error)
      alert('Failed to reorder questions. Please try again.')
      // Reload from initial state on error
      setQuestions(initialQuestions)
    }
  }

  // Coverage Type handlers
  const handleCreate = () => {
    setEditingCoverageType(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (coverageType: CoverageType) => {
    setEditingCoverageType(coverageType)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coverage type?')) return

    // TODO: Call server action to delete
    setCoverageTypes((prev) => prev.filter((ct) => ct.id !== id))
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    // TODO: Call server action to toggle
    setCoverageTypes((prev) =>
      prev.map((ct) => (ct.id === id ? { ...ct, is_active: isActive } : ct))
    )
  }

  const handleUpdateCoverageType = async (id: string, data: Partial<CoverageType>) => {
    // TODO: Call server action to update
    setCoverageTypes((prev) =>
      prev.map((ct) => (ct.id === id ? { ...ct, ...data } : ct))
    )
  }

  const handleSave = (savedCoverageType: CoverageType) => {
    if (editingCoverageType) {
      // Update existing
      setCoverageTypes((prev) =>
        prev.map((ct) => (ct.id === savedCoverageType.id ? savedCoverageType : ct))
      )
    } else {
      // Add new
      setCoverageTypes((prev) => [savedCoverageType, ...prev])
    }
    setIsDialogOpen(false)
    setEditingCoverageType(null)
  }

  // If a coverage type is selected, show detail view
  if (selectedCoverageType) {
    const coverageTypeRules = rules.filter(
      (r) => r.coverage_type_id === selectedCoverageType.id
    )
    const coverageTypeQuestions = questions.filter(
      (q) => q.coverage_type_id === selectedCoverageType.id
    ).sort((a, b) => a.order_index - b.order_index)

    return (
      <div className="flex flex-col h-screen bg-white dark:bg-black overflow-hidden">
        <TopBar profile={profile} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-480 mx-auto p-4 md:p-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedCoverageType(null)}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Coverage Types
            </Button>

            <CoverageTypeDetailView
              coverageType={selectedCoverageType}
              rules={coverageTypeRules}
              questions={coverageTypeQuestions}
              onUpdateCoverageType={(data) =>
                handleUpdateCoverageType(selectedCoverageType.id, data)
              }
              onAddRule={handleAddRule}
              onUpdateRule={handleUpdateRule}
              onDeleteRule={handleDeleteRule}
              onToggleRule={handleToggleRule}
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

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black overflow-hidden">
      <TopBar profile={profile} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-480 mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Coverage Types</h1>
              <p className="text-muted-foreground mt-1">
                Manage insurance coverage types for policies
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Coverage Type
            </button>
          </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold mt-1 text-green-600">{stats.active}</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground">Inactive</div>
          <div className="text-2xl font-bold mt-1 text-red-600">{stats.inactive}</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground">Categories</div>
          <div className="text-2xl font-bold mt-1">{categories.length - 1}</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search coverage types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Category Filter */}
        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            {categories.map((category) => (
              <option key={category || 'none'} value={category || ''}>
                {category === 'all' ? 'All Categories' : (category || 'Uncategorized')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Coverage Types List */}
      {filteredCoverageTypes.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <div className="text-muted-foreground">
            {searchQuery || selectedCategory !== 'all'
              ? 'No coverage types match your filters'
              : 'No coverage types yet'}
          </div>
          {!searchQuery && selectedCategory === 'all' && (
            <button
              onClick={handleCreate}
              className="mt-4 text-primary hover:underline"
            >
              Create your first coverage type
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoverageTypes.map((coverageType) => (
            <CoverageTypeCard
              key={coverageType.id}
              coverageType={coverageType}
              onView={() => setSelectedCoverageType(coverageType)}
              onEdit={() => handleEdit(coverageType)}
              onDelete={() => handleDelete(coverageType.id)}
              onToggle={(isActive) => handleToggle(coverageType.id, isActive)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {isDialogOpen && (
        <CoverageTypeDialog
          coverageType={editingCoverageType}
          onClose={() => {
            setIsDialogOpen(false)
            setEditingCoverageType(null)
          }}
          onSave={handleSave}
        />
      )}
        </div>
      </div>
    </div>
  )
}
