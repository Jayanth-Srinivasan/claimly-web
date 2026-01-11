import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Database } from '@/types/database'
import type {
  ChatSession,
  ChatSessionInsert,
  ChatSessionUpdate,
} from '@/types/chat'

/**
 * Get all chat sessions for current user (claim mode only)
 */
export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'claim')
    .order('updated_at', { ascending: false })

  if (error) throw new Error('Failed to fetch chat sessions')
  return (data || []) as ChatSession[]
}

/**
 * Get a single chat session by ID
 */
export async function getChatSession(
  sessionId: string
): Promise<ChatSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) return null
  return data as ChatSession
}

/**
 * Create a new claim mode chat session
 */
export async function createChatSession(
  userId: string,
  title?: string
): Promise<ChatSession> {
  const supabase = await createClient()

  const insertData: Database['public']['Tables']['chat_sessions']['Insert'] = {
    user_id: userId,
    title: title || 'New Claim Chat',
    mode: 'claim',
    is_archived: false,
  }

  const data = await insertOne(supabase, 'chat_sessions', insertData)
  return data as ChatSession
}

/**
 * Update chat session (e.g., title)
 */
export async function updateChatSession(
  sessionId: string,
  updates: ChatSessionUpdate
): Promise<ChatSession> {
  const supabase = await createClient()
  const data = await updateOne(supabase, 'chat_sessions', sessionId, updates)
  return data as ChatSession
}

/**
 * Archive a chat session (when claim is created)
 */
export async function archiveChatSession(
  sessionId: string,
  claimId: string
): Promise<ChatSession> {
  return updateChatSession(sessionId, {
    is_archived: true,
    archived_at: new Date().toISOString(),
    claim_id: claimId,
  })
}

/**
 * Delete a chat session (only if not archived)
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const supabase = await createClient()

  const session = await getChatSession(sessionId)
  if (session?.is_archived) {
    throw new Error('Cannot delete archived chat sessions')
  }

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw new Error('Failed to delete chat session')
}
