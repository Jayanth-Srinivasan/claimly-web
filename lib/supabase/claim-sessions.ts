import { createClient } from './server'
import { createClaim, generateClaimNumber } from './claims'
import type { Json } from '@/types/database'

/**
 * Claim Session Types
 */
export type ClaimSessionStage = 'gathering_info' | 'reviewing_summary' | 'submitted'

export interface ClaimSessionAnswer {
  value: string | number | string[]
  type: 'text' | 'date' | 'number' | 'select' | 'file'
  label: string
}

export interface ClaimSession {
  id: string
  chat_session_id: string
  user_id: string
  policy_id: string | null
  stage: string
  incident_type: string | null
  incident_description: string | null
  incident_date: string | null
  incident_location: string | null
  coverage_type_ids: string[] | null
  answers: Json | null
  questions_asked: string[] | null
  claim_id: string | null
  claim_number: string | null
  created_at: string | null
  updated_at: string | null
  submitted_at: string | null
}

export interface ClaimSessionInsert {
  chat_session_id: string
  user_id: string
  policy_id?: string | null
  stage?: string
  incident_type?: string | null
  incident_description?: string | null
  incident_date?: string | null
  incident_location?: string | null
  coverage_type_ids?: string[] | null
  answers?: Json | null
  questions_asked?: string[] | null
}

export interface ClaimSessionUpdate {
  policy_id?: string | null
  stage?: string
  incident_type?: string | null
  incident_description?: string | null
  incident_date?: string | null
  incident_location?: string | null
  coverage_type_ids?: string[] | null
  answers?: Json | null
  questions_asked?: string[] | null
  claim_id?: string | null
  claim_number?: string | null
  submitted_at?: string | null
}

/**
 * Get or create a claim session for a chat session
 */
export async function getOrCreateSession(
  chatSessionId: string,
  userId: string
): Promise<ClaimSession> {
  const supabase = await createClient()

  // Try to get existing session
  const { data: existing, error: fetchError } = await supabase
    .from('claim_sessions')
    .select('*')
    .eq('chat_session_id', chatSessionId)
    .single()

  if (existing && !fetchError) {
    return existing as ClaimSession
  }

  // Create new session
  const { data: newSession, error: insertError } = await supabase
    .from('claim_sessions')
    .insert({
      chat_session_id: chatSessionId,
      user_id: userId,
      stage: 'gathering_info',
      answers: {},
      questions_asked: [],
      coverage_type_ids: [],
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to create claim session: ${insertError.message}`)
  }

  return newSession as ClaimSession
}

/**
 * Get a claim session by ID
 */
export async function getSession(id: string): Promise<ClaimSession | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch claim session: ${error.message}`)
  }

  return data as ClaimSession
}

/**
 * Get a claim session by chat session ID
 */
export async function getSessionByChatId(
  chatSessionId: string
): Promise<ClaimSession | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_sessions')
    .select('*')
    .eq('chat_session_id', chatSessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch claim session: ${error.message}`)
  }

  return data as ClaimSession
}

/**
 * Update a claim session
 */
export async function updateSession(
  id: string,
  updates: ClaimSessionUpdate
): Promise<ClaimSession> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('claim_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update claim session: ${error.message}`)
  }

  return data as ClaimSession
}

/**
 * Update session by chat session ID
 */
export async function updateSessionByChatId(
  chatSessionId: string,
  updates: ClaimSessionUpdate
): Promise<ClaimSession> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('claim_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('chat_session_id', chatSessionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update claim session: ${error.message}`)
  }

  return data as ClaimSession
}

/**
 * Add an answer to the session
 */
export async function addAnswer(
  sessionId: string,
  key: string,
  answer: ClaimSessionAnswer
): Promise<ClaimSession> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Claim session not found')
  }

  const currentAnswers = (session.answers as unknown as Record<string, ClaimSessionAnswer>) || {}
  const updatedAnswers = {
    ...currentAnswers,
    [key]: answer,
  }

  return updateSession(sessionId, { answers: updatedAnswers as unknown as Json })
}

/**
 * Mark a question as asked
 */
export async function markQuestionAsked(
  sessionId: string,
  questionId: string
): Promise<ClaimSession> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Claim session not found')
  }

  const currentQuestions = session.questions_asked || []
  if (currentQuestions.includes(questionId)) {
    return session
  }

  const updatedQuestions = [...currentQuestions, questionId]
  return updateSession(sessionId, { questions_asked: updatedQuestions })
}

/**
 * Submit the claim - creates final claim record
 */
export async function submitClaim(sessionId: string): Promise<{
  claimId: string
  claimNumber: string
}> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Claim session not found')
  }

  if (session.stage === 'submitted') {
    throw new Error('Claim has already been submitted')
  }

  // Generate claim number
  const claimNumber = await generateClaimNumber()

  // Determine total claimed amount from answers
  let totalClaimedAmount = 0
  const answers = (session.answers as unknown as Record<string, ClaimSessionAnswer>) || {}
  for (const [key, answer] of Object.entries(answers)) {
    if (key.toLowerCase().includes('amount') && typeof answer.value === 'number') {
      totalClaimedAmount += answer.value
    }
  }

  // Create the final claim
  const claim = await createClaim({
    user_id: session.user_id,
    claim_number: claimNumber,
    chat_session_id: session.chat_session_id,
    policy_id: session.policy_id,
    coverage_type_ids: session.coverage_type_ids || [],
    incident_type: session.incident_type || 'general',
    incident_description: session.incident_description || '',
    incident_date: session.incident_date || new Date().toISOString(),
    incident_location: session.incident_location || 'Not specified',
    total_claimed_amount: totalClaimedAmount,
    currency: 'USD',
    status: 'pending',
  })

  // Update session with final claim details
  await updateSession(sessionId, {
    stage: 'submitted',
    claim_id: claim.id,
    claim_number: claimNumber,
    submitted_at: new Date().toISOString(),
  })

  // Move documents from session to claim
  const supabase = await createClient()
  await supabase
    .from('claim_documents')
    .update({ claim_id: claim.id })
    .eq('claim_session_id', sessionId)

  return {
    claimId: claim.id,
    claimNumber: claimNumber,
  }
}

/**
 * Get claim session with summary data for review
 */
export async function getSessionSummary(sessionId: string): Promise<{
  session: ClaimSession
  documentsCount: number
  formattedSummary: string
}> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Claim session not found')
  }

  const supabase = await createClient()

  // Count documents
  const { count } = await supabase
    .from('claim_documents')
    .select('*', { count: 'exact', head: true })
    .eq('claim_session_id', sessionId)

  // Format summary
  const lines: string[] = [
    '## Claim Summary',
    '',
    `**Incident Type:** ${session.incident_type || 'Not specified'}`,
    `**Date:** ${session.incident_date || 'Not specified'}`,
    `**Location:** ${session.incident_location || 'Not specified'}`,
    '',
    '**Description:**',
    session.incident_description || 'No description provided',
    '',
    '**Collected Information:**',
  ]

  const answers = (session.answers as unknown as Record<string, ClaimSessionAnswer>) || {}
  for (const [key, answer] of Object.entries(answers)) {
    const formattedValue = Array.isArray(answer.value)
      ? answer.value.join(', ')
      : String(answer.value)
    lines.push(`- ${answer.label}: ${formattedValue}`)
  }

  lines.push('')
  lines.push(`**Documents Uploaded:** ${count || 0}`)

  return {
    session,
    documentsCount: count || 0,
    formattedSummary: lines.join('\n'),
  }
}
