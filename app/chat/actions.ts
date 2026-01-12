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
      currentMessages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      })

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
      
      // Add text about documents if any
      if (documentPaths.length > 0) {
        messageContent.push({
          type: 'text',
          text: `\n\n[User has also uploaded ${documentPaths.length} document(s): ${documentPaths.join(', ')}. Please process these using extract_document_info tool.]`,
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

          // Add session_id if not present (for claims mode)
          if (mode === 'claim' && !toolArgs.session_id) {
            toolArgs.session_id = sessionId
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
