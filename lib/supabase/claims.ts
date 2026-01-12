import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Database } from '@/types/database'

export type Claim = Database['public']['Tables']['claims']['Row']
export type ClaimInsert = Database['public']['Tables']['claims']['Insert']
export type ClaimUpdate = Database['public']['Tables']['claims']['Update']

/**
 * Create a new claim
 */
export async function createClaim(data: ClaimInsert): Promise<Claim> {
  const supabase = await createClient()
  return insertOne(supabase, 'claims', data)
}

/**
 * Get a claim by ID
 */
export async function getClaim(id: string): Promise<Claim | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch claim: ${error.message}`)
  }

  return data as Claim
}

/**
 * Get all claims for a user
 */
export async function getUserClaims(userId: string): Promise<Claim[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch user claims: ${error.message}`)
  }

  return (data || []) as Claim[]
}

/**
 * Update a claim
 */
export async function updateClaim(id: string, updates: ClaimUpdate): Promise<Claim> {
  const supabase = await createClient()
  return updateOne(supabase, 'claims', id, updates)
}

/**
 * Update claim status
 */
export async function updateClaimStatus(
  id: string,
  status: string,
  approvedAmount?: number
): Promise<Claim> {
  const updates: ClaimUpdate = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'approved' && approvedAmount !== undefined) {
    updates.approved_amount = approvedAmount
    updates.reviewed_at = new Date().toISOString()
  } else if (status === 'rejected' || status === 'under-review') {
    updates.reviewed_at = new Date().toISOString()
  }

  return updateClaim(id, updates)
}

/**
 * Get claim by claim number
 */
export async function getClaimByNumber(claimNumber: string): Promise<Claim | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('claim_number', claimNumber)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch claim by number: ${error.message}`)
  }

  return data as Claim
}

/**
 * Get claim by chat session ID
 */
export async function getClaimBySessionId(sessionId: string): Promise<Claim | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('chat_session_id', sessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch claim by session: ${error.message}`)
  }

  return data as Claim
}

/**
 * Get all claims with a specific status
 */
export async function getClaimsByStatus(status: string): Promise<Claim[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch claims by status: ${error.message}`)
  }

  return (data || []) as Claim[]
}

/**
 * Assign claim to admin
 */
export async function assignClaimToAdmin(
  claimId: string,
  adminId: string
): Promise<Claim> {
  return updateClaim(claimId, {
    assigned_admin_id: adminId,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Generate a unique claim number
 */
export async function generateClaimNumber(): Promise<string> {
  const supabase = await createClient()
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const claimNumber = `CLM-${timestamp}-${random}`

  // Check if it already exists (very unlikely but check anyway)
  const existing = await getClaimByNumber(claimNumber)
  if (existing) {
    // Retry with new random
    return generateClaimNumber()
  }

  return claimNumber
}
