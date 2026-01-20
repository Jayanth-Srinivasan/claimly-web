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
  // Use maybeSingle() to avoid errors if multiple exist (shouldn't happen, but safer)
  const { data: existingAnswers, error: fetchError } = await supabase
    .from('claim_answers')
    .select('*')
    .eq('claim_id', data.claim_id)
    .eq('question_id', data.question_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch answer: ${fetchError.message}`)
  }

  if (existingAnswers) {
    // Update existing answer - use direct update instead of updateOne to avoid JSON coercion issues
    const updates: any = {
      answer_text: data.answer_text,
      answer_number: data.answer_number,
      answer_date: data.answer_date,
      answer_select: data.answer_select,
      answer_file_ids: data.answer_file_ids,
      updated_at: new Date().toISOString(),
    }
    
    // Only include rule_evaluation_results if it's provided and valid
    if (data.rule_evaluation_results !== undefined && data.rule_evaluation_results !== null) {
      // Ensure it's a valid JSON-serializable object
      try {
        updates.rule_evaluation_results = typeof data.rule_evaluation_results === 'string' 
          ? JSON.parse(data.rule_evaluation_results)
          : data.rule_evaluation_results
      } catch (e) {
        console.warn(`[saveAnswer] Invalid rule_evaluation_results JSON, skipping:`, e)
        // Don't update rule_evaluation_results if it's invalid
      }
    }
    
    const { data: updated, error: updateError } = await supabase
      .from('claim_answers')
      .update(updates)
      .eq('id', existingAnswers.id)
      .select()
      .single()
    
    if (updateError) {
      throw new Error(`Failed to update answer: ${updateError.message}`)
    }
    
    if (!updated) {
      throw new Error(`Update returned no data`)
    }
    
    return updated as ClaimAnswer
  } else {
    // Create new answer
    const insertData: any = {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // Ensure rule_evaluation_results is properly formatted
    if (insertData.rule_evaluation_results !== undefined && insertData.rule_evaluation_results !== null) {
      if (typeof insertData.rule_evaluation_results === 'string') {
        try {
          insertData.rule_evaluation_results = JSON.parse(insertData.rule_evaluation_results)
        } catch (e) {
          console.warn(`[saveAnswer] Invalid rule_evaluation_results JSON for insert, setting to null:`, e)
          insertData.rule_evaluation_results = null
        }
      }
    }
    
    return insertOne(supabase, 'claim_answers', insertData)
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
