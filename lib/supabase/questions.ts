import { createClient } from './server'
import { insertOne, updateOne, updateMany } from './helpers'
import type { Question, QuestionInsert, QuestionUpdate } from '@/types/policies'

/**
 * Get all questions for a specific coverage type
 * @param coverageTypeId - The coverage type ID
 * @returns Array of questions ordered by order_index
 */
export async function getQuestionsByCoverageType(
  coverageTypeId: string
): Promise<Question[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('coverage_type_id', coverageTypeId)
    .order('order_index', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch questions for coverage type ${coverageTypeId}: ${error.message}`)
  }

  return (data || []) as Question[]
}

/**
 * Get a single question by ID
 * @param id - The question ID
 * @returns Question or null if not found
 */
export async function getQuestion(id: string): Promise<Question | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Failed to fetch question ${id}:`, error)
    return null
  }

  return data as Question
}

/**
 * Create a new question
 * @param question - Question data to insert
 * @returns The created question
 */
export async function createQuestion(question: QuestionInsert): Promise<Question> {
  const supabase = await createClient()
  const data = await insertOne(supabase, 'questions', {
    coverage_type_id: question.coverage_type_id,
    question_text: question.question_text,
    field_type: question.field_type,
    is_required: question.is_required ?? false,
    options: question.options ?? null,
    order_index: question.order_index,
    placeholder: question.placeholder ?? null,
    help_text: question.help_text ?? null,
  })

  return data as Question
}

/**
 * Update an existing question
 * @param id - The question ID to update
 * @param updates - Partial question data to update
 * @returns The updated question
 */
export async function updateQuestion(
  id: string,
  updates: QuestionUpdate
): Promise<Question> {
  const supabase = await createClient()
  const data = await updateOne(supabase, 'questions', id, updates)
  return data as Question
}

/**
 * Delete a question
 * @param id - The question ID to delete
 */
export async function deleteQuestion(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete question ${id}: ${error.message}`)
  }
}

/**
 * Reorder questions by updating their order_index
 * @param questions - Array of question IDs with their new order_index values
 */
export async function reorderQuestions(
  questions: { id: string; order_index: number }[]
): Promise<void> {
  const supabase = await createClient()
  const updates = questions.map(q => ({
    id: q.id,
    data: { order_index: q.order_index }
  }))

  await updateMany(supabase, 'questions', updates)
}

/**
 * Get all questions across all coverage types
 * @returns Array of all questions ordered by coverage_type_id and order_index
 */
export async function getAllQuestions(): Promise<Question[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('coverage_type_id', { ascending: true })
    .order('order_index', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch all questions: ${error.message}`)
  }

  return (data || []) as Question[]
}
