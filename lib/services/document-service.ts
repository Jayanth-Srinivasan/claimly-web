import { SupabaseClient } from '@supabase/supabase-js'
import type { DocumentMetadata } from '@/lib/ai/claim-intake/core/types'

/**
 * Pure database operations for documents
 */
export class DocumentService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string): Promise<DocumentMetadata | null> {
    const { data, error } = await this.supabase
      .from('claim_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error || !data) {
      return null
    }

    return this.dbRowToDocument(data)
  }

  /**
   * Get all documents for a session (before claim creation)
   */
  async getDocumentsBySessionId(sessionId: string): Promise<DocumentMetadata[]> {
    // Documents linked via chat_message_id, need to find messages from this session
    const { data: messages } = await this.supabase
      .from('chat_messages')
      .select('id')
      .eq('session_id', sessionId)

    if (!messages || messages.length === 0) {
      return []
    }

    const messageIds = messages.map(m => m.id)

    const { data, error } = await this.supabase
      .from('claim_documents')
      .select('*')
      .in('chat_message_id', messageIds)

    if (error) {
      return []
    }

    return (data || []).map(this.dbRowToDocument)
  }

  /**
   * Get all documents for a claim
   */
  async getDocumentsByClaimId(claimId: string): Promise<DocumentMetadata[]> {
    const { data, error } = await this.supabase
      .from('claim_documents')
      .select('*')
      .eq('claim_id', claimId)

    if (error) {
      return []
    }

    return (data || []).map(this.dbRowToDocument)
  }

  /**
   * Link session documents to claim after claim is created
   */
  async linkDocumentsToClaim(documentIds: string[], claimId: string): Promise<void> {
    if (documentIds.length === 0) return

    const { error } = await this.supabase
      .from('claim_documents')
      .update({ claim_id: claimId })
      .in('id', documentIds)

    if (error) {
      throw new Error(`Failed to link documents to claim: ${error.message}`)
    }
  }

  /**
   * Update document metadata (after processing)
   */
  async updateDocument(documentId: string, updates: Partial<{
    processing_status: string
    ocr_data: any
    extracted_entities: any
    authenticity_score: number
    tampering_detected: boolean
    inferred_document_type: string
    document_purpose: string
    validation_results: any
    risk_flags: string[]
    processed_at: string
  }>): Promise<void> {
    const { error } = await this.supabase
      .from('claim_documents')
      .update(updates)
      .eq('id', documentId)

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`)
    }
  }

  /**
   * Mark document as processed
   */
  async markDocumentProcessed(
    documentId: string,
    ocrData: any,
    extractedEntities?: any
  ): Promise<void> {
    await this.updateDocument(documentId, {
      processing_status: 'completed',
      ocr_data: ocrData,
      extracted_entities: extractedEntities,
      processed_at: new Date().toISOString(),
    })
  }

  /**
   * Save document validation results
   */
  async saveValidationResults(
    documentId: string,
    validationResults: any,
    riskFlags?: string[]
  ): Promise<void> {
    await this.updateDocument(documentId, {
      validation_results: validationResults,
      risk_flags: riskFlags || [],
    })
  }

  /**
   * Save authenticity check results
   */
  async saveAuthenticityCheck(
    documentId: string,
    authenticityScore: number,
    tamperingDetected: boolean
  ): Promise<void> {
    await this.updateDocument(documentId, {
      authenticity_score: authenticityScore,
      tampering_detected: tamperingDetected,
    })
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(claimId: string, documentType: string): Promise<DocumentMetadata[]> {
    const { data, error } = await this.supabase
      .from('claim_documents')
      .select('*')
      .eq('claim_id', claimId)
      .eq('inferred_document_type', documentType)

    if (error) {
      return []
    }

    return (data || []).map(this.dbRowToDocument)
  }

  /**
   * Check if required document types are present
   */
  async checkRequiredDocuments(
    documentIds: string[],
    requiredTypes: string[]
  ): Promise<{
    complete: boolean
    missingTypes: string[]
  }> {
    if (documentIds.length === 0) {
      return { complete: false, missingTypes: requiredTypes }
    }

    const { data } = await this.supabase
      .from('claim_documents')
      .select('inferred_document_type')
      .in('id', documentIds)

    const presentTypes = new Set(
      (data || [])
        .map(d => d.inferred_document_type)
        .filter(Boolean)
    )

    const missingTypes = requiredTypes.filter(type => !presentTypes.has(type))

    return {
      complete: missingTypes.length === 0,
      missingTypes,
    }
  }

  /**
   * Get document file content (base64) for AI processing
   */
  async getDocumentContent(filePath: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('claim-documents')
      .download(filePath)

    if (error) {
      throw new Error(`Failed to download document: ${error.message}`)
    }

    // Convert blob to base64
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
  }

  /**
   * Convert database row to DocumentMetadata
   */
  private dbRowToDocument(row: any): DocumentMetadata {
    return {
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileType: row.file_type,
      documentType: row.inferred_document_type || undefined,
      uploadedAt: row.uploaded_at,
      processed: row.processing_status === 'completed',
      ocrData: row.ocr_data || undefined,
    }
  }
}
