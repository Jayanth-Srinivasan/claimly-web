import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Database } from '@/types/database'

export type ClaimAnswer = Database['public']['Tables']['claim_answers']['Row']
export type ClaimAnswerInsert = Database['public']['Tables']['claim_answers']['Insert']
export type ClaimAnswerUpdate = Database['public']['Tables']['claim_answers']['Update']

/**
 * Save an answer to a question
 */
export async function saveAnswer(data: ClaimAnswerInsert): Promise<ClaimAnswer> {
  const supabase = await createClient()

  // Check if answer already exists for this claim and question
  const existing = await getAnswer(data.claim_id, data.question_id)

  if (existing) {
    // Update existing answer
    return updateAnswer(existing.id, {
      answer_text: data.answer_text,
      answer_number: data.answer_number,
      answer_date: data.answer_date,
      answer_select: data.answer_select,
      answer_file_ids: data.answer_file_ids,
      rule_evaluation_results: data.rule_evaluation_results,
      updated_at: new Date().toISOString(),
    })
  } else {
    // Create new answer
    return insertOne(supabase, 'claim_answers', {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
}

/**
 * Get an answer for a specific claim and question
 */
export async function getAnswer(
  claimId: string,
  questionId: string
): Promise<ClaimAnswer | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_answers')
    .select('*')
    .eq('claim_id', claimId)
    .eq('question_id', questionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch answer: ${error.message}`)
  }

  return data as ClaimAnswer
}

/**
 * Get all answers for a claim
 */
export async function getClaimAnswers(claimId: string): Promise<ClaimAnswer[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_answers')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch claim answers: ${error.message}`)
  }

  return (data || []) as ClaimAnswer[]
}

/**
 * Update an answer
 */
export async function updateAnswer(
  id: string,
  updates: ClaimAnswerUpdate
): Promise<ClaimAnswer> {
  const supabase = await createClient()
  return updateOne(supabase, 'claim_answers', id, {
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Delete an answer
 */
export async function deleteAnswer(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('claim_answers').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete answer: ${error.message}`)
  }
}
