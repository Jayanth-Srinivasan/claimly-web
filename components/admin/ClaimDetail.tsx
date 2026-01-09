'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle, MessageCircle } from 'lucide-react'
import { ClaimSummary } from './ClaimSummary'
import { ClaimChat } from './ClaimChat'
import { ModeSwitch } from '@/components/chat/ModeSwitch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ClaimMessage {
  id: string
  role: 'customer' | 'admin' | 'ai'
  content: string
  timestamp: Date
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

interface ClaimDetailProps {
  claim: Claim
  onSendMessage: (content: string, files: File[]) => void
  onUpdateStatus: (status: Claim['status']) => void
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

export function ClaimDetail({ claim, onSendMessage, onUpdateStatus }: ClaimDetailProps) {
  const [chatMode, setChatMode] = useState<'claimant' | 'ai'>('claimant')
  const status = statusConfig[claim.status]
  const StatusIcon = status.icon

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-black/10 dark:border-white/10 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-white">
              {claim.claimNumber}
            </h2>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
                status.className
              )}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {claim.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStatus('approved')}
                  className="text-green-600 border-green-600/20 hover:bg-green-600/10"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStatus('rejected')}
                  className="text-red-600 border-red-600/20 hover:bg-red-600/10"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mode Switch */}
        <div className="flex items-center gap-3">
          <MessageCircle className="h-4 w-4 text-black/60 dark:text-white/60" />
          <ModeSwitch
            mode={chatMode === 'claimant' ? 'claim' : 'policy'}
            onModeChange={(mode) => setChatMode(mode === 'claim' ? 'claimant' : 'ai')}
          />
          <span className="text-xs text-black/60 dark:text-white/60">
            {chatMode === 'claimant' ? 'Chatting with customer' : 'Getting AI assistance'}
          </span>
        </div>
      </div>

      {/* Claim Summary */}
      <ClaimSummary claim={claim} />

      {/* Chat Interface */}
      <ClaimChat messages={claim.messages} mode={chatMode} onSendMessage={onSendMessage} />
    </div>
  )
}
