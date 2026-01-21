import { createClient } from './server'
import type { Json } from '@/types/database'

/**
 * Claim Document Types
 * Simplified schema for document handling
 */
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ClaimDocument {
  id: string
  claim_session_id: string | null
  claim_id: string | null
  user_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number | null
  mime_type: string | null
  processing_status: string | null
  ocr_data: Json | null
  extracted_data: Json | null
  uploaded_at: string | null
  processed_at: string | null
}

export interface ClaimDocumentInsert {
  claim_session_id?: string | null
  claim_id?: string | null
  user_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size?: number | null
  mime_type?: string | null
  processing_status?: string | null
  ocr_data?: Json | null
  extracted_data?: Json | null
}

export interface ClaimDocumentUpdate {
  processing_status?: string | null
  ocr_data?: Json | null
  extracted_data?: Json | null
  processed_at?: string | null
  claim_id?: string | null
}

/**
 * Upload a document (create record)
 */
export async function uploadDocument(
  data: ClaimDocumentInsert
): Promise<ClaimDocument> {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('claim_documents')
    .insert({
      ...data,
      processing_status: data.processing_status || 'pending',
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create document record: ${error.message}`)
  }

  return doc as ClaimDocument
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<ClaimDocument | null> {
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
 * Get all documents for a claim session (during intake)
 */
export async function getSessionDocuments(
  claimSessionId: string
): Promise<ClaimDocument[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_documents')
    .select('*')
    .eq('claim_session_id', claimSessionId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch session documents: ${error.message}`)
  }

  return (data || []) as ClaimDocument[]
}

/**
 * Get all documents for a finalized claim
 */
export async function getClaimDocuments(
  claimId: string
): Promise<ClaimDocument[]> {
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
 * Update OCR data for a document
 */
export async function updateOcrData(
  id: string,
  ocrData: Json,
  extractedData?: Json
): Promise<ClaimDocument> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('claim_documents')
    .update({
      ocr_data: ocrData,
      extracted_data: extractedData || null,
      processing_status: 'completed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update OCR data: ${error.message}`)
  }

  return data as ClaimDocument
}

/**
 * Update document processing status
 */
export async function updateDocumentStatus(
  id: string,
  status: ProcessingStatus,
  errorMessage?: string
): Promise<ClaimDocument> {
  const supabase = await createClient()

  const updateData: ClaimDocumentUpdate = {
    processing_status: status,
  }

  if (status === 'completed' || status === 'failed') {
    updateData.processed_at = new Date().toISOString()
  }

  if (status === 'failed' && errorMessage) {
    updateData.extracted_data = { error: errorMessage }
  }

  const { data, error } = await supabase
    .from('claim_documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update document status: ${error.message}`)
  }

  return data as ClaimDocument
}

/**
 * Move documents from session to finalized claim
 */
export async function moveDocumentsToClaim(
  claimSessionId: string,
  claimId: string
): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('claim_documents')
    .update({ claim_id: claimId })
    .eq('claim_session_id', claimSessionId)
    .select()

  if (error) {
    throw new Error(`Failed to move documents to claim: ${error.message}`)
  }

  return data?.length || 0
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('claim_documents')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`)
  }
}
