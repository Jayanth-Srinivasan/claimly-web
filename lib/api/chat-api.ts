'use client'

/**
 * AI Chat API with SSE Streaming
 * Connects to Next.js API Routes for OpenAI-powered chat
 */

// ============================================================================
// CHAT API WITH SSE STREAMING
// ============================================================================

export interface SendMessageRequest {
  sessionId: string
  message: string
  mode: 'policy' | 'claim'
  attachedFileIds?: string[]
  claimId?: string
  questionId?: string
  answerValue?: any
  questioningState?: any // Client-side Zustand state
}

export interface SendMessageResponse {
  success: boolean
  data?: {
    aiMessage: string
    messageId: string
    claimId?: string
    ruleValidation?: any
    nextAction?: 'ask_question' | 'request_document' | 'show_summary' | 'claim_ready'
    nextQuestion?: any
    requiredDocuments?: string[]
    eligibilityStatus?: 'eligible' | 'ineligible' | 'needs_review'
    claimReadyForSubmission?: boolean
    updatedQuestioningState?: any // Updated state from server
  }
  error?: string
}

/**
 * Send message with SSE streaming for real-time AI responses
 */
export async function sendChatMessage(
  request: SendMessageRequest,
  onChunk?: (chunk: string) => void
): Promise<SendMessageResponse> {
  try {
    const endpoint = request.mode === 'policy' ? '/api/chat/policy' : '/api/chat/claim'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: request.sessionId,
        message: request.message,
        questionId: request.questionId,
        answerValue: request.answerValue,
        questioningState: request.questioningState, // Send client state to server
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API error: ${response.statusText}`)
    }

    // Handle SSE streaming
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullMessage = ''

    if (!reader) {
      throw new Error('No response body')
    }

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            break
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              fullMessage += parsed.content
              onChunk?.(parsed.content)
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    return {
      success: true,
      data: {
        aiMessage: fullMessage,
        messageId: crypto.randomUUID(),
        claimReadyForSubmission: false,
      },
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    }
  }
}

// ============================================================================
// DOCUMENT API WITH OCR
// ============================================================================

export interface ProcessDocumentRequest {
  file: File
  claimId?: string
}

export interface ProcessDocumentResponse {
  success: boolean
  data?: {
    documentId: string
    ocrResults: {
      document_type: string
      extracted_data: any
      authenticity_assessment: any
      summary: string
    }
  }
  error?: string
}

/**
 * Upload and process document with GPT-4o Vision OCR
 */
export async function processDocument(
  request: ProcessDocumentRequest
): Promise<ProcessDocumentResponse> {
  try {
    const formData = new FormData()
    formData.append('file', request.file)
    if (request.claimId) {
      formData.append('claimId', request.claimId)
    }

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`)
    }

    const result = await response.json()

    return {
      success: true,
      data: {
        documentId: result.document?.id || crypto.randomUUID(),
        ocrResults: result.ocrResults,
      },
    }
  } catch (error) {
    console.error('Document processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process document',
    }
  }
}

// ============================================================================
// CLAIMS API
// ============================================================================

export interface SubmitClaimRequest {
  sessionId: string
  claimId: string
}

export interface SubmitClaimResponse {
  success: boolean
  data?: {
    claimNumber: string
    status: string
    message: string
  }
  error?: string
}

/**
 * Submit claim for review
 */
export async function submitClaim(request: SubmitClaimRequest): Promise<SubmitClaimResponse> {
  try {
    // Use existing server action from app/admin/actions.ts
    // This updates the claim status to 'pending' and sets submitted_at timestamp
    const response = await fetch('/api/claims/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Submission failed')
    }

    const result = await response.json()

    return {
      success: true,
      data: {
        claimNumber: result.claim?.claim_number || 'CLM-UNKNOWN',
        status: result.claim?.status || 'pending',
        message: 'Claim submitted successfully',
      },
    }
  } catch (error) {
    console.error('Claim submission error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit claim',
    }
  }
}

// ============================================================================
// ADMIN API
// ============================================================================

export interface SendAdminMessageRequest {
  claimId: string
  message: string
  sessionId?: string
}

export interface SendAdminMessageResponse {
  success: boolean
  data?: {
    messageId: string
    aiResponse?: string
  }
  error?: string
}

/**
 * Send admin message to AI assistant for claim analysis
 */
export async function sendAdminMessage(
  request: SendAdminMessageRequest
): Promise<SendAdminMessageResponse> {
  try {
    const response = await fetch('/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Admin chat failed: ${response.statusText}`)
    }

    const result = await response.json()

    return {
      success: true,
      data: {
        messageId: crypto.randomUUID(),
        aiResponse: result.message,
      },
    }
  } catch (error) {
    console.error('Admin chat error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send admin message',
    }
  }
}
