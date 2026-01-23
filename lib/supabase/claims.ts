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
 * Get all claims with user profile information (for admin dashboard)
 */
export async function getAllClaims(): Promise<Array<Claim & { profile: { email: string | null; full_name: string | null } | null }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      profile:profiles!claims_user_id_fkey (
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch all claims: ${error.message}`)
  }

  return (data || []) as Array<Claim & { profile: { email: string | null; full_name: string | null } | null }>
}

/**
 * Get a claim with all related data (profile, documents, messages)
 */
export async function getClaimWithDetails(id: string): Promise<{
  claim: Claim & { profile: { email: string | null; full_name: string | null } | null }
  documents: Array<{
    id: string
    name: string
    type: string
    url: string
    uploadedAt: Date
  }>
    messages: Array<{
      id: string
      role: 'customer' | 'admin' | 'ai'
      content: string
      timestamp: Date
      admin_only: boolean | null
    }>
} | null> {
  const supabase = await createClient()
  
  // Fetch claim with profile
  const { data: claimData, error: claimError } = await supabase
    .from('claims')
    .select(`
      *,
      profile:profiles!claims_user_id_fkey (
        email,
        full_name
      )
    `)
    .eq('id', id)
    .single()

  if (claimError) {
    if (claimError.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch claim: ${claimError.message}`)
  }

  const claim = claimData as Claim & { profile: { email: string | null; full_name: string | null } | null }

  // Fetch documents
  const { getClaimDocuments } = await import('./claim-documents')
  const dbDocuments = await getClaimDocuments(id)
  
  // Get storage URL for documents
  const documents = await Promise.all(
    dbDocuments.map(async (doc) => {
      let url = doc.file_path
      try {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('claim-documents')
          .createSignedUrl(doc.file_path, 3600) // 1 hour expiry
        
        if (!urlError && urlData?.signedUrl) {
          url = urlData.signedUrl
        }
      } catch (error) {
        console.error('Failed to create signed URL for document:', doc.id, error)
        // Fall back to file_path
      }
      
      return {
        id: doc.id,
        name: doc.file_name,
        type: doc.mime_type || doc.file_type || 'application/octet-stream',
        url,
        uploadedAt: doc.uploaded_at ? new Date(doc.uploaded_at) : new Date(),
      }
    })
  )

  // Fetch messages from chat session if exists
  const { getSessionMessages } = await import('./chat-messages')
  const messages: Array<{
    id: string
    role: 'customer' | 'admin' | 'ai'
    content: string
    timestamp: Date
    admin_only: boolean | null
  }> = []

  if (claim.chat_session_id) {
    try {
      const dbMessages = await getSessionMessages(claim.chat_session_id)
      messages.push(...dbMessages.map((msg) => ({
        id: msg.id,
        role: msg.role === 'user' ? 'customer' as const : msg.role === 'admin' ? 'admin' as const : 'ai' as const,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        admin_only: msg.admin_only ?? null,
      })))
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  return {
    claim,
    documents,
    messages,
  }
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
  // Get current claim to check if it's already approved
  const currentClaim = await getClaim(id)
  if (!currentClaim) {
    throw new Error('Claim not found')
  }

  const isAlreadyApproved = currentClaim.status === 'approved'
  const isChangingToApproved = status === 'approved' && !isAlreadyApproved

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

  // Update the claim first
  const updatedClaim = await updateClaim(id, updates)

  // If status is changing TO 'approved' and we have an approved amount, deduct from coverage
  if (isChangingToApproved && approvedAmount !== undefined && approvedAmount > 0) {
    try {
      const { deductClaimFromCoverage } = await import('@/lib/supabase/user-policies')
      await deductClaimFromCoverage(
        currentClaim.user_id,
        currentClaim.policy_id,
        currentClaim.coverage_type_ids || [],
        approvedAmount
      )
    } catch (error) {
      // Log error but don't fail the claim update
      // The claim is already updated, so we just log the deduction failure
      console.error(
        `[updateClaimStatus] Failed to deduct claim amount from coverage for claim ${id}:`,
        error
      )
      // Optionally, you could add a flag to the claim indicating deduction failed
      // For now, we'll just log it
    }
  }

  return updatedClaim
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
