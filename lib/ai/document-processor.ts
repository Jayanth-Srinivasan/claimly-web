import { createOpenAIClient } from './openai-client'
import type { UploadedFile } from '@/lib/supabase/storage'

export interface DocumentExtraction {
  extractedEntities: Record<string, unknown>
  ocrData?: string
  autoFilledFields: Record<string, unknown>
  documentType?: string
  authenticityScore?: number
  tamperingDetected?: boolean
  isLegitimate?: boolean
  isRelevant?: boolean
  contextMatches?: boolean
  validationResults: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export interface DocumentContext {
  claimContext?: {
    coverageType?: string
    incidentDescription?: string
    incidentDate?: string
    incidentLocation?: string
  }
  previousAnswers?: Record<string, unknown>
  extractedInfo?: Record<string, unknown>
}

/**
 * Extract information from a document using OpenAI Vision API
 * Enhanced with legitimacy, relevance, and context validation
 */
export async function extractDocumentInfo(
  document: UploadedFile | { path: string; mimeType?: string; url?: string },
  expectedType?: string,
  context?: DocumentContext
): Promise<DocumentExtraction> {
  const client = createOpenAIClient()

  try {
    // Get the file URL - prefer provided URL, otherwise generate signed URL
    let fileUrl = 'url' in document ? document.url : undefined
    
    if (!fileUrl && 'path' in document) {
      // Generate signed URL from path
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const bucket = 'claim-documents'
      const path = document.path
      
      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600)
      
      if (signedData?.signedUrl) {
        fileUrl = signedData.signedUrl
      }
    }
    
    if (!fileUrl) {
      throw new Error('Could not get file URL for document processing')
    }

    // Determine if it's an image or PDF
    const mimeType = 'type' in document ? document.type : document.mimeType
    const isImage = mimeType?.startsWith('image/')
    const isPDF = mimeType === 'application/pdf'
    
    // Build message content with image/document
    const messageContent: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [
      {
        type: 'text',
        text: `Analyze this ${expectedType || (isImage ? 'image' : isPDF ? 'PDF document' : 'document')} and extract all relevant information.`,
      },
    ]
    
    // Add image URL if it's an image
    if (isImage && fileUrl) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: fileUrl },
      })
    } else if (isPDF) {
      // For PDFs, we need to extract text first
      // Try to use a PDF parsing approach
      try {
        // For now, we'll use the file URL and ask GPT-4 to extract text
        // In the future, we could use pdf-parse or similar library
        messageContent.push({
          type: 'text',
          text: `\n\nThis is a PDF document at path: ${document.path}. Please extract all text content, amounts, dates, and relevant information from this PDF. Analyze the document structure and extract key information including: amounts, dates, merchant names, item descriptions, receipt numbers, and any other relevant details.`,
        })
      } catch (error) {
        console.error('PDF processing error:', error)
        // Fallback: inform the model that PDF processing may be limited
        messageContent.push({
          type: 'text',
          text: `\n\nThis is a PDF document. PDF content extraction may be limited. Please attempt to extract information from the document metadata and any available text.`,
        })
      }
    }

    // Build context information for validation
    const contextInfo = context ? `
CLAIM CONTEXT:
- Coverage Type: ${context.claimContext?.coverageType || 'Not provided'}
- Incident Description: ${context.claimContext?.incidentDescription || 'Not provided'}
- Incident Date: ${context.claimContext?.incidentDate || 'Not provided'}
- Incident Location: ${context.claimContext?.incidentLocation || 'Not provided'}

PREVIOUS ANSWERS: ${JSON.stringify(context.previousAnswers || {}, null, 2)}
EXTRACTED INFO: ${JSON.stringify(context.extractedInfo || {}, null, 2)}
` : ''

    const response = await client.chat.completions.create({
      model: 'gpt-4o', // GPT-4o supports vision
      messages: [
        {
          role: 'system',
          content: `You are a document analysis assistant. Analyze documents and extract structured information.

${contextInfo ? `CONTEXT FOR VALIDATION:\n${contextInfo}\n` : ''}

Your tasks:
1. EXTRACT information:
   - Document type (receipt, invoice, medical_report, flight_cancellation, baggage_receipt, etc.)
   - Key entities (amounts, dates, names, locations, flight numbers, etc.)
   - Any text content (OCR)
   - Auto-fillable fields
   - Validation checks (amounts match, dates are valid, etc.)

2. VALIDATE legitimacy:
   - Check for obvious tampering (inconsistent fonts, misaligned text, suspicious edits)
   - Verify document appears authentic (proper formatting, realistic data)
   - Check for consistency in the document (dates make sense, amounts are reasonable)
   - Score authenticity from 0-1 (1 = highly authentic, 0 = clearly tampered)

3. VALIDATE relevance:
   - Check if document type matches the claim type (e.g., baggage receipt for baggage loss claim)
   - Verify document is appropriate for the coverage type
   - Check if document contains information relevant to the claim

4. VALIDATE context matching:
   - Compare extracted information with claim context (dates, locations, amounts should align)
   - Check if extracted data matches previous answers (e.g., amount matches what user said)
   - Verify consistency with previously extracted information
   - Flag any discrepancies

Respond in JSON format with: {
  documentType: string,
  extractedEntities: object,
  ocrData: string,
  autoFilledFields: object,
  isLegitimate: boolean,
  authenticityScore: number (0-1),
  tamperingDetected: boolean,
  isRelevant: boolean,
  contextMatches: boolean,
  validationResults: {
    isValid: boolean,
    errors: string[],
    warnings: string[]
  }
}`,
        },
        {
          role: 'user',
          content: messageContent as unknown as string, // OpenAI handles array format
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from document analysis')
    }

    const analysis = JSON.parse(content) as {
      documentType: string
      extractedEntities: Record<string, unknown>
      ocrData: string
      autoFilledFields: Record<string, unknown>
      isLegitimate?: boolean
      authenticityScore?: number
      tamperingDetected?: boolean
      isRelevant?: boolean
      contextMatches?: boolean
      validationResults: {
        isValid: boolean
        errors: string[]
        warnings: string[]
      }
    }

    // Determine overall validity based on all checks
    const isLegitimate = analysis.isLegitimate !== false && (analysis.authenticityScore ?? 0.7) >= 0.7
    const isRelevant = analysis.isRelevant !== false
    const contextMatches = analysis.contextMatches !== false

    // Add warnings if validation checks fail
    const warnings = [...(analysis.validationResults.warnings || [])]
    if (!isLegitimate) {
      warnings.push('Document may not be legitimate - please verify authenticity')
    }
    if (!isRelevant) {
      warnings.push('Document may not be relevant to this claim type')
    }
    if (!contextMatches) {
      warnings.push('Document information does not match claim context - please verify')
    }

    const isValid = analysis.validationResults.isValid && isLegitimate && isRelevant && contextMatches

    return {
      extractedEntities: analysis.extractedEntities,
      ocrData: analysis.ocrData,
      autoFilledFields: analysis.autoFilledFields,
      documentType: analysis.documentType,
      authenticityScore: analysis.authenticityScore ?? 0.7,
      tamperingDetected: analysis.tamperingDetected ?? false,
      isLegitimate,
      isRelevant,
      contextMatches,
      validationResults: {
        isValid,
        errors: analysis.validationResults.errors || [],
        warnings,
      },
    }
  } catch (error) {
    console.error('[extractDocumentInfo] Error:', error)
    console.error('[extractDocumentInfo] Document:', document)
    console.error('[extractDocumentInfo] Expected type:', expectedType)
    
    // Return a result that allows processing to continue
    // Don't throw - let the handler decide what to do
    return {
      extractedEntities: {},
      ocrData: '',
      autoFilledFields: {},
      documentType: expectedType || 'unknown',
      authenticityScore: 0.5,
      tamperingDetected: false,
      isLegitimate: true, // Assume legitimate to avoid blocking
      isRelevant: true, // Assume relevant to avoid blocking
      contextMatches: true, // Assume matches to avoid blocking
      validationResults: {
        isValid: false,
        errors: [],
        warnings: ['Document processing encountered limitations - document saved for manual review'],
      },
    }
  }
}

/**
 * Validate document type and format
 */
export function validateDocumentFormat(
  file: UploadedFile | { path: string; mimeType?: string; size?: number },
  allowedTypes?: string[],
  maxSize?: number
): { isValid: boolean; error?: string } {
  if (allowedTypes && file.mimeType && !allowedTypes.includes(file.mimeType)) {
    return {
      isValid: false,
      error: `Document type ${file.mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  if (maxSize && file.size && file.size > maxSize) {
    return {
      isValid: false,
      error: `Document size ${file.size} bytes exceeds maximum ${maxSize} bytes`,
    }
  }

  return { isValid: true }
}
