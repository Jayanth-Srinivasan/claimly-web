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
import { sendChatMessage, submitClaim } from '@/lib/api/chat-api'
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
} from '@/app/chat/actions'
import { Button } from '@/components/ui/button'
import { useQuestioningStore } from '@/lib/stores/questioning-store'

interface ChatDashboardProps {
  profile: Profile
}

export function ChatDashboard({ profile }: ChatDashboardProps) {
  // Zustand store for questioning state
  const questioningStore = useQuestioningStore()

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

  // Mode switching dialog
  const [showModeSwitchDialog, setShowModeSwitchDialog] = useState(false)
  const [pendingMode, setPendingMode] = useState<'policy' | 'claim' | null>(
    null
  )

  // Claim submission state
  const [claimReadyForSubmission, setClaimReadyForSubmission] = useState(false)
  const [claimSubmitted, setClaimSubmitted] = useState(false)
  const [claimNumber, setClaimNumber] = useState<string | null>(null)

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

    // Get questioning state from store for claim mode
    const questioningState = mode === 'claim' && currentSession?.claim_id
      ? questioningStore.getState(currentSession.claim_id)
      : undefined

    // If in claim mode and files are attached, upload them with OCR processing
    if (mode === 'claim' && files.length > 0) {
      if (!currentSession?.claim_id) {
        toast.error('No active claim. Please describe your incident first.')
        return
      }

      setIsUploading(true)

      try {
        for (const file of files) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('claimId', currentSession.claim_id)

          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (result.success) {
            // Document uploaded and processed successfully
            const ocrResults = result.ocrResults

            toast.success(`${file.name} processed: ${ocrResults.document_type}`)

            // Add AI message about the document
            const aiDocMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I've received your ${ocrResults.document_type}. ${ocrResults.summary}${
                ocrResults.authenticity_score
                  ? `\n\nAuthenticity score: ${ocrResults.authenticity_score}/100`
                  : ''
              }`,
              timestamp: new Date(),
              analysis: ocrResults,
            }
            setMessages((prev) => [...prev, aiDocMessage])

            // Show risk flags as warnings
            if (result.riskFlags && result.riskFlags.length > 0) {
              result.riskFlags.forEach((flag: string) => {
                toast.warning(flag, { duration: 5000 })
              })
            }

            fileIds.push(result.document.id)
          } else {
            // Upload failed
            toast.error(`${file.name}: ${result.error || 'Upload failed'}`)

            if (result.riskFlags && result.riskFlags.length > 0) {
              result.riskFlags.forEach((flag: string) => {
                toast.warning(flag, { duration: 5000 })
              })
            }

            setIsUploading(false)
            return
          }
        }

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

    // Add to local state immediately for instant UI feedback
    setMessages((prev) => [...prev, userMessage])

    // Add user message to questioning store for claim mode
    if (mode === 'claim' && currentSession?.claim_id) {
      questioningStore.addConversationTurn(currentSession.claim_id, 'user', content)
    }

    // Call backend API for BOTH modes
    try {
      const response = await sendChatMessage({
        sessionId: currentSessionId,
        message: content,
        mode: mode,
        attachedFileIds: fileIds,
        claimId: currentSession?.claim_id || undefined,
        questioningState: questioningState // Send questioning state to server
      })

      if (!response.success) {
        toast.error(response.error || 'Failed to send message')
        return
      }

      // Create AI response message
      const aiMessage: Message = {
        id: response.data!.messageId,
        role: 'assistant',
        content: response.data!.aiMessage,
        timestamp: new Date(),
        analysis: response.data!.ruleValidation,
      }

      setMessages((prev) => [...prev, aiMessage])

      // Add AI response to questioning store for claim mode
      if (mode === 'claim' && currentSession?.claim_id) {
        questioningStore.addConversationTurn(currentSession.claim_id, 'assistant', aiMessage.content)

        // Update the full questioning state if returned from server
        if (response.data!.updatedQuestioningState) {
          questioningStore.updateState(currentSession.claim_id, response.data!.updatedQuestioningState)
        }
      }

      // IMPORTANT: Save messages based on mode (only when AI responds)
      if (mode === 'policy') {
        // Save to localStorage for policy mode
        addMessageToPolicyChat(currentSessionId, userMessage)
        addMessageToPolicyChat(currentSessionId, aiMessage)
      } else {
        // Save to database for claim mode
        await addClaimMessageAction(currentSessionId, content, 'user', fileIds.length > 0 ? fileIds : undefined)
        await addClaimMessageAction(
          currentSessionId,
          aiMessage.content,
          'assistant',
          undefined
        )

        // Check if claim is ready for submission
        if (response.data!.claimReadyForSubmission) {
          setClaimReadyForSubmission(true)
          toast.success('Your claim is ready for submission!')
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message. Please try again.')
    }
  }

  // Handle claim submission (only enabled after AI validates)
  const handleSubmitClaim = async () => {
    if (!currentSessionId || !claimReadyForSubmission || !currentSession?.claim_id) {
      toast.error('Claim is not ready for submission')
      return
    }

    try {
      const result = await submitClaim({
        sessionId: currentSessionId,
        claimId: currentSession.claim_id
      })

      if (result.success && result.data) {
        setClaimSubmitted(true)
        setClaimNumber(result.data.claimNumber)
        toast.success(`Claim ${result.data.claimNumber} submitted successfully!`)
      } else {
        toast.error(result.error || 'Failed to submit claim')
      }
    } catch (error) {
      toast.error('Failed to submit claim')
      console.error('Claim submission error:', error)
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
        />

        {/* Input */}
        <ChatInput
          mode={mode}
          onSendMessage={handleSendMessage}
          isUploading={isUploading}
          disabled={claimSubmitted}
        />

        {/* Submit Claim Button - Only shown in claim mode when ready */}
        {mode === 'claim' && claimReadyForSubmission && !claimSubmitted && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
            <Button
              onClick={handleSubmitClaim}
              size="lg"
              className="shadow-lg bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90"
            >
              Submit Claim
            </Button>
          </div>
        )}

        {/* Claim Submission Success Modal */}
        {claimSubmitted && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black p-8 rounded-xl shadow-2xl max-w-md w-full border border-black/10 dark:border-white/10">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
                  Claim Submitted!
                </h2>
                <p className="text-black/60 dark:text-white/60 mb-4">
                  Your claim has been submitted successfully.
                </p>
                {claimNumber && (
                  <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4 mb-6">
                    <p className="text-sm text-black/60 dark:text-white/60 mb-1">
                      Claim Number
                    </p>
                    <p className="text-lg font-bold text-black dark:text-white">
                      {claimNumber}
                    </p>
                  </div>
                )}
                <p className="text-sm text-black/60 dark:text-white/60 mb-6">
                  We will review your claim and get back to you soon. You can track the status in your dashboard.
                </p>
                <Button
                  onClick={() => window.location.href = '/chat'}
                  className="w-full"
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

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
