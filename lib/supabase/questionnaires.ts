import { createClient } from './server'
import { insertOne, updateOne, updateMany } from './helpers'
import type { Database } from '@/types/database'
import type {
  Questionnaire,
  QuestionnaireInsert,
  QuestionnaireUpdate,
  Question,
  QuestionInsert,
  QuestionUpdate,
  QuestionnaireWithQuestions,
  QuestionnaireWithCoverageType,
  QuestionnaireWithRules,
  CoverageType,
  Rule,
} from '@/types/policies'

/**
 * Get all questionnaires
 */
export async function getQuestionnaires(): Promise<Questionnaire[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching questionnaires:', error)
    throw new Error('Failed to fetch questionnaires')
  }

  return (data || []) as Questionnaire[]
}

/**
 * Get a single questionnaire by ID
 */
export async function getQuestionnaire(id: string): Promise<Questionnaire | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching questionnaire:', error)
    return null
  }

  return data as Questionnaire
}

/**
 * Get questionnaire with all its questions
 */
export async function getQuestionnaireWithQuestions(
  id: string
): Promise<QuestionnaireWithQuestions | null> {
  const supabase = await createClient()

  const { data: questionnaire, error: qError } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('id', id)
    .single()

  if (qError || !questionnaire) {
    console.error('Error fetching questionnaire:', qError)
    return null
  }

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('questionnaire_id', id)
    .order('order_index', { ascending: true })

  if (questionsError) {
    console.error('Error fetching questions:', questionsError)
    return null
  }

  return {
    ...(questionnaire as Questionnaire),
    questions: (questions || []) as Question[],
  }
}

/**
 * Create a new questionnaire
 */
export async function createQuestionnaire(
  questionnaire: QuestionnaireInsert
): Promise<Questionnaire> {
  const supabase = await createClient()

  const insertData: Database['public']['Tables']['questionnaires']['Insert'] = {
    claim_type: questionnaire.claim_type ?? null,
    coverage_type_id: questionnaire.coverage_type_id ?? null,
    name: questionnaire.name,
    description: questionnaire.description ?? null,
    version: questionnaire.version ?? 1,
    is_published: questionnaire.is_published ?? false,
    parent_version_id: questionnaire.parent_version_id ?? null,
    effective_from: questionnaire.effective_from ?? null,
    effective_until: questionnaire.effective_until ?? null,
    is_active: questionnaire.is_active ?? true,
  }

  const data = await insertOne(supabase, 'questionnaires', insertData)
  return data as Questionnaire
}

/**
 * Update an existing questionnaire
 */
export async function updateQuestionnaire(
  id: string,
  updates: QuestionnaireUpdate
): Promise<Questionnaire> {
  const supabase = await createClient()

  const updateData: Database['public']['Tables']['questionnaires']['Update'] = {}

  if (updates.claim_type !== undefined) updateData.claim_type = updates.claim_type
  if (updates.coverage_type_id !== undefined) updateData.coverage_type_id = updates.coverage_type_id
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.version !== undefined) updateData.version = updates.version
  if (updates.is_published !== undefined) updateData.is_published = updates.is_published
  if (updates.parent_version_id !== undefined) updateData.parent_version_id = updates.parent_version_id
  if (updates.effective_from !== undefined) updateData.effective_from = updates.effective_from
  if (updates.effective_until !== undefined) updateData.effective_until = updates.effective_until
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active

  const data = await updateOne(supabase, 'questionnaires', id, updateData)
  return data as Questionnaire
}

/**
 * Delete a questionnaire (will cascade delete all questions)
 */
export async function deleteQuestionnaire(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('questionnaires')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting questionnaire:', error)
    throw new Error('Failed to delete questionnaire')
  }
}

/**
 * Toggle questionnaire active status
 */
export async function toggleQuestionnaireActive(
  id: string,
  isActive: boolean
): Promise<Questionnaire> {
  return updateQuestionnaire(id, { is_active: isActive })
}

// ========== Questions Functions ==========

/**
 * Get all questions for a questionnaire
 */
export async function getQuestions(questionnaireId: string): Promise<Question[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('questionnaire_id', questionnaireId)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Error fetching questions:', error)
    throw new Error('Failed to fetch questions')
  }

  return (data || []) as Question[]
}

/**
 * Get a single question by ID
 */
export async function getQuestion(id: string): Promise<Question | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching question:', error)
    return null
  }

  return data as Question
}

/**
 * Create a new question
 */
export async function createQuestion(question: QuestionInsert): Promise<Question> {
  const supabase = await createClient()

  const insertData: Database['public']['Tables']['questions']['Insert'] = {
    questionnaire_id: question.questionnaire_id,
    question_text: question.question_text,
    field_type: question.field_type,
    is_required: question.is_required ?? false,
    options: question.options ?? null,
    order_index: question.order_index,
    placeholder: question.placeholder ?? null,
    help_text: question.help_text ?? null,
  }

  const data = await insertOne(supabase, 'questions', insertData)
  return data as Question
}

/**
 * Update an existing question
 */
export async function updateQuestion(
  id: string,
  updates: QuestionUpdate
): Promise<Question> {
  const supabase = await createClient()

  const updateData: Database['public']['Tables']['questions']['Update'] = {
    question_text: updates.question_text,
    field_type: updates.field_type,
    is_required: updates.is_required,
    options: updates.options,
    order_index: updates.order_index,
    placeholder: updates.placeholder,
    help_text: updates.help_text,
  }

  const data = await updateOne(supabase, 'questions', id, updateData)
  return data as Question
}

/**
 * Delete a question
 */
export async function deleteQuestion(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting question:', error)
    throw new Error('Failed to delete question')
  }
}

/**
 * Bulk update question order
 */
export async function reorderQuestions(questions: { id: string; order_index: number }[]): Promise<void> {
  const supabase = await createClient()

  // Transform to the format expected by updateMany
  const updates = questions.map((q) => ({
    id: q.id,
    data: {
      order_index: q.order_index,
    } as Database['public']['Tables']['questions']['Update']
  }))

  await updateMany(supabase, 'questions', updates)
}

// ========== NEW: Coverage Type Integration Functions ==========

/**
 * Get questionnaires by coverage type
 */
export async function getQuestionnairesByCoverageType(coverageTypeId: string): Promise<Questionnaire[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('coverage_type_id', coverageTypeId)
    .order('version', { ascending: false })

  if (error) {
    console.error('Error fetching questionnaires by coverage type:', error)
    throw new Error('Failed to fetch questionnaires by coverage type')
  }

  return (data || []) as Questionnaire[]
}

/**
 * Get active published questionnaire for a coverage type
 */
export async function getActiveQuestionnaireForCoverageType(
  coverageTypeId: string
): Promise<Questionnaire | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('coverage_type_id', coverageTypeId)
    .eq('is_active', true)
    .eq('is_published', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching active questionnaire:', error)
    throw new Error('Failed to fetch active questionnaire')
  }

  return data as Questionnaire
}

/**
 * Get questionnaire with coverage type details
 */
export async function getQuestionnaireWithCoverageType(
  id: string
): Promise<QuestionnaireWithCoverageType | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select(
      `
      *,
      coverage_type:coverage_types (*),
      questions:questions (*)
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching questionnaire with coverage type:', error)
    return null
  }

  return data as unknown as QuestionnaireWithCoverageType
}

/**
 * Get questionnaire with questions and rules
 */
export async function getQuestionnaireWithRules(
  id: string
): Promise<QuestionnaireWithRules | null> {
  const supabase = await createClient()

  // Get questionnaire
  const questionnaire = await getQuestionnaire(id)
  if (!questionnaire) return null

  // Get questions
  const questions = await getQuestions(id)

  // Get rules
  const { data: rules, error: rulesError } = await supabase
    .from('rules')
    .select('*')
    .eq('questionnaire_id', id)
    .order('priority', { ascending: false })

  if (rulesError) {
    console.error('Error fetching rules:', rulesError)
    return null
  }

  return {
    ...questionnaire,
    questions,
    rules: (rules || []) as Rule[],
  }
}

/**
 * Publish a questionnaire
 */
export async function publishQuestionnaire(id: string): Promise<Questionnaire> {
  return updateQuestionnaire(id, {
    is_published: true,
    effective_from: new Date().toISOString(),
  })
}

/**
 * Unpublish a questionnaire
 */
export async function unpublishQuestionnaire(id: string): Promise<Questionnaire> {
  return updateQuestionnaire(id, {
    is_published: false,
    effective_until: new Date().toISOString(),
  })
}

/**
 * Duplicate a questionnaire (create new version)
 */
export async function duplicateQuestionnaire(id: string): Promise<Questionnaire> {
  const original = await getQuestionnaireWithQuestions(id)

  if (!original) {
    throw new Error('Questionnaire not found')
  }

  const supabase = await createClient()

  // Create new questionnaire version
  const newQuestionnaire: QuestionnaireInsert = {
    claim_type: original.claim_type,
    coverage_type_id: original.coverage_type_id,
    name: original.name,
    description: original.description,
    version: original.version + 1,
    is_published: false,
    parent_version_id: original.id,
    is_active: false, // Duplicates are inactive by default
  }

  const createdQuestionnaire = await createQuestionnaire(newQuestionnaire)

  // Duplicate all questions
  if (original.questions.length > 0) {
    const newQuestions = original.questions.map((q) => ({
      questionnaire_id: createdQuestionnaire.id,
      question_text: q.question_text,
      field_type: q.field_type,
      is_required: q.is_required,
      options: q.options,
      order_index: q.order_index,
      placeholder: q.placeholder,
      help_text: q.help_text,
    }))

    await Promise.all(newQuestions.map((q) => createQuestion(q)))
  }

  return createdQuestionnaire
}

/**
 * Get all published questionnaires
 */
export async function getPublishedQuestionnaires(): Promise<Questionnaire[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('is_published', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching published questionnaires:', error)
    throw new Error('Failed to fetch published questionnaires')
  }

  return (data || []) as Questionnaire[]
}

/**
 * Get questionnaire version history
 */
export async function getQuestionnaireVersionHistory(
  coverageTypeId: string
): Promise<Questionnaire[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('coverage_type_id', coverageTypeId)
    .order('version', { ascending: false })

  if (error) {
    console.error('Error fetching questionnaire version history:', error)
    throw new Error('Failed to fetch questionnaire version history')
  }

  return (data || []) as Questionnaire[]
}
