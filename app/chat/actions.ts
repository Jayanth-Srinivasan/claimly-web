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
