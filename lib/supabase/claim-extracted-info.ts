import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Database } from '@/types/database'

export type ClaimExtractedInfo = Database['public']['Tables']['claim_extracted_information']['Row']
export type ClaimExtractedInfoInsert = Database['public']['Tables']['claim_extracted_information']['Insert']
export type ClaimExtractedInfoUpdate = Database['public']['Tables']['claim_extracted_information']['Update']

/**
 * Save extracted information
 */
export async function saveExtractedInfo(
  data: ClaimExtractedInfoInsert
): Promise<ClaimExtractedInfo> {
  const supabase = await createClient()

  // Check if field already exists for this claim
  const existing = await getExtractedInfoByField(data.claim_id, data.field_name)

  if (existing) {
    // Update existing
    return updateExtractedInfo(existing.id, {
      field_value: data.field_value,
      confidence: data.confidence,
      source: data.source,
      updated_at: new Date().toISOString(),
    })
  } else {
    // Create new
    return insertOne(supabase, 'claim_extracted_information', {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
}

/**
 * Get extracted information by field name
 */
export async function getExtractedInfoByField(
  claimId: string,
  fieldName: string
): Promise<ClaimExtractedInfo | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_extracted_information')
    .select('*')
    .eq('claim_id', claimId)
    .eq('field_name', fieldName)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch extracted info: ${error.message}`)
  }

  return data as ClaimExtractedInfo
}

/**
 * Get all extracted information for a claim
 */
export async function getExtractedInfo(
  claimId: string
): Promise<ClaimExtractedInfo[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_extracted_information')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch extracted info: ${error.message}`)
  }

  return (data || []) as ClaimExtractedInfo[]
}

/**
 * Update extracted information
 */
export async function updateExtractedInfo(
  id: string,
  updates: ClaimExtractedInfoUpdate
): Promise<ClaimExtractedInfo> {
  const supabase = await createClient()
  return updateOne(supabase, 'claim_extracted_information', id, {
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Delete extracted information
 */
export async function deleteExtractedInfo(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('claim_extracted_information')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete extracted info: ${error.message}`)
  }
}
