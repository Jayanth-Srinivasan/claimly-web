import { createClient } from './server'
import { insertOne } from './helpers'
import type { Database } from '@/types/database'

export type ClaimNote = Database['public']['Tables']['claim_notes']['Row']
export type ClaimNoteInsert = Database['public']['Tables']['claim_notes']['Insert']

/**
 * Add an admin note to a claim
 */
export async function addNote(data: ClaimNoteInsert): Promise<ClaimNote> {
  const supabase = await createClient()
  return insertOne(supabase, 'claim_notes', {
    ...data,
    created_at: data.created_at || new Date().toISOString(),
  })
}

/**
 * Get all notes for a claim
 */
export async function getClaimNotes(claimId: string): Promise<ClaimNote[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_notes')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch claim notes: ${error.message}`)
  }

  return (data || []) as ClaimNote[]
}

/**
 * Get notes by admin
 */
export async function getNotesByAdmin(adminId: string): Promise<ClaimNote[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_notes')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch admin notes: ${error.message}`)
  }

  return (data || []) as ClaimNote[]
}
