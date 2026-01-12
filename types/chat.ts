import { Database } from './database'

// Database types (extracted from database.ts)
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
export type ChatSessionInsert =
  Database['public']['Tables']['chat_sessions']['Insert']
export type ChatSessionUpdate =
  Database['public']['Tables']['chat_sessions']['Update']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type ChatMessageInsert =
  Database['public']['Tables']['chat_messages']['Insert']

// Frontend message type (used in React state)
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  attached_file_ids?: string[]
  sources?: any
  reports?: any
  analysis?: any
  charts?: any
  admin_only?: boolean
}

// LocalStorage chat session (policy mode only - not persisted to database)
export interface LocalChatSession {
  id: string
  title: string
  mode: 'policy'
  messages: Message[]
  created_at: string
  updated_at: string
}

// Chat history item for sidebar display
export interface ChatHistoryItem {
  id: string
  title: string
  mode: 'policy' | 'claim'
  lastMessage: string
  timestamp: Date
  isArchived?: boolean
  messageCount: number
}
