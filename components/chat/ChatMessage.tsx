'use client'

import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'
import { FormattedMessage } from './FormattedMessage'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
          isUser
            ? 'bg-linear-to-br from-black to-black/80 dark:from-white dark:to-white/80'
            : 'bg-linear-to-br from-black/10 to-black/5 dark:from-white/10 dark:to-white/5'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white dark:text-black" />
        ) : (
          <Bot className="h-4 w-4 text-black dark:text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn('flex flex-col gap-1.5 max-w-[75%] md:max-w-[65%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-linear-to-br from-black to-black/90 dark:from-white dark:to-white/90 text-white dark:text-black shadow-md whitespace-pre-wrap'
              : 'bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 text-black dark:text-white'
          )}
        >
          {isUser ? (
            message.content
          ) : (
            <FormattedMessage content={message.content} />
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
