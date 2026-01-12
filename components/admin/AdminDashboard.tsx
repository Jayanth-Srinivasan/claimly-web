'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Clock, CheckCircle, XCircle, FileText, Settings } from 'lucide-react'
import { TopBar } from './TopBar'
import { StatCard } from './StatCard'
import { ActionCard } from './ActionCard'
import { ClaimCard } from './ClaimCard'
import { getAllClaimsAction, getClaimStatsAction } from '@/app/admin/actions'
import type { Profile } from '@/types/auth'

interface AdminDashboardProps {
  profile: Profile
}

export function AdminDashboard({ profile }: AdminDashboardProps) {
  const router = useRouter()
  const [claims, setClaims] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)

  // Load claims and stats on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    // Fetch claims
    const claimsResult = await getAllClaimsAction()
    if (claimsResult.success && claimsResult.claims) {
      setClaims(claimsResult.claims)
    }

    // Fetch stats
    const statsResult = await getClaimStatsAction()
    if (statsResult.success && statsResult.stats) {
      setStats(statsResult.stats)
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black overflow-hidden">
      <TopBar profile={profile} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Claims" value={stats.total} icon={Shield} />
            <StatCard label="Pending" value={stats.pending} icon={Clock} trend={{ value: 12, positive: true }} />
            <StatCard label="Approved" value={stats.approved} icon={CheckCircle} trend={{ value: 8, positive: true }} />
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

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-8 w-8 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin mb-3" />
                  <p className="text-black/60 dark:text-white/60">Loading claims...</p>
                </div>
              ) : claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-black/20 dark:text-white/20 mb-3" />
                  <p className="text-black/60 dark:text-white/60">No claims yet</p>
                  <p className="text-xs text-black/40 dark:text-white/40 mt-2">
                    Claims will appear here once users submit them
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {claims.map((claim) => (
                    <ClaimCard
                      key={claim.id}
                      claim={{
                        id: claim.id,
                        claimNumber: claim.claim_number,
                        customerId: claim.profiles?.custom_id || 'Unknown',
                        customerName: claim.profiles?.full_name || 'Unknown',
                        customerEmail: claim.profiles?.email || 'Unknown',
                        type: claim.incident_type,
                        status: claim.status,
                        amount: claim.total_claimed_amount,
                        currency: claim.currency,
                        submittedAt: new Date(claim.submitted_at || claim.created_at),
                        description: claim.incident_description,
                        documents: [],
                        messages: [],
                      }}
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
