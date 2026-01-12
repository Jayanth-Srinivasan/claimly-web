import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Database } from '@/types/database'

export type ClaimIntakeState = Database['public']['Tables']['claim_intake_state']['Row']
export type ClaimIntakeStateInsert = Database['public']['Tables']['claim_intake_state']['Insert']
export type ClaimIntakeStateUpdate = Database['public']['Tables']['claim_intake_state']['Update']

/**
 * Get intake state by session ID
 */
export async function getIntakeStateBySession(
  sessionId: string
): Promise<ClaimIntakeState | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_intake_state')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch intake state: ${error.message}`)
  }

  return data as ClaimIntakeState
}

/**
 * Create or update intake state
 */
export async function upsertIntakeState(
  data: ClaimIntakeStateInsert
): Promise<ClaimIntakeState> {
  const supabase = await createClient()

  // Check if exists
  const existing = await getIntakeStateBySession(data.session_id)

  if (existing) {
    // Update existing
    return updateIntakeState(existing.id, {
      ...data,
      updated_at: new Date().toISOString(),
    })
  } else {
    // Create new
    return insertOne(supabase, 'claim_intake_state', {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
}

/**
 * Update intake state
 */
export async function updateIntakeState(
  id: string,
  updates: ClaimIntakeStateUpdate
): Promise<ClaimIntakeState> {
  const supabase = await createClient()
  return updateOne(supabase, 'claim_intake_state', id, {
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Update the current stage
 */
export async function updateStage(
  sessionId: string,
  stage: string
): Promise<ClaimIntakeState> {
  const state = await getIntakeStateBySession(sessionId)
  if (!state) {
    throw new Error('Intake state not found for session')
  }

  return updateIntakeState(state.id, {
    current_stage: stage,
  })
}

/**
 * Add a question to the asked questions list
 */
export async function addAskedQuestion(
  sessionId: string,
  questionId: string
): Promise<ClaimIntakeState> {
  const state = await getIntakeStateBySession(sessionId)
  if (!state) {
    throw new Error('Intake state not found for session')
  }

  const askedQuestions = state.database_questions_asked || []
  if (!askedQuestions.includes(questionId)) {
    return updateIntakeState(state.id, {
      database_questions_asked: [...askedQuestions, questionId],
    })
  }

  return state
}

/**
 * Add uploaded document ID
 */
export async function addUploadedDocument(
  sessionId: string,
  documentId: string
): Promise<ClaimIntakeState> {
  const state = await getIntakeStateBySession(sessionId)
  if (!state) {
    throw new Error('Intake state not found for session')
  }

  const uploadedDocs = state.uploaded_document_ids || []
  if (!uploadedDocs.includes(documentId)) {
    return updateIntakeState(state.id, {
      uploaded_document_ids: [...uploadedDocs, documentId],
    })
  }

  return state
}

/**
 * Mark intake as completed
 */
export async function completeIntake(
  sessionId: string,
  claimId: string
): Promise<ClaimIntakeState> {
  const state = await getIntakeStateBySession(sessionId)
  if (!state) {
    throw new Error('Intake state not found for session')
  }

  return updateIntakeState(state.id, {
    claim_id: claimId,
    current_stage: 'claim_creation',
    completed_at: new Date().toISOString(),
  })
}
