'use server'

import { createClient } from '@/lib/supabase/server'
import {
  createChatSession,
  getChatSessions,
  getChatSession,
  updateChatSession,
  deleteChatSession,
  archiveChatSession,
} from '@/lib/supabase/chat-sessions'
import {
  addMessageToSession,
  getSessionMessages,
  dbMessageToMessage,
} from '@/lib/supabase/chat-messages'
import type { ChatSession, Message } from '@/types/chat'
import { createOpenAIClient, getSystemPrompt, chatCompletion } from '@/lib/ai/openai-client'
import { getToolsForMode } from '@/lib/ai/tools'
import { handleToolCall, handleExtractDocumentInfo } from '@/lib/ai/tool-handlers'

/**
 * Create a new claim mode chat session
 */
export async function createClaimChatAction(title?: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const session = await createChatSession(user.id, title)
    return { success: true, session }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create chat',
    }
  }
}

/**
 * Get all claim mode chat sessions
 */
export async function getClaimChatsAction() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const sessions = await getChatSessions(user.id)
    return { success: true, sessions }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch chats',
    }
  }
}

/**
 * Load a chat session with all messages
 */
export async function loadChatSessionAction(sessionId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const session = await getChatSession(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.user_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const dbMessages = await getSessionMessages(sessionId)
    const messages = dbMessages.map(dbMessageToMessage)

    return { success: true, session, messages }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load chat',
    }
  }
}

/**
 * Add a message to claim mode chat
 */
export async function addClaimMessageAction(
  sessionId: string,
  content: string,
  role: 'user' | 'assistant',
  attachedFileIds?: string[]
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const dbMessage = await addMessageToSession(sessionId, {
      role,
      content,
      attached_file_ids: attachedFileIds || [],
    })

    const message = dbMessageToMessage(dbMessage)
    return { success: true, message }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add message',
    }
  }
}

/**
 * Update chat session title
 */
export async function updateChatTitleAction(sessionId: string, title: string) {
  try {
    const session = await updateChatSession(sessionId, { title })
    return { success: true, session }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update title',
    }
  }
}

/**
 * Archive chat session (when claim is created)
 */
export async function archiveChatAction(sessionId: string, claimId: string) {
  try {
    const session = await archiveChatSession(sessionId, claimId)
    return { success: true, session }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive chat',
    }
  }
}

/**
 * Delete chat session
 */
export async function deleteChatAction(sessionId: string) {
  try {
    await deleteChatSession(sessionId)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete chat',
    }
  }
}

/**
 * Process a policy chat message with OpenAI (for localStorage-based policy chats)
 */
export async function processPolicyMessageAction(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const mode = 'policy' as const

    // Prepare messages for OpenAI
    const systemPrompt = await getSystemPrompt(mode)
    const openAIMessages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool'
      content: string | null
      name?: string
      tool_call_id?: string
    }> = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ]

    // Add conversation history (last 20 messages to avoid token limits)
    const recentMessages = messages.slice(-20)
    for (const msg of recentMessages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        openAIMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // Get tools for mode
    const tools = getToolsForMode(mode)

    // Initialize OpenAI client
    const client = createOpenAIClient()

    // Iterative tool calling with max iterations
    const MAX_ITERATIONS = 5
    let iteration = 0
    let currentMessages = openAIMessages
    let finalResponse = ''

    while (iteration < MAX_ITERATIONS) {
      // Call OpenAI with tool support
      const response = await chatCompletion(client, currentMessages, tools)
      const message = response.choices[0]?.message

      if (!message) {
        break
      }

      // Add assistant message to conversation
      const assistantMessage: any = {
        role: 'assistant' as const,
        content: message.content,
      }
      if (message.tool_calls) {
        assistantMessage.tool_calls = message.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }))
      }
      currentMessages.push(assistantMessage)

      // If there are tool calls, execute them
      const toolCalls = message.tool_calls || []
      if (toolCalls.length === 0) {
        // No more tool calls, we have the final response
        finalResponse = message.content || ''
        break
      }

      // Execute tool calls
      const toolResults: Array<{
        role: 'tool'
        content: string
        tool_call_id: string
      }> = []

      for (const toolCall of toolCalls) {
        if (toolCall.type === 'function') {
          const toolName = toolCall.function.name
          let toolArgs: Record<string, unknown> = {}

          try {
            toolArgs = JSON.parse(toolCall.function.arguments || '{}')
          } catch (error) {
            console.error('Failed to parse tool arguments:', error)
            toolResults.push({
              role: 'tool',
              content: JSON.stringify({
                success: false,
                error: 'Failed to parse tool arguments',
              }),
              tool_call_id: toolCall.id,
            })
            continue
          }

          // Execute tool
          try {
            const result = await handleToolCall(toolName, toolArgs, user.id)
            toolResults.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
            })
          } catch (error) {
            console.error(`Error executing tool ${toolName}:`, error)
            toolResults.push({
              role: 'tool',
              content: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Tool execution failed',
              }),
              tool_call_id: toolCall.id,
            })
          }
        }
      }

      // Add tool results to messages for next iteration
      currentMessages.push(...toolResults)
      iteration++
    }

    // If we hit max iterations, get a final response
    if (iteration >= MAX_ITERATIONS && !finalResponse) {
      const response = await chatCompletion(client, currentMessages, tools, 'none')
      finalResponse = response.choices[0]?.message?.content || 'I have processed your request. Let me provide you with the information.'
    }

    // Ensure we have a response
    if (!finalResponse) {
      finalResponse = 'I apologize, but I encountered an issue processing your request. Please try again.'
    }

    return {
      success: true,
      content: finalResponse,
    }
  } catch (error) {
    console.error('Error processing policy message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process message',
    }
  }
}

/**
 * Process a chat message with OpenAI and tool calling
 */
export async function processChatMessageAction(
  sessionId: string,
  userMessage: string,
  attachedFileIds?: string[]
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get session to determine mode
    const session = await getChatSession(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    if (session.user_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const mode = session.mode as 'policy' | 'claim'

    // Save user message
    const userDbMessage = await addMessageToSession(sessionId, {
      role: 'user',
      content: userMessage,
      attached_file_ids: attachedFileIds || [],
    })

    // Get conversation history
    const dbMessages = await getSessionMessages(sessionId)
    // Filter out any tool messages (shouldn't exist, but be safe)
    const validDbMessages = dbMessages.filter(
      (msg) => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system'
    )
    const messages = validDbMessages.map(dbMessageToMessage)

    // Prepare messages for OpenAI
    const systemPrompt = await getSystemPrompt(mode)
    type MessageContent = 
      | string 
      | null 
      | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>
    
    const openAIMessages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool'
      content: MessageContent
      name?: string
      tool_call_id?: string
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: {
          name: string
          arguments: string
        }
      }>
    }> = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ]

    // Add conversation history (last 20 messages to avoid token limits)
    // IMPORTANT: Only include 'user' and 'assistant' messages from history
    // Tool messages should NOT be included in history - they're only used within a single API call iteration
    const recentMessages = messages.slice(-20)
    for (const msg of recentMessages) {
      // Only include user and assistant messages - never include tool messages in history
      // Double-check role to be absolutely safe
      if (msg.role === 'user' || msg.role === 'assistant') {
        // For history, just use text content (images from history are already processed)
        openAIMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
      // Explicitly skip any tool messages - they should not be in conversation history
    }
    
    // If current message has files, include them in the message with image URLs
    if (attachedFileIds && attachedFileIds.length > 0) {
      // Get signed URLs for all files
      const fileUrls: Array<{ fileId: string; url: string; type: string }> = []
      
      for (const fileId of attachedFileIds) {
        try {
          const supabase = await createClient()
          const bucket = 'claim-documents'
          const path = fileId
          
          // Get signed URL
          const { data: signedData } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600)
          
          if (signedData?.signedUrl) {
            // Determine file type
            const ext = path.split('.').pop()?.toLowerCase() || ''
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
            fileUrls.push({
              fileId,
              url: signedData.signedUrl,
              type: isImage ? 'image' : 'document',
            })
          }
        } catch (err) {
          console.error('Error getting file URL:', err)
        }
      }
      
      // Build message content with images
      const imageUrls = fileUrls.filter(f => f.type === 'image').map(f => f.url)
      const documentPaths = fileUrls.filter(f => f.type !== 'image').map(f => f.fileId)
      
      // Auto-process PDF documents if in claim mode (before AI sees them)
      const documentProcessingResults: Array<{
        path: string
        success: boolean
        validated: boolean
        errors: string[]
        extractedInfo?: Record<string, unknown>
      }> = []
      
      if (mode === 'claim' && documentPaths.length > 0) {
        console.log(`[processChatMessageAction] Auto-processing ${documentPaths.length} document(s) in claim mode before AI sees them`)
        
        // Get claim ID from session or intake state
        let claimId: string | null = session.claim_id || null
        
        if (!claimId) {
          // Try to get from intake state
          try {
            const { getIntakeStateBySession } = await import('@/lib/supabase/claim-intake-state')
            const intakeState = await getIntakeStateBySession(sessionId)
            claimId = intakeState?.claim_id || null
          } catch (err) {
            console.warn('[processChatMessageAction] Could not get claim from intake state:', err)
          }
          
          // If still no claim ID, try from chat_sessions directly
          if (!claimId) {
            const { getClaimBySessionId } = await import('@/lib/supabase/claims')
            try {
              const claim = await getClaimBySessionId(sessionId)
              claimId = claim?.id || null
            } catch (err) {
              console.warn('[processChatMessageAction] Could not get claim from session:', err)
            }
          }
        }
        
        if (claimId) {
          console.log(`[processChatMessageAction] Found claim ID: ${claimId}, processing documents`)
          
          // Process each document
          for (const docPath of documentPaths) {
            try {
              // Determine document type from file extension
              const ext = docPath.split('.').pop()?.toLowerCase() || ''
              let docType = 'document'
              if (ext === 'pdf') docType = 'receipt'
              else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) docType = 'receipt'
              
              console.log(`[processChatMessageAction] Processing document: ${docPath}, type: ${docType}`)
              
              // Call handleExtractDocumentInfo to process the document
              const result = await handleExtractDocumentInfo(docPath, claimId, docType)
              
              if (result.success && result.data && typeof result.data === 'object' && 'validation' in result.data && 'extraction' in result.data) {
                const validation = (result.data as { validation?: any; extraction?: any }).validation
                const extraction = (result.data as { validation?: any; extraction?: any }).extraction
                
                const processingResult = {
                  path: docPath,
                  success: true,
                  validated: validation?.isValid === true && 
                             validation?.isRelevant === true && 
                             validation?.contextMatches === true,
                  errors: validation?.errors || [],
                  extractedInfo: extraction?.extractedEntities || {},
                }
                
                documentProcessingResults.push(processingResult)
                
                console.log(`[processChatMessageAction] Document processed - Path: ${docPath}, Validated: ${processingResult.validated}, Errors: ${processingResult.errors.length}`)
              } else {
                // Processing failed
                documentProcessingResults.push({
                  path: docPath,
                  success: false,
                  validated: false,
                  errors: [result.error || 'Failed to process document'],
                })
                console.error(`[processChatMessageAction] Document processing failed - Path: ${docPath}, Error: ${result.error}`)
              }
            } catch (err) {
              // Exception during processing
              const errorMessage = err instanceof Error ? err.message : 'Unknown error during processing'
              documentProcessingResults.push({
                path: docPath,
                success: false,
                validated: false,
                errors: [errorMessage],
              })
              console.error(`[processChatMessageAction] Exception processing document - Path: ${docPath}, Error:`, err)
            }
          }
        } else {
          console.warn(`[processChatMessageAction] No claim ID found for session ${sessionId}, cannot auto-process documents`)
          // Mark all documents as unable to process
          for (const docPath of documentPaths) {
            documentProcessingResults.push({
              path: docPath,
              success: false,
              validated: false,
              errors: ['Cannot process document: No claim found. Please start a claim before uploading documents.'],
            })
          }
        }
      } else if (documentPaths.length > 0 && mode !== 'claim') {
        // Not in claim mode, don't process but note it
        console.log(`[processChatMessageAction] Document(s) uploaded but not in claim mode, skipping auto-processing`)
      }
      
      // Create message content array for OpenAI (supports images)
      const messageContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      > = []
      
      // Add text content
      if (userMessage) {
        messageContent.push({ type: 'text', text: userMessage })
      }
      
      // Add image URLs for vision API
      for (const imageUrl of imageUrls) {
        messageContent.push({
          type: 'image_url',
          image_url: { url: imageUrl },
        })
      }
      
      // Add notification for images (they need to be analyzed visually by AI)
      if (imageUrls.length > 0 && mode === 'claim') {
        console.log(`[processChatMessageAction] User uploaded ${imageUrls.length} image(s). AI should analyze visually via vision API.`)
        const imageFilePaths = fileUrls.filter(f => f.type === 'image').map(f => f.fileId)
        messageContent.push({
          type: 'text',
          text: `\n\n[User has uploaded ${imageUrls.length} image(s). Images are visible to you via vision API. Please analyze them visually - extract information, validate the document type matches the claim, and confirm if dates/amounts/locations match the claim context. After analyzing, call save_extracted_info for each piece of information you extract, and then provide a confirmation to the user: "I've analyzed your document and extracted the following information: [list what you found]. This information has been saved to your claim." File paths: ${imageFilePaths.join(', ')}]`,
        })
      }
      
      // Add text about document processing results (instead of asking AI to process)
      if (documentProcessingResults.length > 0) {
        const processingSummary: string[] = []
        
        for (let i = 0; i < documentProcessingResults.length; i++) {
          const result = documentProcessingResults[i]
          const docNum = i + 1
          
          if (result.success && result.validated) {
            // Successfully processed and validated
            const extractedInfo = result.extractedInfo || {}
            const extractedKeys = Object.keys(extractedInfo)
            let extractedSummary = ''
            if (extractedKeys.length > 0) {
              // Include actual values, not just keys
              const extractedDetails = extractedKeys.slice(0, 5).map(key => {
                const value = extractedInfo[key]
                const displayValue = typeof value === 'string' && value.length > 30 
                  ? `${value.substring(0, 30)}...` 
                  : String(value || '')
                return `${key}: ${displayValue}`
              }).join(', ')
              extractedSummary = ` Extracted: ${extractedDetails}${extractedKeys.length > 5 ? '...' : ''}`
            }
            processingSummary.push(`Document ${docNum} - Successfully processed and validated.${extractedSummary}`)
          } else if (result.success && !result.validated) {
            // Processed but validation failed
            const errorText = result.errors.length > 0 ? ` ${result.errors[0]}` : 'Validation failed'
            processingSummary.push(`Document ${docNum} - Processed but validation failed:${errorText}`)
          } else {
            // Processing failed
            const errorText = result.errors.length > 0 ? ` ${result.errors[0]}` : 'Processing failed'
            processingSummary.push(`Document ${docNum} - Processing failed:${errorText}`)
          }
        }
        
        messageContent.push({
          type: 'text',
          text: `\n\n[User uploaded ${documentProcessingResults.length} document(s). Automatic processing completed:\n${processingSummary.join('\n')}\n\nPlease respond to the user about the document processing results. If validation failed, politely ask them to upload the correct document type.]`,
        })
      } else if (documentPaths.length > 0) {
        // Documents uploaded but not processed (e.g., not in claim mode)
        messageContent.push({
          type: 'text',
          text: `\n\n[User has uploaded ${documentPaths.length} document(s): ${documentPaths.join(', ')}. Documents will be processed when a claim is started.]`,
        })
      }
      
      // Add user message with images (OpenAI supports array format for content)
      if (messageContent.length === 1 && messageContent[0].type === 'text') {
        // Only text, use string format
        openAIMessages.push({
          role: 'user',
          content: messageContent[0].text || '',
        })
      } else {
        // Has images, use array format
        openAIMessages.push({
          role: 'user',
          content: messageContent,
        })
      }
    } else if (userMessage) {
      // No files, just add text message
      openAIMessages.push({
        role: 'user',
        content: userMessage,
      })
    }

    // Get tools for mode
    const tools = getToolsForMode(mode)

    // Initialize OpenAI client
    const client = createOpenAIClient()

    // Iterative tool calling with max iterations
    const MAX_ITERATIONS = 5
    let iteration = 0
    // Start with a fresh copy of messages - don't mutate the original
    let currentMessages = [...openAIMessages]
    let finalResponse = ''

    while (iteration < MAX_ITERATIONS) {
      // Call OpenAI with tool support
      const response = await chatCompletion(client, currentMessages, tools)
      const message = response.choices[0]?.message

      if (!message) {
        break
      }

      // Add assistant message to conversation
      // Only include tool_calls if they exist
      const assistantMessage: {
        role: 'assistant'
        content: string | null
        tool_calls?: Array<{
          id: string
          type: 'function'
          function: {
            name: string
            arguments: string
          }
        }>
      } = {
        role: 'assistant',
        content: message.content,
      }
      
      if (message.tool_calls && message.tool_calls.length > 0) {
        assistantMessage.tool_calls = message.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }))
      }
      
      currentMessages.push(assistantMessage)

      // If there are tool calls, execute them
      const toolCalls = message.tool_calls || []
      if (toolCalls.length === 0) {
        // No more tool calls, we have the final response
        finalResponse = message.content || ''
        break
      }

      // Execute tool calls
      const toolResults: Array<{
        role: 'tool'
        content: string
        tool_call_id: string
      }> = []

      for (const toolCall of toolCalls) {
        if (toolCall.type === 'function') {
          const toolName = toolCall.function.name
          let toolArgs: Record<string, unknown> = {}

          try {
            toolArgs = JSON.parse(toolCall.function.arguments || '{}')
          } catch (error) {
            console.error('Failed to parse tool arguments:', error)
            toolResults.push({
              role: 'tool',
              content: JSON.stringify({
                success: false,
                error: 'Failed to parse tool arguments',
              }),
              tool_call_id: toolCall.id,
            })
            continue
          }

          // Add session_id if not present OR if it's a placeholder (for claims mode)
          if (mode === 'claim') {
            const isPlaceholder = !toolArgs.session_id || 
                                 toolArgs.session_id === 'session_id' || 
                                 toolArgs.session_id === 'claim_id' ||
                                 typeof toolArgs.session_id !== 'string' ||
                                 !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(toolArgs.session_id as string)
            
            if (isPlaceholder) {
              console.log(`[processChatMessageAction] Auto-injecting session_id for tool ${toolName} - provided: ${toolArgs.session_id}, actual: ${sessionId}`)
              toolArgs.session_id = sessionId
            }
            
            // For save_answer tool, also handle claim_id auto-injection
            if (toolName === 'save_answer') {
              const claimIdPlaceholder = !toolArgs.claim_id || 
                                        toolArgs.claim_id === 'session_id' || 
                                        toolArgs.claim_id === 'claim_id' ||
                                        typeof toolArgs.claim_id !== 'string' ||
                                        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(toolArgs.claim_id as string)
              
              if (claimIdPlaceholder) {
                console.log(`[processChatMessageAction] Auto-injecting claim_id for save_answer - provided: ${toolArgs.claim_id}, will resolve from session: ${sessionId}`)
                // Set to session_id temporarily - handleSaveAnswer will resolve it to actual claim_id
                toolArgs.claim_id = sessionId
              }
            }
          }

          // Execute tool
          try {
            const result = await handleToolCall(toolName, toolArgs, user.id, sessionId)
            toolResults.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
            })
          } catch (error) {
            console.error(`Error executing tool ${toolName}:`, error)
            toolResults.push({
              role: 'tool',
              content: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Tool execution failed',
              }),
              tool_call_id: toolCall.id,
            })
          }
        }
      }

      // Add tool results to messages for next iteration
      // Only add tool results if we have an assistant message with tool_calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        currentMessages.push(...toolResults)
      }
      iteration++
    }

    // If we hit max iterations, get a final response
    if (iteration >= MAX_ITERATIONS && !finalResponse) {
      const response = await chatCompletion(client, currentMessages, tools, 'none')
      finalResponse = response.choices[0]?.message?.content || 'I have processed your request. Let me provide you with the information.'
    }

    // Ensure we have a response
    if (!finalResponse) {
      finalResponse = 'I apologize, but I encountered an issue processing your request. Please try again.'
    }

    // Save assistant message
    const assistantDbMessage = await addMessageToSession(sessionId, {
      role: 'assistant',
      content: finalResponse,
    })
    
    // Verify if documents/images were processed and saved (only for claim mode with files)
    if (mode === 'claim' && attachedFileIds && attachedFileIds.length > 0) {
      try {
        console.log(`[processChatMessageAction] Verifying document processing - checking database for ${attachedFileIds.length} file(s)`)
        
        // Get claim ID to check documents
        let claimId: string | null = session.claim_id || null
        if (!claimId) {
          const { getIntakeStateBySession } = await import('@/lib/supabase/claim-intake-state')
          const intakeState = await getIntakeStateBySession(sessionId)
          claimId = intakeState?.claim_id || null
        }
        
        if (claimId) {
          // Check if documents were saved for the uploaded file paths
          const { data: savedDocuments, error: docsError } = await supabase
            .from('claim_documents')
            .select('id, file_path, file_name, processing_status, extracted_entities, uploaded_at')
            .eq('claim_id', claimId)
            .in('file_path', attachedFileIds)
          
          if (docsError) {
            console.error(`[processChatMessageAction] Error checking saved documents:`, docsError)
          } else {
            const savedCount = savedDocuments?.length || 0
            const savedPaths = savedDocuments?.map(d => d.file_path) || []
            const notSaved = attachedFileIds.filter(path => !savedPaths.includes(path))
            
            console.log(`[processChatMessageAction] Document verification - Uploaded: ${attachedFileIds.length}, Saved: ${savedCount}, Not saved: ${notSaved.length}`)
            if (savedCount > 0) {
              savedDocuments?.forEach(doc => {
                console.log(`[processChatMessageAction] Verified document saved - Path: ${doc.file_path}, Status: ${doc.processing_status}, Has entities: ${Object.keys(doc.extracted_entities || {}).length > 0}`)
              })
            }
            if (notSaved.length > 0) {
              console.warn(`[processChatMessageAction] Some files were not saved to database:`, notSaved)
            }
          }
          
          // Check extracted info count
          const { data: extractedInfo, error: infoError } = await supabase
            .from('claim_extracted_information')
            .select('id, field_name, created_at')
            .eq('claim_id', claimId)
            .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
          
          if (infoError) {
            console.error(`[processChatMessageAction] Error checking extracted info:`, infoError)
          } else {
            const infoCount = extractedInfo?.length || 0
            if (infoCount > 0) {
              console.log(`[processChatMessageAction] Verified extracted info saved - Fields: ${infoCount}, Field names: ${extractedInfo.map(i => i.field_name).join(', ')}`)
            } else {
              console.warn(`[processChatMessageAction] No extracted info found for recent document processing`)
            }
          }
        } else {
          console.warn(`[processChatMessageAction] Cannot verify documents - no claim ID found for session ${sessionId}`)
        }
      } catch (verifyError) {
        console.error(`[processChatMessageAction] Exception during document verification:`, verifyError)
        // Don't fail the request - verification is informational only
      }
    }

    return {
      success: true,
      message: dbMessageToMessage(assistantDbMessage),
    }
  } catch (error) {
    console.error('Error processing chat message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process message',
    }
  }
}

/**
 * Process admin chat message (stub - to be implemented)
 */
export async function processAdminChatMessageAction(
  claimId: string,
  adminId: string,
  content: string,
  messageHistory: Array<{ role: string; content: string }>
) {
  return {
    success: false,
    error: 'Admin chat processing not yet implemented',
    content: null as string | null,
  }
}
