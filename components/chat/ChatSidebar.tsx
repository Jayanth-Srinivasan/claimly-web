'use client'

import { MessageSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
}

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  chatHistory: ChatHistory[]
}

export function ChatSidebar({ isOpen, onToggle, chatHistory }: ChatSidebarProps) {
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
            {chatHistory.length === 0 ? (
              <div className="text-center py-8 text-black/40 dark:text-white/40 text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-2">
                {chatHistory.map((chat) => (
                  <button
                    key={chat.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="font-medium text-sm text-black dark:text-white truncate">
                      {chat.title}
                    </div>
                    <div className="text-xs text-black/60 dark:text-white/60 truncate mt-1">
                      {chat.lastMessage}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
