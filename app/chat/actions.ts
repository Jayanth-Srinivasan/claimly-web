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
import { handleToolCall } from '@/lib/ai/tool-handlers'

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

    // Add conversation history (last 12 messages to reduce token usage)
    const recentMessages = messages.slice(-12)
    for (const msg of recentMessages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        // Truncate very long messages to max 500 characters to reduce token usage
        let content = msg.content
        if (typeof content === 'string' && content.length > 500) {
          content = content.substring(0, 500) + '... [truncated]'
        }
        openAIMessages.push({
          role: msg.role,
          content: content,
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

    // Add conversation history (last 12 messages to reduce token usage)
    // IMPORTANT: Only include 'user' and 'assistant' messages from history
    // Tool messages should NOT be included in history - they're only used within a single API call iteration
    const recentMessages = messages.slice(-12)
    for (const msg of recentMessages) {
      // Only include user and assistant messages - never include tool messages in history
      // Double-check role to be absolutely safe
      if (msg.role === 'user' || msg.role === 'assistant') {
        // Truncate very long messages to max 500 characters to reduce token usage
        let content = msg.content
        if (typeof content === 'string' && content.length > 500) {
          content = content.substring(0, 500) + '... [truncated]'
        }
        // For history, just use text content (images from history are already processed)
        openAIMessages.push({
          role: msg.role,
          content: content,
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
      
      // Document paths for AI to know about (processing is handled by AI via tools)

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
          text: `\n\n[User has uploaded ${imageUrls.length} image(s). Images are visible to you via vision API. Please analyze them visually and extract relevant information for the claim. File paths: ${imageFilePaths.join(', ')}. Use upload_document tool to record these files.]`,
        })
      }

      // Add notification for documents
      if (documentPaths.length > 0 && mode === 'claim') {
        messageContent.push({
          type: 'text',
          text: `\n\n[User uploaded ${documentPaths.length} document(s): ${documentPaths.join(', ')}. Use upload_document tool to record these files for the claim.]`,
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
            const resultJson = JSON.stringify(result)
            
            // Summarize large tool responses to reduce token usage
            let optimizedResult = resultJson
            if (resultJson.length > 1000) {
              try {
                const parsed = JSON.parse(resultJson)
                if (parsed.success && parsed.data) {
                  // Create summary based on tool type
                  if (toolName === 'get_coverage_questions' && Array.isArray(parsed.data)) {
                    // Only include question IDs and first question text
                    const summary = parsed.data.slice(0, 5).map((q: any) => ({
                      id: q.id,
                      question_text: q.question_text?.substring(0, 100),
                    }))
                    optimizedResult = JSON.stringify({
                      success: true,
                      data: summary,
                      total: parsed.data.length,
                      truncated: parsed.data.length > 5,
                    })
                  } else if (toolName === 'validate_answers' && parsed.data) {
                    // Only include pass/fail and error count
                    optimizedResult = JSON.stringify({
                      success: true,
                      data: {
                        passed: parsed.data.passed,
                        errors: parsed.data.errors?.length || 0,
                        warnings: parsed.data.warnings?.length || 0,
                      },
                    })
                  } else if (Array.isArray(parsed.data)) {
                    // Truncate large arrays
                    const truncated = parsed.data.slice(0, 5)
                    optimizedResult = JSON.stringify({
                      success: true,
                      data: truncated,
                      total: parsed.data.length,
                      truncated: parsed.data.length > 5,
                    })
                  } else if (typeof parsed.data === 'object' && parsed.data !== null) {
                    // For objects, keep only essential fields
                    const essential: any = { success: true }
                    if ('passed' in parsed.data) essential.data = { passed: parsed.data.passed }
                    else if ('claimId' in parsed.data) essential.data = { claimId: parsed.data.claimId }
                    else if ('claim_id' in parsed.data) essential.data = { claim_id: parsed.data.claim_id }
                    else essential.data = { ...parsed.data }
                    optimizedResult = JSON.stringify(essential)
                  }
                }
              } catch (e) {
                // If parsing fails, just truncate the string
                optimizedResult = resultJson.substring(0, 1000) + '... [truncated]'
              }
            }
            
            toolResults.push({
              role: 'tool',
              content: optimizedResult,
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
    
    // Log document uploads for debugging
    if (mode === 'claim' && attachedFileIds && attachedFileIds.length > 0) {
      console.log(`[processChatMessageAction] User uploaded ${attachedFileIds.length} file(s) in claim mode`)
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
 * Process admin chat message with AI - includes full claim context
 */
export async function processAdminChatMessageAction(
  claimId: string,
  adminId: string,
  content: string,
  messageHistory: Array<{ role: string; content: string }>
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

    // Verify admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return { success: false, error: 'Admin access required' }
    }

    // Fetch claim details
    const { getClaim } = await import('@/lib/supabase/claims')
    const claim = await getClaim(claimId)

    if (!claim) {
      return { success: false, error: 'Claim not found' }
    }

    // Fetch claim documents
    const { getClaimDocuments } = await import('@/lib/supabase/claim-documents')
    const documents = await getClaimDocuments(claimId)

    // Get user profile for customer info
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', claim.user_id)
      .single()

    // Ensure chat session exists
    let sessionId = claim.chat_session_id
    if (!sessionId) {
      // Create a new chat session for admin interactions
      const newSession = await createChatSession(claim.user_id, `Admin Review: ${claim.claim_number}`)
      sessionId = newSession.id
      
      // Update claim with session ID
      const { updateClaim } = await import('@/lib/supabase/claims')
      await updateClaim(claimId, { chat_session_id: sessionId })
    }

    // Build system prompt with full claim context
    const systemPrompt = `You are an expert insurance claim analysis assistant helping an admin review and analyze claims.

**YOUR ROLE:**
- Help admins understand claim details, validity, and recommend actions
- Analyze claim information, documents, and customer history
- Provide professional, accurate, and helpful insights
- Answer questions about the claim, policy coverage, and next steps

**CURRENT CLAIM CONTEXT:**
- Claim Number: ${claim.claim_number}
- Claim ID: ${claim.id}
- Status: ${claim.status}
- Claimed Amount: ${claim.currency || 'USD'} ${claim.total_claimed_amount}
- Incident Type: ${claim.incident_type}
- Incident Date: ${claim.incident_date}
- Incident Location: ${claim.incident_location || 'Not specified'}
- Incident Description: ${claim.incident_description || 'No description provided'}
- Customer: ${customerProfile?.full_name || customerProfile?.email || 'Unknown'} (${customerProfile?.email || 'No email'})
- Submitted At: ${claim.submitted_at ? new Date(claim.submitted_at).toLocaleString() : 'Not submitted'}
- Created At: ${claim.created_at ? new Date(claim.created_at).toLocaleString() : 'Unknown'}

**DOCUMENTS:**
${documents.length > 0 
  ? documents.map((doc, idx) => `${idx + 1}. ${doc.file_name} (${doc.file_type}, ${doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : 'size unknown'})`).join('\n')
  : 'No documents uploaded'}

**ADDITIONAL CLAIM DATA:**
${claim.eligibility_status ? `- Eligibility Status: ${claim.eligibility_status}\n` : ''}${claim.priority ? `- Priority: ${claim.priority}\n` : ''}${claim.approved_amount ? `- Approved Amount: ${claim.currency || 'USD'} ${claim.approved_amount}\n` : ''}${claim.deductible ? `- Deductible: ${claim.currency || 'USD'} ${claim.deductible}\n` : ''}${claim.ai_validated !== null ? `- AI Validated: ${claim.ai_validated ? 'Yes' : 'No'}\n` : ''}

**YOUR RESPONSIBILITIES:**
1. Answer questions about the claim details, status, and history
2. Analyze claim validity based on the information provided
3. Review documents and provide insights
4. Suggest appropriate actions (approve, reject, request more info, etc.)
5. Help understand policy coverage and claim eligibility
6. Provide professional, clear, and actionable recommendations

**RESPONSE STYLE:**
- Be professional, clear, and concise
- Use specific details from the claim context
- Provide actionable recommendations when appropriate
- If you need more information, suggest what should be requested
- Always be helpful and supportive to the admin

**IMPORTANT:**
- You have access to full claim context - use it to provide accurate answers
- Reference specific claim details (numbers, dates, amounts) when relevant
- If asked about actions, consider the claim status and provide appropriate recommendations
- Be thorough but concise in your responses`

    // Save admin message to database (mark as admin-only)
    await addMessageToSession(sessionId, {
      role: 'admin',
      content,
      admin_only: true,
    })

    // Prepare messages for OpenAI
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

    // Add conversation history (last 12 messages)
    const recentHistory = messageHistory.slice(-12)
    for (const msg of recentHistory) {
      if (msg.role === 'admin' || msg.role === 'user') {
        openAIMessages.push({
          role: 'user',
          content: msg.content,
        })
      } else if (msg.role === 'assistant' || msg.role === 'ai') {
        openAIMessages.push({
          role: 'assistant',
          content: msg.content,
        })
      }
    }

    // Add current admin message
    openAIMessages.push({
      role: 'user',
      content,
    })

    // Initialize OpenAI client
    const { createOpenAIClient, chatCompletion } = await import('@/lib/ai/openai-client')
    const client = createOpenAIClient()

    // Call OpenAI (no tools needed for admin chat - just analysis)
    const response = await chatCompletion(client, openAIMessages, [])

    const aiResponse = response.choices[0]?.message?.content || ''

    if (!aiResponse) {
      return { success: false, error: 'No response from AI' }
    }

    // Save AI response to database (mark as admin-only)
    await addMessageToSession(sessionId, {
      role: 'assistant',
      content: aiResponse,
      admin_only: true,
    })

    return {
      success: true,
      content: aiResponse,
    }
  } catch (error) {
    console.error('Error processing admin chat message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process message',
      content: null,
    }
  }
}
