import type { LocalChatSession, Message } from '@/types/chat'

// LocalStorage keys
const POLICY_CHAT_PREFIX = 'claimly_policy_chat_'
const POLICY_CHAT_LIST_KEY = 'claimly_policy_chat_list'
const ACTIVE_SESSION_KEY = 'claimly_active_session'

/**
 * Get all policy chat session IDs
 */
export function getPolicyChatIds(): string[] {
  if (typeof window === 'undefined') return []
  const list = localStorage.getItem(POLICY_CHAT_LIST_KEY)
  return list ? JSON.parse(list) : []
}

/**
 * Get a policy chat session by ID
 */
export function getPolicyChatSession(
  sessionId: string
): LocalChatSession | null {
  if (typeof window === 'undefined') return null
  const key = `${POLICY_CHAT_PREFIX}${sessionId}`
  const data = localStorage.getItem(key)
  if (!data) return null

  const session = JSON.parse(data)
  // Rehydrate dates
  session.messages = session.messages.map((msg: any) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }))

  return session
}

/**
 * Get all policy chat sessions (sorted by updated_at)
 */
export function getAllPolicyChatSessions(): LocalChatSession[] {
  const ids = getPolicyChatIds()
  return ids
    .map((id) => getPolicyChatSession(id))
    .filter((s): s is LocalChatSession => s !== null)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
}

/**
 * Create a new policy chat session
 */
export function createPolicyChatSession(title?: string): LocalChatSession {
  const id = crypto.randomUUID()
  const session: LocalChatSession = {
    id,
    title: title || 'New Policy Chat',
    mode: 'policy',
    messages: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  savePolicyChatSession(session)
  return session
}

/**
 * Save policy chat session to localStorage
 */
export function savePolicyChatSession(session: LocalChatSession): void {
  if (typeof window === 'undefined') return

  try {
    const key = `${POLICY_CHAT_PREFIX}${session.id}`
    const updated = { ...session, updated_at: new Date().toISOString() }
    localStorage.setItem(key, JSON.stringify(updated))

    // Update session list
    const ids = getPolicyChatIds()
    if (!ids.includes(session.id)) {
      ids.push(session.id)
      localStorage.setItem(POLICY_CHAT_LIST_KEY, JSON.stringify(ids))
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please delete some policy chats.')
    }
    throw error
  }
}

/**
 * Add message to policy chat session
 */
export function addMessageToPolicyChat(
  sessionId: string,
  message: Message
): void {
  const session = getPolicyChatSession(sessionId)
  if (!session) return

  session.messages.push(message)
  savePolicyChatSession(session)
}

/**
 * Delete a policy chat session
 */
export function deletePolicyChatSession(sessionId: string): void {
  if (typeof window === 'undefined') return

  const key = `${POLICY_CHAT_PREFIX}${sessionId}`
  localStorage.removeItem(key)

  // Remove from list
  const ids = getPolicyChatIds().filter((id) => id !== sessionId)
  localStorage.setItem(POLICY_CHAT_LIST_KEY, JSON.stringify(ids))
}

/**
 * Clear all policy chats (call on logout)
 */
export function clearAllPolicyChats(): void {
  if (typeof window === 'undefined') return

  const ids = getPolicyChatIds()
  ids.forEach((id) => {
    localStorage.removeItem(`${POLICY_CHAT_PREFIX}${id}`)
  })
  localStorage.removeItem(POLICY_CHAT_LIST_KEY)
  localStorage.removeItem(ACTIVE_SESSION_KEY)
}

/**
 * Track active session (persists across page refresh)
 */
export function getActiveSession(): {
  mode: 'policy' | 'claim'
  sessionId: string
} | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(ACTIVE_SESSION_KEY)
  return data ? JSON.parse(data) : null
}

export function setActiveSession(
  mode: 'policy' | 'claim',
  sessionId: string
): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ mode, sessionId }))
}

export function clearActiveSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACTIVE_SESSION_KEY)
}
