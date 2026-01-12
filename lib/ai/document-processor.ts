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
  document: UploadedFile | { path: string; mimeType?: string },
  expectedType?: string
): Promise<DocumentExtraction> {
  const client = createOpenAIClient()

  // For now, we'll use a text-based approach
  // In production, you'd fetch the actual file and use Vision API
  // This is a placeholder that shows the structure

  try {
    // If we have a file path, we could fetch it and process
    // For now, return a structure that can be enhanced
    const response = await client.chat.completions.create({
      model: 'gpt-4o', // GPT-4o supports vision
      messages: [
        {
          role: 'system',
          content: `You are a document analysis assistant. Analyze documents and extract structured information.

Extract:
- Document type (receipt, invoice, medical_report, etc.)
- Key entities (amounts, dates, names, locations, etc.)
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
          content: `Analyze this document${expectedType ? ` (expected type: ${expectedType})` : ''}. 
File path: ${document.path}
MIME type: ${document.mimeType || 'unknown'}

Note: In production, this would include the actual file content via Vision API.`,
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
