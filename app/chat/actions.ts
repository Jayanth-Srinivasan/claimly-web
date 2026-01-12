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
    const messages = dbMessages.map(dbMessageToMessage)

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
