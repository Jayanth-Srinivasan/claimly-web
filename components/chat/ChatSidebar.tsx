'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatHistoryList } from './ChatHistoryList'
import type { ChatHistoryItem } from '@/types/chat'
import type { Profile } from '@/types/auth'
import { getClaimChatsAction } from '@/app/chat/actions'

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  currentMode: 'policy' | 'claim'
  currentSessionId: string | null
  onSessionSelect: (mode: 'policy' | 'claim', sessionId: string) => void
  profile: Profile
}

export function ChatSidebar({
  isOpen,
  onToggle,
  currentMode,
  currentSessionId,
  onSessionSelect,
  profile,
}: ChatSidebarProps) {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  // Load chat history when sidebar opens or mode changes
  useEffect(() => {
    if (isOpen) {
      loadChatHistory()
    }
  }, [isOpen, currentMode])

  const loadChatHistory = async () => {
    setLoading(true)

    const history: ChatHistoryItem[] = []

    // REMOVED: Don't load policy chats from localStorage for sidebar
    // Policy chats are kept in localStorage but hidden from history

    // Load claim chats from database ONLY
    const result = await getClaimChatsAction()
    if (result.success && result.sessions) {
      history.push(
        ...result.sessions.map((session) => ({
          id: session.id,
          title: session.title,
          mode: 'claim' as const,
          lastMessage: 'Click to load messages',
          timestamp: new Date(session.updated_at),
          messageCount: 0,
          isArchived: session.is_archived,
        }))
      )
    }

    // Sort by timestamp (most recent first)
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    setChatHistory(history)
    setLoading(false)
  }
  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar - always overlay, never inline */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50',
          'w-80 bg-white dark:bg-black',
          'border-r border-black/10 dark:border-white/10',
          'shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-linear-to-br from-black to-black/70 dark:from-white dark:to-white/70 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white dark:text-black" />
              </div>
              <span className="font-bold text-black dark:text-white">Claimly</span>
            </div>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-black dark:text-white" />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4">
            <ChatHistoryList
              history={chatHistory}
              currentSessionId={currentSessionId}
              onSelect={onSessionSelect}
              loading={loading}
            />
          </div>
        </div>
      </aside>
    </>
  )
}
