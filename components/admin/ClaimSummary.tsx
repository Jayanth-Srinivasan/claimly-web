'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, User, Calendar, DollarSign, FileText } from 'lucide-react'
import { DocumentsGrid } from './DocumentsGrid'

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
  status: 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid'
  amount: number
  currency: string
  submittedAt: Date
  description: string
  documents: ClaimDocument[]
}

interface ClaimSummaryProps {
  claim: Claim
}

export function ClaimSummary({ claim }: ClaimSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="border-b border-black/10 dark:border-white/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
      >
        <h3 className="text-sm font-semibold text-black dark:text-white">Claim Summary</h3>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-black/60 dark:text-white/60" />
        ) : (
          <ChevronDown className="h-4 w-4 text-black/60 dark:text-white/60" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Customer Info */}
          <div className="rounded-lg bg-black/2 dark:bg-white/2 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-black/60 dark:text-white/60" />
              <span className="font-medium text-black dark:text-white">Customer</span>
            </div>
            <div className="pl-6">
              <p className="font-semibold text-black dark:text-white">{claim.customerName}</p>
              <p className="text-sm text-black/60 dark:text-white/60">{claim.customerEmail}</p>
            </div>
          </div>

          {/* Claim Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60 mb-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Submitted</span>
              </div>
              <p className="text-sm font-medium text-black dark:text-white">
                {claim.submittedAt.toLocaleDateString()}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60 mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Amount</span>
              </div>
              <p className="text-sm font-medium text-black dark:text-white">
                {claim.currency} {claim.amount.toLocaleString()}
              </p>
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60 mb-1">
                <FileText className="h-3.5 w-3.5" />
                <span>Type</span>
              </div>
              <p className="text-sm font-medium text-black dark:text-white capitalize">
                {claim.type}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-medium text-black/60 dark:text-white/60 mb-2">
              Description
            </h4>
            <p className="text-sm text-black dark:text-white leading-relaxed">
              {claim.description}
            </p>
          </div>

          {/* Documents */}
          {claim.documents.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-black/60 dark:text-white/60 mb-3">
                Documents ({claim.documents.length})
              </h4>
              <DocumentsGrid documents={claim.documents} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
