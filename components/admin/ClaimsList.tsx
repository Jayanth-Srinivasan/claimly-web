'use client'

import { Search, Inbox } from 'lucide-react'
import { ClaimCard } from './ClaimCard'

interface ClaimDocument {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: Date
}

interface ClaimMessage {
  id: string
  role: 'customer' | 'admin' | 'ai'
  content: string
  timestamp: Date
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
  messages: ClaimMessage[]
}

interface ClaimsListProps {
  claims: Claim[]
  selectedClaimId: string | null
  onSelectClaim: (claimId: string) => void
}

export function ClaimsList({ claims, selectedClaimId, onSelectClaim }: ClaimsListProps) {
  if (claims.length === 0) {
    return (
      <div className="shrink-0 w-full md:w-95 border-r border-black/10 dark:border-white/10 bg-white dark:bg-black flex flex-col">
        <div className="p-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-lg font-semibold text-black dark:text-white mb-3">Claims</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search claims..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/5 dark:bg-white/5 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
              disabled
            />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Inbox className="h-8 w-8 text-black/40 dark:text-white/40" />
            </div>
            <p className="text-sm font-medium text-black dark:text-white mb-1">No claims yet</p>
            <p className="text-xs text-black/60 dark:text-white/60">
              Claims will appear here when customers submit them
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shrink-0 w-full md:w-95 border-r border-black/10 dark:border-white/10 bg-white dark:bg-black flex flex-col">
      <div className="p-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-black dark:text-white">Claims</h2>
          <span className="text-xs font-medium text-black/60 dark:text-white/60">
            {claims.length} total
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
          <input
            type="text"
            placeholder="Search claims..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/5 dark:bg-white/5 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {claims.map((claim) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            isActive={selectedClaimId === claim.id}
            onClick={() => onSelectClaim(claim.id)}
          />
        ))}
      </div>
    </div>
  )
}
