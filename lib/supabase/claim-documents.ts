import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Database } from '@/types/database'

export type ClaimDocument = Database['public']['Tables']['claim_documents']['Row']
export type ClaimDocumentInsert = Database['public']['Tables']['claim_documents']['Insert']
export type ClaimDocumentUpdate = Database['public']['Tables']['claim_documents']['Update']

/**
 * Create a claim document record
 */
export async function createClaimDocument(
  data: ClaimDocumentInsert
): Promise<ClaimDocument> {
  const supabase = await createClient()
  return insertOne(supabase, 'claim_documents', {
    ...data,
    uploaded_at: data.uploaded_at || new Date().toISOString(),
  })
}

/**
 * Get a document by ID
 */
export async function getClaimDocument(id: string): Promise<ClaimDocument | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch document: ${error.message}`)
  }

  return data as ClaimDocument
}

/**
 * Get all documents for a claim
 */
export async function getClaimDocuments(claimId: string): Promise<ClaimDocument[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_documents')
    .select('*')
    .eq('claim_id', claimId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch claim documents: ${error.message}`)
  }

  return (data || []) as ClaimDocument[]
}

/**
 * Update document processing status
 */
export async function updateDocumentProcessing(
  id: string,
  updates: ClaimDocumentUpdate
): Promise<ClaimDocument> {
  const supabase = await createClient()
  return updateOne(supabase, 'claim_documents', id, {
    ...updates,
    processed_at: updates.processed_at || new Date().toISOString(),
  })
}

/**
 * Mark document as verified
 */
export async function verifyDocument(
  id: string,
  isVerified: boolean = true
): Promise<ClaimDocument> {
  return updateDocumentProcessing(id, {
    is_verified: isVerified,
    verified_at: isVerified ? new Date().toISOString() : null,
  })
}

/**
 * Update extracted data from document
 */
export async function updateDocumentExtraction(
  id: string,
  extractedEntities: unknown,
  ocrData?: unknown,
  autoFilledFields?: unknown
): Promise<ClaimDocument> {
  return updateDocumentProcessing(id, {
    extracted_entities: extractedEntities,
    ocr_data: ocrData,
    auto_filled_fields: autoFilledFields,
    processing_status: 'completed',
  })
}
