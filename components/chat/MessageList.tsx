'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { FileCheck, FileText, Luggage, Plane, Heart, Shield, Bot, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'

interface MessageListProps {
  messages: Message[]
  mode: 'policy' | 'claim'
  onSuggestedPrompt?: (prompt: string) => void
  isLoading?: boolean
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
    icon: Luggage,
    text: "I lost my baggage",
  },
  {
    icon: Plane,
    text: "My flight was cancelled",
  },
  {
    icon: Heart,
    text: "I need to file a medical claim",
  },
]

export function MessageList({ messages, mode, onSuggestedPrompt, isLoading = false }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const suggestions = mode === 'policy' ? policySuggestions : claimSuggestions

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl w-full">
          <div className="relative inline-flex mb-6">
            <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-black to-black/70 dark:from-white dark:to-white/70 flex items-center justify-center">
              {mode === 'policy' ? (
                <Shield className="h-10 w-10 text-white dark:text-black" />
              ) : (
                <FileCheck className="h-10 w-10 text-white dark:text-black" />
              )}
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-white dark:border-black"></div>
          </div>

          <h2 className="text-3xl font-bold text-black dark:text-white mb-3">
            {mode === 'policy' ? 'Policy Assistant' : 'Claims Assistant'}
          </h2>
          <p className="text-black/60 dark:text-white/60 mb-8 text-lg">
            {mode === 'policy'
              ? 'Ask me anything about your insurance policies and coverage'
              : 'I\'m here to help you file your claim. Tell me what happened and I\'ll guide you through the process.'
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
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Avatar */}
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-black/10 dark:bg-white/10">
            <Bot className="h-4 w-4 text-black dark:text-white" />
          </div>

          {/* Loading Content */}
          <div className="flex flex-col gap-1.5 max-w-[75%] md:max-w-[65%]">
            <div className="rounded-2xl px-4 py-3 bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="h-2 w-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-black/50 dark:text-white/50">AI is thinking...</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={scrollRef} />
    </div>
  )
}
