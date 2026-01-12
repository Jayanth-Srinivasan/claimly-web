'use client'

import { useEffect, useRef } from 'react'
import { User, Bot, Shield, MessageCircle } from 'lucide-react'
import { ChatInput } from '@/components/chat/ChatInput'
import { cn } from '@/lib/utils'

interface ClaimMessage {
  id: string
  role: 'customer' | 'admin' | 'ai'
  content: string
  timestamp: Date
}

interface ClaimChatProps {
  messages: ClaimMessage[]
  mode: 'claimant' | 'ai'
  onSendMessage: (content: string, files: File[]) => void
}

function ClaimChatMessage({ message }: { message: ClaimMessage }) {
  const isAdmin = message.role === 'admin'
  const isAI = message.role === 'ai'

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isAdmin && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
          isAdmin
            ? 'bg-linear-to-br from-blue-500 to-blue-600'
            : isAI
            ? 'bg-linear-to-br from-black/10 to-black/5 dark:from-white/10 dark:to-white/5'
            : 'bg-linear-to-br from-black to-black/80 dark:from-white dark:to-white/80'
        )}
      >
        {isAdmin ? (
          <Shield className="h-4 w-4 text-white" />
        ) : isAI ? (
          <Bot className="h-4 w-4 text-black dark:text-white" />
        ) : (
          <User className="h-4 w-4 text-white dark:text-black" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn('flex flex-col gap-1.5 max-w-[75%] md:max-w-[65%]', isAdmin && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 whitespace-pre-wrap text-sm leading-relaxed',
            isAdmin
              ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-md'
              : isAI
              ? 'bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 text-black dark:text-white'
              : 'bg-linear-to-br from-black to-black/90 dark:from-white dark:to-white/90 text-white dark:text-black shadow-md'
          )}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-black/30 dark:text-white/30 px-2 font-medium">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

export function ClaimChat({ messages, mode, onSendMessage }: ClaimChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-black/20 dark:text-white/20 mx-auto mb-3" />
              <p className="text-sm text-black/60 dark:text-white/60">
                {mode === 'claimant'
                  ? 'Start a conversation with the claimant'
                  : 'Ask AI for assistance with this claim'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ClaimChatMessage key={message.id} message={message} />
            ))}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="shrink-0 border-t border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <div className="p-4">
          <ChatInput mode={mode === 'claimant' ? 'claim' : 'policy'} onSendMessage={onSendMessage} />
        </div>
      </div>
    </div>
  )
}
