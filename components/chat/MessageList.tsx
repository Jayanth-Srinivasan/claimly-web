'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { Sparkles, FileText, ClipboardList, HelpCircle, Shield } from 'lucide-react'
import type { Message } from '@/types/chat'

interface MessageListProps {
  messages: Message[]
  mode: 'policy' | 'claim'
  onSuggestedPrompt?: (prompt: string) => void
}

const policySuggestions = [
  {
    icon: Shield,
    text: "What's covered in my travel insurance?",
  },
  {
    icon: FileText,
    text: "Show me my policy details",
  },
  {
    icon: HelpCircle,
    text: "How do I add coverage for my trip?",
  },
]

const claimSuggestions = [
  {
    icon: ClipboardList,
    text: "I need to file a new claim",
  },
  {
    icon: FileText,
    text: "Check status of my existing claim",
  },
  {
    icon: HelpCircle,
    text: "What documents do I need?",
  },
]

export function MessageList({ messages, mode, onSuggestedPrompt }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const suggestions = mode === 'policy' ? policySuggestions : claimSuggestions

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl w-full">
          <div className="relative inline-flex mb-6">
            <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-black to-black/70 dark:from-white dark:to-white/70 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-white dark:text-black" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-white dark:border-black"></div>
          </div>

          <h2 className="text-3xl font-bold text-black dark:text-white mb-3">
            {mode === 'policy' ? 'Policy Assistant' : 'Claim Assistant'}
          </h2>
          <p className="text-black/60 dark:text-white/60 mb-8 text-lg">
            {mode === 'policy'
              ? 'Ask me anything about your insurance policies and coverage'
              : 'I can help you file claims and track their status'
            }
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
            {suggestions.map((suggestion, index) => {
              const Icon = suggestion.icon
              return (
                <button
                  key={index}
                  onClick={() => onSuggestedPrompt?.(suggestion.text)}
                  className="group p-4 text-left rounded-xl border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <Icon className="h-5 w-5 text-black/60 dark:text-white/60 mb-2 group-hover:text-black dark:group-hover:text-white transition-colors" />
                  <p className="text-sm text-black dark:text-white font-medium">
                    {suggestion.text}
                  </p>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-black/40 dark:text-white/40 mt-8">
            Click a suggestion or type your question below
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      <div ref={scrollRef} />
    </div>
  )
}
