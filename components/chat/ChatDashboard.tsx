'use client'

import { useState, useEffect } from 'react'
import { Menu, FileStack } from 'lucide-react'
import { toast } from 'sonner'
import { ChatSidebar } from './ChatSidebar'
import { UserMenu } from './UserMenu'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ModeSwitch } from './ModeSwitch'
import { ModeSwitchDialog } from './ModeSwitchDialog'
import { NewChatButton } from './NewChatButton'
import { UploadedFilesDialog } from './UploadedFilesDialog'
import { uploadFilesAction } from '@/app/upload/actions'
import type { Profile } from '@/types/auth'
import type { UploadedFile } from '@/lib/supabase/storage'
import type { Message, ChatSession } from '@/types/chat'
import {
  createPolicyChatSession,
  getPolicyChatSession,
  addMessageToPolicyChat,
  setActiveSession,
  getActiveSession,
} from '@/lib/chat/local-storage'
import {
  createClaimChatAction,
  loadChatSessionAction,
  addClaimMessageAction,
  processChatMessageAction,
  processPolicyMessageAction,
} from '@/app/chat/actions'

interface ChatDashboardProps {
  profile: Profile
}

export function ChatDashboard({ profile }: ChatDashboardProps) {
  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [mode, setMode] = useState<'policy' | 'claim'>('policy')
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  // Mode switching dialog
  const [showModeSwitchDialog, setShowModeSwitchDialog] = useState(false)
  const [pendingMode, setPendingMode] = useState<'policy' | 'claim' | null>(
    null
  )

  // Load a session (policy or claim)
  const loadSession = async (
    sessionMode: 'policy' | 'claim',
    sessionId: string
  ) => {
    if (sessionMode === 'policy') {
      const session = getPolicyChatSession(sessionId)
      if (session) {
        setMessages(session.messages)
        setMode('policy')
        setCurrentSessionId(sessionId)
        setCurrentSession(null)
        setActiveSession('policy', sessionId)
      }
    } else {
      const result = await loadChatSessionAction(sessionId)
      if (result.success && result.session && result.messages) {
        setMessages(result.messages)
        setMode('claim')
        setCurrentSessionId(sessionId)
        setCurrentSession(result.session)
        setActiveSession('claim', sessionId)
      } else {
        toast.error(result.error || 'Failed to load chat')
      }
    }
  }

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      const active = getActiveSession()
      if (active) {
        await loadSession(active.mode, active.sessionId)
      } else {
        // Create initial policy chat
        const session = createPolicyChatSession()
        setCurrentSessionId(session.id)
        setMode('policy')
        setActiveSession('policy', session.id)
      }
    }

    initializeSession()
  }, [])

  // Handle mode change with save/discard dialog
  const handleModeChange = (newMode: 'policy' | 'claim') => {
    if (newMode === mode) return

    // If there are messages, show dialog
    if (messages.length > 0) {
      setPendingMode(newMode)
      setShowModeSwitchDialog(true)
    } else {
      // No messages, just switch
      switchMode(newMode)
    }
  }

  // Switch mode (after dialog confirmation or no messages)
  const switchMode = async (newMode: 'policy' | 'claim') => {
    if (newMode === 'policy') {
      const session = createPolicyChatSession()
      setMessages([])
      setMode('policy')
      setCurrentSessionId(session.id)
      setCurrentSession(null)
      setActiveSession('policy', session.id)
    } else {
      const result = await createClaimChatAction()
      if (result.success && result.session) {
        setMessages([])
        setMode('claim')
        setCurrentSessionId(result.session.id)
        setCurrentSession(result.session)
        setActiveSession('claim', result.session.id)
      } else {
        toast.error(result.error || 'Failed to create claim chat')
      }
    }
  }

  // Handle new chat button
  const handleNewChat = async () => {
    if (mode === 'policy') {
      const session = createPolicyChatSession()
      setMessages([])
      setCurrentSessionId(session.id)
      setActiveSession('policy', session.id)
    } else {
      const result = await createClaimChatAction()
      if (result.success && result.session) {
        setMessages([])
        setCurrentSessionId(result.session.id)
        setCurrentSession(result.session)
        setActiveSession('claim', result.session.id)
      } else {
        toast.error(result.error || 'Failed to create new chat')
      }
    }
  }

  const handleSendMessage = async (content: string, files: File[]) => {
    if (!currentSessionId) {
      toast.error('No active session')
      return
    }

    let fileIds: string[] = []

    // If in claim mode and files are attached, upload them first
    if (mode === 'claim' && files.length > 0) {
      setIsUploading(true)

      try {
        const formData = new FormData()
        files.forEach((file) => {
          formData.append('files', file)
        })

        const result = await uploadFilesAction(formData)

        if (!result.success || !result.files) {
          toast.error(result.error || 'Failed to upload files')
          setIsUploading(false)
          return
        }

        // Upload successful - store uploaded file metadata
        setUploadedFiles((prev) => [...prev, ...result.files!])
        // Store both path and URL - path for database, but we can also use URL for preview
        fileIds = result.files.map((f) => f.path)
        
        // Store file URLs in a map for quick access (optional optimization)
        result.files.forEach((file) => {
          // Store URL temporarily if needed
          sessionStorage.setItem(`file_url_${file.path}`, file.url)
        })
        toast.success(`${result.files.length} file(s) uploaded successfully!`)

        setIsUploading(false)
      } catch (error) {
        toast.error('An unexpected error occurred during upload')
        console.error('Upload error:', error)
        setIsUploading(false)
        return
      }
    }

    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      attached_file_ids: fileIds.length > 0 ? fileIds : undefined,
    }

    // Add to local state
    setMessages((prev) => [...prev, userMessage])

    // Save to appropriate storage
    if (mode === 'policy') {
      addMessageToPolicyChat(currentSessionId, userMessage)
    } else if (mode === 'claim') {
      await addClaimMessageAction(
        currentSessionId,
        content,
        'user',
        fileIds.length > 0 ? fileIds : undefined
      )
    }

    // Process message with OpenAI
    setIsAiProcessing(true)
    
    if (mode === 'claim') {
      // Use OpenAI for claim mode (database-backed)
      try {
        const result = await processChatMessageAction(
          currentSessionId,
          content,
          fileIds.length > 0 ? fileIds : undefined
        )

        if (result.success && result.message) {
          setMessages((prev) => [...prev, result.message!])
          
          // Reload session to check if claim was created (session might be archived now)
          if (currentSessionId && mode === 'claim') {
            try {
              const sessionResult = await loadChatSessionAction(currentSessionId)
              if (sessionResult.success && sessionResult.session) {
                setCurrentSession(sessionResult.session)
              }
            } catch (error) {
              console.error('Error reloading session:', error)
            }
          }
        } else {
          toast.error(result.error || 'Failed to get AI response')
        }
      } catch (error) {
        console.error('Error processing message:', error)
        toast.error('An error occurred while processing your message')
      } finally {
        setIsAiProcessing(false)
      }
    } else {
      // For policy mode, use OpenAI but save to localStorage
      try {
        // Prepare messages for OpenAI (convert to simple format)
        const messageHistory = messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))

        const result = await processPolicyMessageAction([
          ...messageHistory,
          { role: 'user', content },
        ])

        if (result.success && result.content) {
          const aiMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: result.content,
            timestamp: new Date(),
          }

          setMessages((prev) => [...prev, aiMessage])
          addMessageToPolicyChat(currentSessionId, aiMessage)
        } else {
          toast.error(result.error || 'Failed to get AI response')
        }
      } catch (error) {
        console.error('Error processing message:', error)
        toast.error('An error occurred while processing your message')
      } finally {
        setIsAiProcessing(false)
      }
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt, [])
  }

  return (
    <div className="flex h-screen bg-white dark:bg-black overflow-hidden">
      <ChatSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentMode={mode}
        currentSessionId={currentSessionId}
        onSessionSelect={loadSession}
        profile={profile}
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
              <ModeSwitch mode={mode} onModeChange={handleModeChange} />
            </div>

            {/* New Chat Button */}
            <NewChatButton onClick={handleNewChat} />
          </div>

          {/* Mode Switch - visible on mobile, centered */}
          <div className="md:hidden absolute left-1/2 -translate-x-1/2">
            <ModeSwitch mode={mode} onModeChange={handleModeChange} />
          </div>

          <UserMenu profile={profile} />
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          mode={mode}
          onSuggestedPrompt={handleSuggestedPrompt}
          isLoading={isAiProcessing}
        />

        {/* Input */}
        <ChatInput
          mode={mode}
          onSendMessage={handleSendMessage}
          isUploading={isUploading}
          disabled={mode === 'claim' && currentSession?.is_archived === true}
          disabledMessage={mode === 'claim' && currentSession?.is_archived === true 
            ? "This claim has been successfully filed. This chat session is now closed. To file another claim, please create a new chat session."
            : undefined}
        />

        {/* Floating Files Button - Top Left (after sidebar toggle) */}
        {uploadedFiles.length > 0 && (
          <button
            onClick={() => setIsFilesDialogOpen(true)}
            className="fixed top-20 left-6 md:left-20 bg-black dark:bg-white hover:bg-black/90 dark:hover:bg-white/90 text-white dark:text-black px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium group z-50 border-2 border-black/10 dark:border-white/10"
          >
            <FileStack className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm">
              {uploadedFiles.length}{' '}
              {uploadedFiles.length === 1 ? 'File' : 'Files'}
            </span>
            <div className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {uploadedFiles.length}
            </div>
          </button>
        )}

        {/* Uploaded Files Dialog */}
        <UploadedFilesDialog
          open={isFilesDialogOpen}
          onOpenChange={setIsFilesDialogOpen}
          files={uploadedFiles}
          onClearAll={() => {
            setUploadedFiles([])
            setIsFilesDialogOpen(false)
          }}
        />

        {/* Mode Switch Dialog */}
        <ModeSwitchDialog
          open={showModeSwitchDialog}
          onOpenChange={setShowModeSwitchDialog}
          currentMode={mode}
          targetMode={pendingMode}
          onSave={async () => {
            if (pendingMode) {
              await switchMode(pendingMode)
              setShowModeSwitchDialog(false)
              setPendingMode(null)
            }
          }}
          onDiscard={() => {
            if (pendingMode) {
              switchMode(pendingMode)
              setShowModeSwitchDialog(false)
              setPendingMode(null)
            }
          }}
        />
      </div>
    </div>
  )
}
