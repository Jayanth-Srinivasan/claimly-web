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
  const startTime = Date.now()
  const client = createOpenAIClient()

  console.log(`[extractDocumentInfo] Starting document extraction - Expected type: ${expectedType || 'unknown'}, Has URL: ${'url' in document ? !!document.url : false}, Has path: ${'path' in document ? !!document.path : false}`)
  if (context) {
    console.log(`[extractDocumentInfo] Context provided - Coverage Type: ${context.claimContext?.coverageType || 'none'}, Incident Date: ${context.claimContext?.incidentDate || 'none'}, Incident Location: ${context.claimContext?.incidentLocation || 'none'}`)
  }

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
    
    console.log(`[extractDocumentInfo] Document type detected - MIME: ${mimeType || 'unknown'}, Is Image: ${isImage}, Is PDF: ${isPDF}, File URL: ${fileUrl.substring(0, 50)}...`)
    
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
    } else if (isPDF && fileUrl) {
      // NOTE: OpenAI's vision API doesn't support PDFs directly - only images
      // We need to convert PDF pages to images or extract text first
      // For now, we'll fetch the PDF and try to extract text using a simple approach
      console.log(`[extractDocumentInfo] Processing PDF - fetching and extracting text: ${fileUrl.substring(0, 50)}...`)
      
      try {
        // Fetch the PDF from the signed URL
        const pdfResponse = await fetch(fileUrl)
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`)
        }
        
        const pdfBuffer = await pdfResponse.arrayBuffer()
        
        // Try to use pdf-parse if available (requires: npm install pdf-parse)
        try {
          // pdf-parse is a CommonJS module, handle import accordingly
          const pdfParseModule = await import('pdf-parse')
          const pdfParse = (pdfParseModule as any).default || pdfParseModule
          const pdfData = await pdfParse(Buffer.from(pdfBuffer))
          const extractedText = pdfData.text
          
          console.log(`[extractDocumentInfo] PDF text extracted - ${extractedText.length} characters`)
          
          // Send extracted text to the model
          messageContent.push({
            type: 'text',
            text: `\n\nThis is a PDF document. Here is the extracted text content:\n\n${extractedText}\n\nPlease analyze this text and extract all relevant information including: amounts, dates, merchant names, item descriptions, receipt numbers, flight numbers, baggage tag numbers, and any other relevant details.`,
          })
        } catch (parseError) {
          // pdf-parse not available or failed - use fallback
          console.warn(`[extractDocumentInfo] PDF parsing library not available, using fallback approach:`, parseError)
          messageContent.push({
            type: 'text',
            text: `\n\nThis is a PDF document. The PDF file is available at: ${fileUrl}. However, automatic text extraction is not available. Please note that you may need to manually review this PDF. For proper PDF processing, please ensure the pdf-parse library is installed (npm install pdf-parse).`,
          })
        }
      } catch (pdfError) {
        console.error(`[extractDocumentInfo] PDF processing error:`, pdfError)
        // Fallback: inform the model that PDF processing failed
        messageContent.push({
          type: 'text',
          text: `\n\nThis is a PDF document, but automatic processing failed. The PDF is available at: ${fileUrl}. Please note that PDF content extraction may be limited. Error: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
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
   - Set isLegitimate to false if tampering is detected or authenticity score < 0.7

3. VALIDATE relevance (CRITICAL):
   - **Document type MUST match the expected document type for the claim type**:
     - For baggage loss claims: expect baggage_receipt, lost_item_receipt, purchase_receipt
     - For flight cancellation claims: expect flight_cancellation, airline_notification, booking_confirmation
     - For medical claims: expect medical_report, hospital_bill, prescription_receipt
     - For other claim types: expect appropriate document types
   - If document type does NOT match the expected type for the coverage type, set isRelevant to false
   - Verify document is appropriate for the coverage type
   - Check if document contains information relevant to the claim
   - Set isRelevant to false if document type is clearly wrong (e.g., medical report for baggage loss claim)

4. VALIDATE context matching (CRITICAL):
   - **Dates MUST align**: If claim context includes an incident date, document dates should be close to or after the incident date (unless it's a receipt from before the incident)
   - **Amounts MUST align**: If claim context includes an amount or previous answers mention an amount, document amounts should reasonably match (allow small variations for currency conversion or fees)
   - **Locations MUST align**: If claim context includes a location, document locations should match or be related (e.g., airport code matches claim location)
   - Compare extracted information with claim context (dates, locations, amounts should align)
   - Check if extracted data matches previous answers (e.g., amount matches what user said)
   - Verify consistency with previously extracted information
   - Flag any discrepancies
   - Set contextMatches to false if dates, amounts, or locations significantly differ from claim context

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
    
    console.log(`[extractDocumentInfo] Received response from OpenAI - Content length: ${content.length}`)

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
    // Use strict === true checks to ensure validation only passes if explicitly true
    const isLegitimate = analysis.isLegitimate === true && (analysis.authenticityScore ?? 0.7) >= 0.7
    const isRelevant = analysis.isRelevant === true
    const contextMatches = analysis.contextMatches === true
    
    console.log(`[extractDocumentInfo] Validation flags determined:`, {
      isLegitimate,
      isRelevant,
      contextMatches,
      authenticityScore: analysis.authenticityScore,
      analysisFlags: {
        isLegitimate: analysis.isLegitimate,
        isRelevant: analysis.isRelevant,
        contextMatches: analysis.contextMatches,
      }
    })

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

    const elapsedTime = Date.now() - startTime
    console.log(`[extractDocumentInfo] Document analysis completed in ${elapsedTime}ms - Document Type: ${analysis.documentType}, Valid: ${isValid}, Entities: ${Object.keys(analysis.extractedEntities).length}, AutoFilled: ${Object.keys(analysis.autoFilledFields).length}`)

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
    const elapsedTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error(`[extractDocumentInfo] Error occurred after ${elapsedTime}ms:`, {
      error: errorMessage,
      stack: errorStack,
      document: 'path' in document ? { path: document.path, mimeType: (document as { path: string; mimeType?: string }).mimeType } : 'UploadedFile',
      expectedType: expectedType || 'unknown',
    })
    
    // Return a result that allows processing to continue
    // Don't throw - let the handler decide what to do
    // Note: isLegitimate defaults to true to avoid blocking legitimate documents on technical errors
    // But isRelevant and contextMatches default to false since we can't validate without processing
    return {
      extractedEntities: {},
      ocrData: '',
      autoFilledFields: {},
      documentType: expectedType || 'unknown',
      authenticityScore: 0.5,
      tamperingDetected: false,
      isLegitimate: true, // Assume legitimate to avoid blocking on technical errors
      isRelevant: false, // Cannot validate relevance without processing - require validation
      contextMatches: false, // Cannot validate context matching without processing - require validation
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
  const mimeType = 'mimeType' in file ? file.mimeType : ('type' in file ? file.type : undefined)
  
  if (allowedTypes && mimeType && !allowedTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `Document type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  const fileSize = 'size' in file ? file.size : undefined
  if (maxSize && fileSize && fileSize > maxSize) {
    return {
      isValid: false,
      error: `Document size ${fileSize} bytes exceeds maximum ${maxSize} bytes`,
    }
  }

  return { isValid: true }
}
