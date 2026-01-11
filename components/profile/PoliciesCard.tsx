'use client'

import { Shield, Calendar, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { UserPolicyWithPolicy, CoverageItem } from '@/types/user-policies'

interface PoliciesCardProps {
  userPolicies: UserPolicyWithPolicy[]
}

export function PoliciesCard({ userPolicies }: PoliciesCardProps) {
  const activePolicies = userPolicies.filter((p) => p.is_active && p.status === 'active')

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">My Insurance Policies</h2>
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {activePolicies.length} Active
        </Badge>
      </div>

      {activePolicies.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Shield className="w-12 h-12 mx-auto text-black/20 dark:text-white/20 mb-3" />
          <p className="text-black/60 dark:text-white/60">No active policies</p>
          <button className="mt-4 text-primary hover:underline">Browse Policies</button>
        </div>
      ) : (
        <div className="space-y-4">
          {activePolicies.map((userPolicy) => (
            <div
              key={userPolicy.id}
              className="border border-black/10 dark:border-white/10 rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              {/* Policy Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{userPolicy.policy_name}</h3>
                  {userPolicy.policy?.description && (
                    <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                      {userPolicy.policy.description}
                    </p>
                  )}
                </div>
                <Badge
                  className={
                    userPolicy.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                  }
                >
                  {userPolicy.status}
                </Badge>
              </div>

              {/* Policy Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-black/40 dark:text-white/40" />
                  <div>
                    <div className="text-black/60 dark:text-white/60">Enrolled</div>
                    <div className="font-medium">
                      {new Date(userPolicy.enrolled_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {userPolicy.expires_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-black/40 dark:text-white/40" />
                    <div>
                      <div className="text-black/60 dark:text-white/60">Expires</div>
                      <div className="font-medium">
                        {new Date(userPolicy.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {userPolicy.total_premium && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-black/40 dark:text-white/40" />
                    <div>
                      <div className="text-black/60 dark:text-white/60">Premium</div>
                      <div className="font-medium">
                        ${userPolicy.total_premium}/{userPolicy.currency}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Coverage Items with Usage */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-black/60 dark:text-white/60">
                  Coverage & Usage
                </div>
                {(userPolicy.coverage_items as CoverageItem[]).map((item, idx) => {
                  const usagePercent = (item.used_limit / item.total_limit) * 100
                  const remainingLimit = item.total_limit - item.used_limit

                  return (
                    <div key={idx} className="bg-black/5 dark:bg-white/5 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-sm text-black/60 dark:text-white/60">
                          ${remainingLimit.toLocaleString()} remaining
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            usagePercent > 80
                              ? 'bg-red-500'
                              : usagePercent > 50
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-1 text-xs text-black/50 dark:text-white/50">
                        <span>
                          Used: ${item.used_limit.toLocaleString()} of $
                          {item.total_limit.toLocaleString()}
                        </span>
                        <span>{usagePercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                <button className="text-sm text-primary hover:underline">View Details</button>
                <span className="text-black/20 dark:text-white/20">•</span>
                <button className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white">
                  Download Policy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
