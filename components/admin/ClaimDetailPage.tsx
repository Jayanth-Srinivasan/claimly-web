'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MessageCircle,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Eye,
  Download
} from 'lucide-react'
import { ClaimChat } from './ClaimChat'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  getClaimByIdAction,
  getClaimChatMessagesAction,
  sendAdminClaimMessageAction,
  updateClaimStatusAction
} from '@/app/admin/actions'
import type { Profile } from '@/types/auth'

interface ClaimMessage {
  id: string
  role: 'customer' | 'admin' | 'ai'
  content: string
  timestamp: Date
}

const statusConfig: Record<
  'draft' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid',
  { icon: any; className: string; label: string }
> = {
  draft: {
    icon: Clock,
    className: 'bg-black/5 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10',
    label: 'Draft',
  },
  pending: {
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    label: 'Pending',
  },
  under_review: {
    icon: AlertCircle,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    label: 'Under Review',
  },
  approved: {
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    label: 'Rejected',
  },
  paid: {
    icon: CheckCircle,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    label: 'Paid',
  },
}

interface ClaimDetailPageProps {
  claimId: string
  profile: Profile
}

export function ClaimDetailPage({ claimId, profile: _profile }: ClaimDetailPageProps) {
  const router = useRouter()
  const [claim, setClaim] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [chatMode, setChatMode] = useState<'claimant' | 'ai'>('claimant')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Load claim data on mount
  useEffect(() => {
    loadClaimData()
  }, [claimId])

  const loadClaimData = async () => {
    setLoading(true)

    // Fetch claim details
    const claimResult = await getClaimByIdAction(claimId)
    if (claimResult.success && claimResult.claim) {
      setClaim(claimResult.claim)

      // Fetch messages if chat session exists
      if (claimResult.claim.chat_sessions?.id) {
        const messagesResult = await getClaimChatMessagesAction(claimResult.claim.chat_sessions.id)
        if (messagesResult.success && messagesResult.messages) {
          setMessages(messagesResult.messages)
        }
      }
    } else {
      toast.error(claimResult.error || 'Failed to load claim')
    }

    setLoading(false)
  }

  const handleSendMessage = async (content: string, _files: File[]) => {
    if (!claim?.chat_sessions?.id || sending) return

    setSending(true)

    try {
      // Send message with admin_only flag based on chat mode
      const isAIQuery = chatMode === 'ai'

      const result = await sendAdminClaimMessageAction(
        claim.chat_sessions.id,
        content,
        isAIQuery
      )

      if (result.success) {
        // Reload messages to get the latest
        await loadClaimData()

        if (isAIQuery && result.aiResponse) {
          toast.success('AI response received')
        } else {
          toast.success('Message sent to claimant')
        }
      } else {
        toast.error(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }

    setSending(false)
  }

  const handleUpdateStatus = async (
    newStatus: 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid'
  ) => {
    if (!claim) return

    const result = await updateClaimStatusAction(claimId, newStatus)
    if (result.success && result.claim) {
      setClaim(result.claim)
      toast.success(`Claim status updated to ${newStatus}`)
    } else {
      toast.error(result.error || 'Failed to update status')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-black">
        <div className="h-12 w-12 border-4 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin mb-4" />
        <p className="text-black/60 dark:text-white/60">Loading claim details...</p>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-black">
        <p className="text-xl font-semibold text-black dark:text-white mb-4">Claim not found</p>
        <Button onClick={() => router.push('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const status = statusConfig[claim.status as keyof typeof statusConfig] ?? statusConfig.pending
  const StatusIcon = status.icon

  // Convert messages to ClaimMessage format and filter by chat mode
  const claimMessages: ClaimMessage[] = messages.map(msg => ({
    id: msg.id,
    role: msg.role === 'assistant' ? 'ai' : msg.admin_only ? 'admin' : 'customer',
    content: msg.content,
    timestamp: new Date(msg.created_at)
  }))

  // Filter messages based on chat mode
  const filteredMessages = claimMessages.filter(msg => {
    if (chatMode === 'ai') {
      // Show only admin and AI messages (admin_only = true)
      return messages.find(m => m.id === msg.id)?.admin_only === true
    } else {
      // Show claimant conversation (admin_only = false or null)
      return messages.find(m => m.id === msg.id)?.admin_only !== true
    }
  })

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="shrink-0 border-b border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <div className="px-6 py-4">
          {/* Top Row: Back button, Claim info, Status, Actions */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/admin')}
                className="shrink-0 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-lg md:text-xl font-bold text-black dark:text-white">
                    {claim.claim_number}
                  </h1>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                      status.className
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-black/60 dark:text-white/60 mt-0.5">
                  {claim.profiles?.full_name || 'Unknown'} • {claim.profiles?.email || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {claim.status === 'pending' && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus('rejected')}
                  className="text-red-600 border-red-600/20 hover:bg-red-600/10"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus('approved')}
                  className="bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Approve
                </Button>
              </div>
            )}
          </div>

          {/* Mode Switch */}
          <div className="flex items-center gap-3 pb-1">
            <MessageCircle className="h-4 w-4 text-black/40 dark:text-white/40" />
            <div className="inline-flex items-center gap-1 bg-black/4 dark:bg-white/4 rounded-lg p-1 border border-black/5 dark:border-white/5">
              <button
                onClick={() => setChatMode('claimant')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  chatMode === 'claimant'
                    ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                )}
              >
                Chat with Claimant
              </button>
              <button
                onClick={() => setChatMode('ai')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  chatMode === 'ai'
                    ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                )}
              >
                Chat with AI
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar: Claim Summary */}
        <div className="w-80 xl:w-96 border-r border-black/10 dark:border-white/10 bg-linear-to-b from-black/1 to-transparent dark:from-white/1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Claim Amount */}
            <div className="rounded-xl bg-linear-to-br from-black/3 to-black/1 dark:from-white/3 dark:to-white/1 border border-black/5 dark:border-white/5 p-6">
              <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60 mb-2">
                <DollarSign className="h-4 w-4" />
                <span>Claim Amount</span>
              </div>
              <p className="text-3xl font-bold text-black dark:text-white">
                {claim.currency} {Number(claim.total_claimed_amount).toLocaleString()}
              </p>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                <div>
                  <p className="text-xs text-black/60 dark:text-white/60">Type</p>
                  <p className="text-sm font-medium text-black dark:text-white capitalize mt-0.5">
                    {claim.incident_type}
                  </p>
                </div>
                <div className="h-8 w-px bg-black/10 dark:bg-white/10" />
                <div>
                  <p className="text-xs text-black/60 dark:text-white/60">Submitted</p>
                  <p className="text-sm font-medium text-black dark:text-white mt-0.5">
                    {new Date(claim.submitted_at || claim.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                Claim Description
              </h3>
              <p className="text-sm text-black/80 dark:text-white/80 leading-relaxed">
                {claim.incident_description}
              </p>
            </div>

            {/* Documents */}
            {claim.claim_documents && claim.claim_documents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                  Submitted Documents ({claim.claim_documents.length})
                </h3>
                <div className="space-y-2">
                  {claim.claim_documents.map((doc: any) => {
                    const isImage = doc.mime_type?.startsWith('image/')
                    return (
                      <div
                        key={doc.id}
                        className="group rounded-lg border border-black/10 dark:border-white/10 p-3 hover:bg-black/2 dark:hover:bg-white/2 transition-all hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                            {isImage ? (
                              <ImageIcon className="h-5 w-5 text-black/60 dark:text-white/60" />
                            ) : (
                              <FileText className="h-5 w-5 text-black/60 dark:text-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate">
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-black/40 dark:text-white/40">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors">
                              <Eye className="h-4 w-4 text-black/60 dark:text-white/60" />
                            </button>
                            <button className="h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors">
                              <Download className="h-4 w-4 text-black/60 dark:text-white/60" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black">
          <ClaimChat messages={filteredMessages} mode={chatMode} onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}
