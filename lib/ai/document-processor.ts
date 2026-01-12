import { createOpenAIClient } from './openai-client'
import type { UploadedFile } from '@/lib/supabase/storage'

export interface DocumentExtraction {
  extractedEntities: Record<string, unknown>
  ocrData?: string
  autoFilledFields: Record<string, unknown>
  documentType?: string
  authenticityScore?: number
  tamperingDetected?: boolean
  validationResults: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

/**
 * Extract information from a document using OpenAI Vision API
 */
export async function extractDocumentInfo(
  document: UploadedFile | { path: string; mimeType?: string; url?: string },
  expectedType?: string
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
      // For PDFs, we can't use vision API directly, so we'll note it
      messageContent.push({
        type: 'text',
        text: `\n\nThis is a PDF document. File path: ${document.path}. Please note that PDF content extraction requires additional processing.`,
      })
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o', // GPT-4o supports vision
      messages: [
        {
          role: 'system',
          content: `You are a document analysis assistant. Analyze documents and extract structured information.

Extract:
- Document type (receipt, invoice, medical_report, flight_cancellation, etc.)
- Key entities (amounts, dates, names, locations, flight numbers, etc.)
- Any text content (OCR)
- Auto-fillable fields
- Validation checks (amounts match, dates are valid, etc.)

Respond in JSON format with: {
  documentType: string,
  extractedEntities: object,
  ocrData: string,
  autoFilledFields: object,
  validationResults: {isValid: boolean, errors: string[], warnings: string[]}
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
      validationResults: {
        isValid: boolean
        errors: string[]
        warnings: string[]
      }
    }

    return {
      extractedEntities: analysis.extractedEntities,
      ocrData: analysis.ocrData,
      autoFilledFields: analysis.autoFilledFields,
      documentType: analysis.documentType,
      authenticityScore: 0.8, // Placeholder - would be calculated based on analysis
      tamperingDetected: false, // Placeholder - would be detected via analysis
      validationResults: analysis.validationResults,
    }
  } catch (error) {
    console.error('Document extraction error:', error)
    return {
      extractedEntities: {},
      validationResults: {
        isValid: false,
        errors: ['Failed to extract document information'],
        warnings: [],
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
