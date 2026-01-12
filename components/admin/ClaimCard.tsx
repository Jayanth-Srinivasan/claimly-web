'use client'

import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Claim {
  id: string
  claimNumber: string
  customerId?: string
  customerName: string
  customerEmail?: string
  type?: string
  status: 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid'
  amount: number
  currency: string
  submittedAt: Date
  description?: string
  documents?: any[]
  messages?: any[]
}

interface ClaimCardProps {
  claim: Claim
  isActive: boolean
  onClick: () => void
}

const statusConfig: Record<Claim['status'], { icon: any; className: string; label: string }> = {
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

export function ClaimCard({ claim, isActive, onClick }: ClaimCardProps) {
  const status = statusConfig[claim.status] ?? statusConfig.pending
  const StatusIcon = status.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all duration-200',
        'hover:bg-black/2 dark:hover:bg-white/2',
        isActive
          ? 'border-black dark:border-white bg-black/3 dark:bg-white/3'
          : 'border-black/10 dark:border-white/10'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-black dark:text-white truncate">
            {claim.claimNumber}
          </p>
          <p className="text-xs text-black/60 dark:text-white/60 truncate mt-0.5">
            {claim.customerName}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border shrink-0',
            status.className
          )}
        >
          <StatusIcon className="h-3 w-3" />
          <span className="hidden sm:inline">{status.label}</span>
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-black dark:text-white">
          {claim.currency} {claim.amount.toLocaleString()}
        </span>
        <span className="text-black/40 dark:text-white/40">
          {claim.submittedAt.toLocaleDateString()}
        </span>
      </div>
    </button>
  )
}
