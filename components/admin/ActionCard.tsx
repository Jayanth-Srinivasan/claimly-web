'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionCardProps {
  title: string
  description: string
  icon: LucideIcon
  onClick?: () => void
  className?: string
}

export function ActionCard({ title, description, icon: Icon, onClick, className }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl p-6 border border-black/10 dark:border-white/10',
        'bg-white dark:bg-black',
        'hover:scale-[1.02] hover:shadow-lg transition-all duration-300',
        'text-left w-full',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-linear-to-br from-black to-black/80 dark:from-white dark:to-white/80 flex items-center justify-center shrink-0 shadow-sm">
          <Icon className="h-6 w-6 text-white dark:text-black" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-black/60 dark:text-white/60">{description}</p>
        </div>
      </div>
    </button>
  )
}
