'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { ChatSidebar } from './ChatSidebar'
import { UserMenu } from './UserMenu'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ModeSwitch } from './ModeSwitch'
import type { Profile } from '@/types/auth'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
}

interface ChatDashboardProps {
  profile: Profile
}

export function ChatDashboard({ profile }: ChatDashboardProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [mode, setMode] = useState<'policy' | 'claim'>('policy')

  // Mock chat history (empty initially)
  const [chatHistory] = useState<ChatHistory[]>([])

  const handleSendMessage = (content: string, files: File[]) => {
    // Add user message (mock)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Mock AI response after 1 second
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about ${
          mode === 'policy' ? 'insurance policies' : 'filing a claim'
        }. How can I help you today?`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 1000)
  }

  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt, [])
  }

  return (
    <div className="flex h-screen bg-white dark:bg-black overflow-hidden">
      <ChatSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        chatHistory={chatHistory}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-16 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-black z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              <Menu className="h-5 w-5 text-black dark:text-white" />
            </button>

            {/* Mode Switch - visible on larger screens */}
            <div className="hidden md:block">
              <ModeSwitch mode={mode} onModeChange={setMode} />
            </div>
          </div>

          {/* Mode Switch - visible on mobile, centered */}
          <div className="md:hidden absolute left-1/2 -translate-x-1/2">
            <ModeSwitch mode={mode} onModeChange={setMode} />
          </div>

          <UserMenu profile={profile} />
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          mode={mode}
          onSuggestedPrompt={handleSuggestedPrompt}
        />

        {/* Input */}
        <ChatInput mode={mode} onSendMessage={handleSendMessage} />
      </div>
    </div>
  )
}
