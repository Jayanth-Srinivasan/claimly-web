'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Fetch all claims with related data (user profile, chat session)
 * Admin-only action
 */
export async function getAllClaimsAction() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single<{ is_admin: boolean }>()

    if (!profile || !profile.is_admin) {
      return { success: false, error: 'Unauthorized - Admin access required' }
    }

    // Fetch all claims with user and session details
    const { data: claims, error } = await supabase
      .from('claims')
      .select(`
        *,
        profiles!claims_user_id_fkey(full_name, custom_id, email),
        chat_sessions!claims_chat_session_id_fkey(title, created_at)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching claims:', error)
      throw error
    }

    return { success: true, claims: claims || [] }
  } catch (error) {
    console.error('Error in getAllClaimsAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch claims'
    }
  }
}

/**
 * Fetch a single claim by ID with all related data
 * Admin-only action
 */
export async function getClaimByIdAction(claimId: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single<{ is_admin: boolean }>()

    if (!profile || !profile.is_admin) {
      return { success: false, error: 'Unauthorized - Admin access required' }
    }

    // Fetch claim with all related data
    const { data: claim, error } = await supabase
      .from('claims')
      .select(`
        *,
        profiles!claims_user_id_fkey(full_name, custom_id, email, phone_number),
        chat_sessions!claims_chat_session_id_fkey(id, title),
        claim_documents(*),
        claim_answers(
          *,
          questions(question_text, field_type)
        ),
        rule_executions(
          *,
          rules(name, description)
        ),
        claim_notes(
          *,
          profiles!claim_notes_admin_id_fkey(full_name)
        )
      `)
      .eq('id', claimId)
      .single()

    if (error) {
      console.error('Error fetching claim:', error)
      throw error
    }

    return { success: true, claim }
  } catch (error) {
    console.error('Error in getClaimByIdAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch claim'
    }
  }
}

/**
 * Update claim status
 * Admin-only action
 */
export async function updateClaimStatusAction(
  claimId: string,
  status: 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid'
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single<{ is_admin: boolean }>()

    if (!profile || !profile.is_admin) {
      return { success: false, error: 'Unauthorized - Admin access required' }
    }

    // Update claim status
    const updateData: any = { status }

    if (status === 'under_review') {
      updateData.reviewed_at = new Date().toISOString()
    }

    if (['approved', 'rejected', 'paid'].includes(status)) {
      updateData.resolved_at = new Date().toISOString()
    }

    const { data: updatedClaim, error } = await supabase
      .from('claims')
      .update(updateData)
      .eq('id', claimId)
      .select()
      .single()

    if (error) {
      console.error('Error updating claim status:', error)
      throw error
    }

    revalidatePath('/admin/claims')
    revalidatePath(`/admin/claims/${claimId}`)

    return { success: true, claim: updatedClaim }
  } catch (error) {
    console.error('Error in updateClaimStatusAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update claim status'
    }
  }
}

/**
 * Assign claim to admin
 * Admin-only action
 */
export async function assignClaimToAdminAction(
  claimId: string,
  adminId: string
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single<{ is_admin: boolean }>()

    if (!profile || !profile.is_admin) {
      return { success: false, error: 'Unauthorized - Admin access required' }
    }

    // Update claim assigned admin
    const { data: updatedClaim, error } = await supabase
      .from('claims')
      .update({ assigned_admin_id: adminId })
      .eq('id', claimId)
      .select()
      .single()

    if (error) {
      console.error('Error assigning claim:', error)
      throw error
    }

    revalidatePath('/admin/claims')
    revalidatePath(`/admin/claims/${claimId}`)

    return { success: true, claim: updatedClaim }
  } catch (error) {
    console.error('Error in assignClaimToAdminAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign claim'
    }
  }
}

/**
 * Add note to claim
 * Admin-only action
 */
export async function addClaimNoteAction(
  claimId: string,
  noteType: 'internal' | 'customer_visible' | 'system',
  content: string
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single<{ is_admin: boolean }>()

    if (!profile || !profile.is_admin) {
      return { success: false, error: 'Unauthorized - Admin access required' }
    }

    // Insert claim note
    const { data: note, error } = await supabase
      .from('claim_notes')
      .insert({
        claim_id: claimId,
        admin_id: user.id,
        note_type: noteType,
        content
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding claim note:', error)
      throw error
    }

    revalidatePath(`/admin/claims/${claimId}`)

    return { success: true, note }
  } catch (error) {
    console.error('Error in addClaimNoteAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add note'
    }
  }
}

/**
 * Get claim statistics for dashboard
 * Admin-only action
 */
export async function getClaimStatsAction() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single<{ is_admin: boolean }>()

    if (!profile || !profile.is_admin) {
      return { success: false, error: 'Unauthorized - Admin access required' }
    }

    // Get total claims count
    const { count: totalCount, error: totalError } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Get pending claims count
    const { count: pendingCount, error: pendingError } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (pendingError) throw pendingError

    // Get approved claims count
    const { count: approvedCount, error: approvedError } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    if (approvedError) throw approvedError

    // Get rejected claims count
    const { count: rejectedCount, error: rejectedError } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')

    if (rejectedError) throw rejectedError

    return {
      success: true,
      stats: {
        total: totalCount || 0,
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0
      }
    }
  } catch (error) {
    console.error('Error in getClaimStatsAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch claim statistics'
    }
  }
}

/**
 * Send admin message to claimant or AI assistant
 * Admin-only action
 */
export async function sendAdminClaimMessageAction(
  sessionId: string,
  content: string,
  isAIQuery: boolean
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single<{ is_admin: boolean }>()

    if (!profile || !profile.is_admin) {
      return { success: false, error: 'Unauthorized - Admin access required' }
    }

    // Insert admin message
    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content,
        admin_only: isAIQuery
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending admin message:', error)
      throw error
    }

    revalidatePath(`/admin/claims`)

    // If it's an AI query, call the AI API (placeholder for now)
    if (isAIQuery) {
      // TODO: Call AI API to get response
      // For now, return success without AI response
      return { success: true, message, aiResponse: undefined }
    }

    return { success: true, message }
  } catch (error) {
    console.error('Error in sendAdminClaimMessageAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message'
    }
  }
}

/**
 * Get claim chat messages for admin
 * Returns all messages including admin_only ones
 * Admin-only action
 */
export async function getClaimChatMessagesAction(sessionId: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single<{ is_admin: boolean }>()

    if (!profile || !profile.is_admin) {
      return { success: false, error: 'Unauthorized - Admin access required' }
    }

    // Fetch all messages (including admin_only)
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching claim chat messages:', error)
      throw error
    }

    return { success: true, messages: messages || [] }
  } catch (error) {
    console.error('Error in getClaimChatMessagesAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch messages'
    }
  }
}
