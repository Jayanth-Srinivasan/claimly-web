'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Eye,
  Download
} from 'lucide-react'
import { ClaimChat } from './ClaimChat'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/auth'
import { updateClaimStatusAction } from '@/app/admin/claims/actions'

interface ClaimMessage {
  id: string
  role: 'customer' | 'admin' | 'ai'
  content: string
  timestamp: Date
  admin_only?: boolean | null
}

interface ClaimDocument {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: Date
}

interface Claim {
  id: string
  claimNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  type: 'travel' | 'medical' | 'baggage' | 'flight'
  status: 'pending' | 'approved' | 'rejected' | 'under-review'
  amount: number
  currency: string
  submittedAt: Date
  description: string
  documents: ClaimDocument[]
  messages: ClaimMessage[]
}

const statusConfig = {
  pending: {
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    label: 'Pending',
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
  'under-review': {
    icon: AlertCircle,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    label: 'Under Review',
  },
}

interface ClaimDetailPageProps {
  claimData: {
    claim: {
      id: string
      claim_number: string
      status: string
      total_claimed_amount: number
      currency: string | null
      submitted_at: string | null
      created_at: string | null
      incident_type: string
      incident_description: string
      profile: {
        email: string | null
        full_name: string | null
      } | null
    }
    documents: Array<{
      id: string
      name: string
      type: string
      url: string
      uploadedAt: Date
    }>
    messages: Array<{
      id: string
      role: 'customer' | 'admin' | 'ai'
      content: string
      timestamp: Date
      admin_only: boolean | null
    }>
  }
  profile: Profile
}

export function ClaimDetailPage({ claimData, profile: _profile }: ClaimDetailPageProps) {
  const router = useRouter()
  
  // Map database status to component status
  const mapStatus = (status: string): 'pending' | 'approved' | 'rejected' | 'under-review' => {
    const normalized = status.toLowerCase().replace('_', '-')
    if (['pending', 'approved', 'rejected', 'under-review'].includes(normalized)) {
      return normalized as 'pending' | 'approved' | 'rejected' | 'under-review'
    }
    return 'pending'
  }

  // Map database claim to component format
  const [claim, setClaim] = useState<Claim>(() => {
    const dbClaim = claimData.claim
    return {
      id: dbClaim.id,
      claimNumber: dbClaim.claim_number,
      customerId: dbClaim.profile?.email || 'unknown',
      customerName: dbClaim.profile?.full_name || dbClaim.profile?.email || 'Unknown Customer',
      customerEmail: dbClaim.profile?.email || '',
      type: (dbClaim.incident_type as 'travel' | 'medical' | 'baggage' | 'flight') || 'travel',
      status: mapStatus(dbClaim.status),
      amount: dbClaim.total_claimed_amount || 0,
      currency: dbClaim.currency || 'USD',
      submittedAt: dbClaim.submitted_at ? new Date(dbClaim.submitted_at) : new Date(dbClaim.created_at || Date.now()),
      description: dbClaim.incident_description || 'No description provided',
      documents: claimData.documents,
      messages: claimData.messages,
    }
  })

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

  const status = statusConfig[claim.status]
  const StatusIcon = status.icon

  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string, _files: File[]) => {
    if (!claim) return

    // Generate unique ID using crypto.randomUUID() for better uniqueness
    const adminMessageId = crypto.randomUUID()
    const newMessage: ClaimMessage = {
      id: adminMessageId,
      role: 'admin',
      content,
      timestamp: new Date(),
      admin_only: true,
    }

    // Update local state immediately with admin message
    setClaim((prevClaim) => ({ ...prevClaim, messages: [...prevClaim.messages, newMessage] }))
    setIsLoading(true)

    // Always call AI for response
    try {
      const { processAdminChatMessageAction } = await import('@/app/chat/actions')
      const messageHistory = claim.messages.map((msg) => ({
        role: msg.role === 'customer' ? 'user' : msg.role === 'admin' ? 'admin' : 'assistant',
        content: msg.content,
      }))

      const result = await processAdminChatMessageAction(
        claim.id,
        _profile.id,
        content,
        messageHistory
      )

      if (result.success && result.content) {
        // Generate unique ID for AI message
        const aiMessageId = crypto.randomUUID()
        const aiMessage: ClaimMessage = {
          id: aiMessageId,
          role: 'ai',
          content: result.content,
          timestamp: new Date(),
          admin_only: true,
        }

        // Only add the AI message, admin message was already added above
        setClaim((prevClaim) => ({ ...prevClaim, messages: [...prevClaim.messages, aiMessage] }))
      } else {
        console.error('Failed to get AI response:', result.error)
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: Claim['status']) => {
    if (!claim) return
    
    try {
      const result = await updateClaimStatusAction(claim.id, newStatus)
      
      if (result.success) {
        setClaim({ ...claim, status: newStatus })
      } else {
        console.error('Failed to update claim status:', result.error)
        // You might want to show a toast notification here
      }
    } catch (error) {
      console.error('Failed to update claim status:', error)
      // You might want to show a toast notification here
    }
  }

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
                    {claim.claimNumber}
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
                  {claim.customerName} • {claim.customerEmail}
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
                {claim.currency} {claim.amount.toLocaleString()}
              </p>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                <div>
                  <p className="text-xs text-black/60 dark:text-white/60">Type</p>
                  <p className="text-sm font-medium text-black dark:text-white capitalize mt-0.5">
                    {claim.type}
                  </p>
                </div>
                <div className="h-8 w-px bg-black/10 dark:bg-white/10" />
                <div>
                  <p className="text-xs text-black/60 dark:text-white/60">Submitted</p>
                  <p className="text-sm font-medium text-black dark:text-white mt-0.5">
                    {claim.submittedAt.toLocaleDateString()}
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
                {claim.description}
              </p>
            </div>

            {/* Documents */}
            {claim.documents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                  Submitted Documents ({claim.documents.length})
                </h3>
                <div className="space-y-2">
                  {claim.documents.map((doc) => {
                    const isImage = doc.type.startsWith('image/')
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
                              {doc.name}
                            </p>
                            <p className="text-xs text-black/40 dark:text-white/40">
                              {doc.uploadedAt.toLocaleDateString()}
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
          <ClaimChat messages={claim.messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
