'use server'

import { revalidatePath } from 'next/cache'
import {
  getCoverageTypes,
  getActiveCoverageTypes,
  getCoverageType,
  createCoverageType,
  updateCoverageType,
  deleteCoverageType,
  toggleCoverageTypeActive,
  getCoverageTypesByCategory,
  searchCoverageTypes,
  reorderCoverageTypes,
  getCoverageTypeStats,
} from '@/lib/supabase/coverage-types'
import {
  getQuestionsByCoverageType,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from '@/lib/supabase/questions'
import {
  createRule,
  updateRule,
  deleteRule,
  toggleRuleActive,
} from '@/lib/supabase/rules'
import type { CoverageType, CoverageTypeInsert, CoverageTypeUpdate, Question, QuestionInsert, QuestionUpdate, Rule, RuleInsert, RuleUpdate } from '@/types/policies'

/**
 * Fetch all coverage types
 */
export async function fetchCoverageTypes(): Promise<CoverageType[]> {
  return getCoverageTypes()
}

/**
 * Fetch active coverage types only
 */
export async function fetchActiveCoverageTypes(): Promise<CoverageType[]> {
  return getActiveCoverageTypes()
}

/**
 * Fetch coverage types by category
 */
export async function fetchCoverageTypesByCategory(category: string): Promise<CoverageType[]> {
  return getCoverageTypesByCategory(category)
}

/**
 * Search coverage types
 */
export async function searchCoverageTypesAction(query: string): Promise<CoverageType[]> {
  return searchCoverageTypes(query)
}

/**
 * Fetch a single coverage type
 */
export async function fetchCoverageType(id: string): Promise<CoverageType | null> {
  return getCoverageType(id)
}

/**
 * Add a new coverage type
 */
export async function addCoverageType(data: CoverageTypeInsert): Promise<CoverageType> {
  const coverageType = await createCoverageType(data)
  revalidatePath('/admin/coverage-types')
  return coverageType
}

/**
 * Edit an existing coverage type
 */
export async function editCoverageType(
  id: string,
  updates: CoverageTypeUpdate
): Promise<CoverageType> {
  const coverageType = await updateCoverageType(id, updates)
  revalidatePath('/admin/coverage-types')
  return coverageType
}

/**
 * Remove a coverage type
 */
export async function removeCoverageType(id: string): Promise<void> {
  await deleteCoverageType(id)
  revalidatePath('/admin/coverage-types')
}

/**
 * Toggle coverage type active status
 */
export async function toggleCoverageType(id: string, isActive: boolean): Promise<CoverageType> {
  const coverageType = await toggleCoverageTypeActive(id, isActive)
  revalidatePath('/admin/coverage-types')
  return coverageType
}

/**
 * Reorder coverage types
 */
export async function reorderCoverageTypesAction(
  updates: Array<{ id: string; display_order: number }>
): Promise<void> {
  await reorderCoverageTypes(updates)
  revalidatePath('/admin/coverage-types')
}

/**
 * Get coverage type statistics
 */
export async function fetchCoverageTypeStats(): Promise<{
  total: number
  active: number
  inactive: number
  byCategory: Record<string, number>
}> {
  return getCoverageTypeStats()
}

// ============================================
// Question Actions
// ============================================

/**
 * Fetch questions for a specific coverage type
 */
export async function fetchQuestions(coverageTypeId: string): Promise<Question[]> {
  return await getQuestionsByCoverageType(coverageTypeId)
}

/**
 * Add a new question
 */
export async function addQuestion(data: QuestionInsert): Promise<Question> {
  const result = await createQuestion(data)
  revalidatePath('/admin/coverage-types')
  return result
}

/**
 * Edit an existing question
 */
export async function editQuestion(id: string, data: QuestionUpdate): Promise<Question> {
  const result = await updateQuestion(id, data)
  revalidatePath('/admin/coverage-types')
  return result
}

/**
 * Remove a question
 */
export async function removeQuestion(id: string): Promise<void> {
  await deleteQuestion(id)
  revalidatePath('/admin/coverage-types')
}

/**
 * Update question order
 */
export async function updateQuestionOrder(questions: { id: string; order_index: number }[]): Promise<void> {
  await reorderQuestions(questions)
  revalidatePath('/admin/coverage-types')
}

// ============================================
// Rule Actions
// ============================================

/**
 * Add a new rule
 */
export async function addRule(data: RuleInsert): Promise<Rule> {
  const result = await createRule(data)
  revalidatePath('/admin/coverage-types')
  return result
}

/**
 * Edit an existing rule
 */
export async function editRule(id: string, data: RuleUpdate): Promise<Rule> {
  const result = await updateRule(id, data)
  revalidatePath('/admin/coverage-types')
  return result
}

/**
 * Remove a rule
 */
export async function removeRule(id: string): Promise<void> {
  await deleteRule(id)
  revalidatePath('/admin/coverage-types')
}

/**
 * Toggle rule active status
 */
export async function toggleRule(id: string, isActive: boolean): Promise<Rule> {
  const result = await toggleRuleActive(id, isActive)
  revalidatePath('/admin/coverage-types')
  return result
}
