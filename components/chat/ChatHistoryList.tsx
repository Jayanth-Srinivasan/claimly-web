'use client'

import { MessageSquare, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatHistoryItem } from '@/types/chat'

interface ChatHistoryListProps {
  history: ChatHistoryItem[]
  currentSessionId: string | null
  onSelect: (mode: 'policy' | 'claim', sessionId: string) => void
  loading?: boolean
}

export function ChatHistoryList({
  history,
  currentSessionId,
  onSelect,
  loading,
}: ChatHistoryListProps) {
  if (loading) {
    return <div className="text-center py-4">Loading...</div>
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No chat history
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {history.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.mode, item.id)}
          className={cn(
            'w-full text-left p-3 rounded-lg border transition-colors',
            currentSessionId === item.id
              ? 'bg-primary/10 border-primary'
              : 'hover:bg-muted border-transparent'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="font-medium truncate">{item.title}</span>
                {item.isArchived && (
                  <Archive className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {item.lastMessage}
              </p>
            </div>
            <span
              className={cn(
                'text-xs px-2 py-1 rounded-full shrink-0',
                item.mode === 'policy'
                  ? 'bg-blue-500/10 text-blue-600'
                  : 'bg-green-500/10 text-green-600'
              )}
            >
              {item.mode}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
