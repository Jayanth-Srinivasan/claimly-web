'use client'

import { useRouter } from 'next/navigation'
import { Shield, Clock, CheckCircle, XCircle, FileText, Settings } from 'lucide-react'
import { TopBar } from './TopBar'
import { StatCard } from './StatCard'
import { ActionCard } from './ActionCard'
import { ClaimCard } from './ClaimCard'
import type { Profile } from '@/types/auth'
import type { Claim } from '@/lib/supabase/claims'

interface ClaimWithProfile extends Claim {
  profile: {
    email: string | null
    full_name: string | null
  } | null
}

interface AdminDashboardProps {
  profile: Profile
  claims: ClaimWithProfile[]
}

export function AdminDashboard({ profile, claims: dbClaims }: AdminDashboardProps) {
  const router = useRouter()
  
  // Map database status to ClaimCard expected status
  const mapStatus = (status: string): 'pending' | 'approved' | 'rejected' | 'under-review' => {
    const normalized = status.toLowerCase().replace('_', '-')
    if (['pending', 'approved', 'rejected', 'under-review'].includes(normalized)) {
      return normalized as 'pending' | 'approved' | 'rejected' | 'under-review'
    }
    return 'pending'
  }
  
  // Map database claims to the format expected by ClaimCard
  const claims = dbClaims.map((claim) => ({
    id: claim.id,
    claimNumber: claim.claim_number,
    customerName: claim.profile?.full_name || claim.profile?.email || 'Unknown Customer',
    status: mapStatus(claim.status),
    amount: claim.total_claimed_amount || 0,
    currency: claim.currency || 'USD',
    submittedAt: claim.submitted_at ? new Date(claim.submitted_at) : new Date(claim.created_at || Date.now()),
  }))

  // Calculate stats with null safety
  const stats = {
    total: (claims || []).length,
    pending: (claims || []).filter((c) => c.status === 'pending').length,
    approved: (claims || []).filter((c) => c.status === 'approved').length,
    rejected: (claims || []).filter((c) => c.status === 'rejected').length,
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black overflow-hidden">
      <TopBar profile={profile} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Claims" value={stats.total} icon={Shield} />
            <StatCard label="Pending" value={stats.pending} icon={Clock} />
            <StatCard label="Approved" value={stats.approved} icon={CheckCircle} />
            <StatCard label="Rejected" value={stats.rejected} icon={XCircle} />
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard
              title="Manage Policies"
              description="Add, edit, or remove insurance policies and coverage options"
              icon={FileText}
              onClick={() => router.push('/admin/policies')}
            />
            <ActionCard
              title="Coverage Types & Rules"
              description="Manage coverage types, questions, and validation rules"
              icon={Settings}
              onClick={() => router.push('/admin/coverage-types')}
            />
          </div>

          {/* Claims List */}
          <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-black">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-black dark:text-white">
                  All Claims ({claims.length})
                </h2>
              </div>

              {claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-black/20 dark:text-white/20 mb-3" />
                  <p className="text-black/60 dark:text-white/60">No claims yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {claims.map((claim) => (
                    <ClaimCard
                      key={claim.id}
                      claim={claim}
                      isActive={false}
                      onClick={() => router.push(`/admin/claims/${claim.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
