'use client'

import { useEffect, useRef } from 'react'
import { User, Bot, Shield, MessageCircle } from 'lucide-react'
import { ChatInput } from '@/components/chat/ChatInput'
import { FormattedMessage } from '@/components/chat/FormattedMessage'
import { cn } from '@/lib/utils'

interface ClaimMessage {
  id: string
  role: 'customer' | 'admin' | 'ai'
  content: string
  timestamp: Date
  admin_only?: boolean | null
}

interface ClaimChatProps {
  messages: ClaimMessage[]
  onSendMessage: (content: string, files: File[]) => void
  isLoading?: boolean
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
            ? 'bg-linear-to-br from-black to-black/80 dark:from-white dark:to-white/80'
            : isAI
            ? 'bg-linear-to-br from-black/10 to-black/5 dark:from-white/10 dark:to-white/5'
            : 'bg-linear-to-br from-black to-black/80 dark:from-white dark:to-white/80'
        )}
      >
        {isAdmin ? (
          <Shield className="h-4 w-4 text-white dark:text-black" />
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
              ? 'bg-linear-to-br from-black to-black/90 dark:from-white dark:to-white/90 text-white dark:text-black shadow-md'
              : isAI
              ? 'bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 text-black dark:text-white'
              : 'bg-linear-to-br from-black to-black/90 dark:from-white dark:to-white/90 text-white dark:text-black shadow-md'
          )}
        >
          {isAI ? (
            <FormattedMessage content={message.content} />
          ) : (
            message.content
          )}
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

export function ClaimChat({ messages, onSendMessage, isLoading = false }: ClaimChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Show only admin messages and admin-only AI messages (hide customer messages and customer-AI messages)
  // For backward compatibility: show AI messages if admin_only is not explicitly false
  const filteredMessages = messages.filter((msg) => {
    // Always show admin messages
    if (msg.role === 'admin') return true
    // Show AI messages that are admin-only OR don't have admin_only explicitly set to false (backward compatibility)
    if (msg.role === 'ai') {
      // Show if admin_only is true, null, or undefined (hide only if explicitly false)
      return msg.admin_only !== false
    }
    // Hide everything else (customer messages)
    return false
  })

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-black/20 dark:text-white/20 mx-auto mb-3" />
              <p className="text-sm text-black/60 dark:text-white/60">
                Ask AI for assistance with this claim
              </p>
            </div>
          </div>
        ) : (
          <>
            {filteredMessages.map((message) => (
              <ClaimChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-linear-to-br from-black/10 to-black/5 dark:from-white/10 dark:to-white/5">
                  <Bot className="h-4 w-4 text-black dark:text-white animate-pulse" />
                </div>
                <div className="flex flex-col gap-1.5 max-w-[75%] md:max-w-[65%]">
                  <div className="rounded-2xl px-4 py-3 bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-black/40 dark:bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-black/40 dark:bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-black/40 dark:bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="shrink-0 border-t border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <div className="p-4">
          <ChatInput
            mode="policy"
            onSendMessage={onSendMessage}
            allowAttachments={false}
          />
        </div>
      </div>
    </div>
  )
}
