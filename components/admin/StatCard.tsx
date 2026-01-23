'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  className?: string
}

export function StatCard({ label, value, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-6 border border-black/10 dark:border-white/10',
        'bg-linear-to-br from-black/2 to-black/5 dark:from-white/2 dark:to-white/5',
        'hover:shadow-md transition-shadow duration-300',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-black/60 dark:text-white/60 mb-1">{label}</p>
          <p className="text-3xl font-bold text-black dark:text-white">{value}</p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <Icon className="h-6 w-6 text-black/60 dark:text-white/60" />
        </div>
      </div>
    </div>
  )
}
