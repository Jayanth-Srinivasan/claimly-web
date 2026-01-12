import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Database } from '@/types/database'

export type ClaimQuestioningState = Database['public']['Tables']['claim_questioning_state']['Row']
export type ClaimQuestioningStateInsert = Database['public']['Tables']['claim_questioning_state']['Insert']
export type ClaimQuestioningStateUpdate = Database['public']['Tables']['claim_questioning_state']['Update']

/**
 * Get questioning state for a claim
 */
export async function getQuestioningState(
  claimId: string
): Promise<ClaimQuestioningState | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_questioning_state')
    .select('*')
    .eq('claim_id', claimId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch questioning state: ${error.message}`)
  }

  return data as ClaimQuestioningState
}

/**
 * Create or update questioning state
 */
export async function upsertQuestioningState(
  data: ClaimQuestioningStateInsert
): Promise<ClaimQuestioningState> {
  const supabase = await createClient()

  // Check if exists
  const existing = await getQuestioningState(data.claim_id)

  if (existing) {
    // Update existing
    return updateQuestioningState(existing.id, {
      ...data,
      updated_at: new Date().toISOString(),
    })
  } else {
    // Create new
    return insertOne(supabase, 'claim_questioning_state', {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
}

/**
 * Update questioning state
 */
export async function updateQuestioningState(
  id: string,
  updates: ClaimQuestioningStateUpdate
): Promise<ClaimQuestioningState> {
  const supabase = await createClient()
  return updateOne(supabase, 'claim_questioning_state', id, {
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Add a question to the asked questions list
 */
export async function addAskedQuestion(
  claimId: string,
  questionId: string
): Promise<ClaimQuestioningState> {
  const state = await getQuestioningState(claimId)
  if (!state) {
    // Create new state
    return upsertQuestioningState({
      claim_id: claimId,
      database_questions_asked: [questionId],
    })
  }

  const askedQuestions = (state.database_questions_asked as string[]) || []
  if (!askedQuestions.includes(questionId)) {
    return updateQuestioningState(state.id, {
      database_questions_asked: [...askedQuestions, questionId],
    })
  }

  return state
}

/**
 * Update conversation history
 */
export async function updateConversationHistory(
  claimId: string,
  conversationHistory: unknown
): Promise<ClaimQuestioningState> {
  const state = await getQuestioningState(claimId)
  if (!state) {
    return upsertQuestioningState({
      claim_id: claimId,
      conversation_history: conversationHistory,
    })
  }

  return updateQuestioningState(state.id, {
    conversation_history: conversationHistory,
  })
}

/**
 * Update current focus
 */
export async function updateCurrentFocus(
  claimId: string,
  focus: string
): Promise<ClaimQuestioningState> {
  const state = await getQuestioningState(claimId)
  if (!state) {
    return upsertQuestioningState({
      claim_id: claimId,
      current_focus: focus,
    })
  }

  return updateQuestioningState(state.id, {
    current_focus: focus,
  })
}
