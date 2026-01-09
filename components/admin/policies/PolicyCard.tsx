'use client'

import { Edit, Trash2, ToggleLeft, ToggleRight, Shield, Calendar, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Policy } from '@/types/policies'

const formatCurrency = (amount: number | null, currency: string | null) => {
  if (amount === null) return '-'
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency || ''
  return `${currencySymbol}${amount.toLocaleString()}`
}

interface PolicyCardProps {
  policy: Policy
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}

export function PolicyCard({
  policy,
  onEdit,
  onToggleActive,
  onDelete,
}: PolicyCardProps) {
  return (
    <div className="border border-black/10 dark:border-white/10 rounded-lg p-4 hover:border-black/20 dark:hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-black/5 dark:bg-white/5">
              <Shield className="h-5 w-5 text-black dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-black dark:text-white truncate">
                  {policy.name}
                </h3>
                <Badge
                  variant={policy.is_active ? 'default' : 'secondary'}
                  className={
                    policy.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60'
                  }
                >
                  {policy.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {policy.description && (
                <p className="text-sm text-black/60 dark:text-white/60 mt-1 line-clamp-2">
                  {policy.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {policy.coverage_items.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400"
              >
                <span>{item.name}</span>
                <span className="font-semibold">
                  {formatCurrency(item.limit, policy.currency)}
                </span>
              </span>
            ))}
          </div>

          {(policy.deductible !== null || policy.premium) && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-black/5 dark:bg-white/5 rounded-lg">
              {policy.deductible !== null && (
                <div>
                  <p className="text-xs text-black/60 dark:text-white/60 mb-1">Deductible</p>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    {formatCurrency(policy.deductible, policy.currency)}
                  </p>
                </div>
              )}
              {policy.premium && (
                <div>
                  <p className="text-xs text-black/60 dark:text-white/60 mb-1">Premium</p>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    {formatCurrency(policy.premium, policy.currency)}
                    {policy.premium_frequency && (
                      <span className="text-xs font-normal text-black/60 dark:text-white/60">
                        /{policy.premium_frequency === 'annually' ? 'yr' : policy.premium_frequency === 'monthly' ? 'mo' : 'qtr'}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {policy.policy_term_months && (
            <div className="flex flex-wrap gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5 text-black/70 dark:text-white/70">
                <Calendar className="h-3.5 w-3.5" />
                <span>Term: {policy.policy_term_months} months</span>
              </div>
            </div>
          )}

          {policy.exclusions && policy.exclusions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-black/60 dark:text-white/60 mb-2 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                Exclusions
              </p>
              <div className="flex flex-wrap gap-2">
                {policy.exclusions.slice(0, 3).map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-700 dark:text-red-400"
                  >
                    {item}
                  </span>
                ))}
                {policy.exclusions.length > 3 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-black/60 dark:text-white/60">
                    +{policy.exclusions.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-black/10 dark:border-white/10 text-xs text-black/40 dark:text-white/40">
            <span>
              Created {new Date(policy.created_at).toLocaleDateString()}
            </span>
            {policy.updated_at !== policy.created_at && (
              <span>
                Updated {new Date(policy.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleActive}
            title={policy.is_active ? 'Deactivate' : 'Activate'}
          >
            {policy.is_active ? (
              <ToggleRight className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title="Delete"
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
