import { createClient } from './server'
import { insertOne } from './helpers'
import type { Database } from '@/types/database'
import type { ChatMessage, ChatMessageInsert, Message } from '@/types/chat'

/**
 * Get all messages for a session
 */
export async function getSessionMessages(
  sessionId: string
): Promise<ChatMessage[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error('Failed to fetch messages')
  return (data || []) as ChatMessage[]
}

/**
 * Add a message to a session
 */
export async function addMessageToSession(
  sessionId: string,
  message: Omit<ChatMessageInsert, 'session_id'>
): Promise<ChatMessage> {
  const supabase = await createClient()

  const insertData: Database['public']['Tables']['chat_messages']['Insert'] = {
    session_id: sessionId,
    role: message.role,
    content: message.content,
    attached_file_ids: message.attached_file_ids || [],
    sources: message.sources,
    reports: message.reports,
    analysis: message.analysis,
    charts: message.charts,
  }

  const data = await insertOne(supabase, 'chat_messages', insertData)

  // Note: Session's updated_at is managed by database trigger on session updates
  // For now, sessions are sorted by created_at. In the future, we could add a
  // last_message_at field to track when the last message was added.

  return data as ChatMessage
}

/**
 * Convert database message to frontend Message type
 */
export function dbMessageToMessage(dbMessage: ChatMessage): Message {
  return {
    id: dbMessage.id,
    role: dbMessage.role,
    content: dbMessage.content,
    timestamp: new Date(dbMessage.created_at),
    attached_file_ids: dbMessage.attached_file_ids,
    sources: dbMessage.sources,
    reports: dbMessage.reports,
    analysis: dbMessage.analysis,
    charts: dbMessage.charts,
  }
}
