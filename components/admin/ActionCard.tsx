'use client'

import { LucideIcon, ArrowRight } from 'lucide-react'
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
        'group relative rounded-xl p-6 border border-black/10 dark:border-white/10',
        'bg-white dark:bg-black',
        'hover:border-black/20 dark:hover:border-white/20',
        'hover:bg-black/2 dark:hover:bg-white/2',
        'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5',
        'transition-all duration-200 ease-out',
        'text-left w-full',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon container */}
        <div className={cn(
          'h-12 w-12 rounded-lg',
          'bg-black/5 dark:bg-white/5',
          'group-hover:bg-black/10 dark:group-hover:bg-white/10',
          'flex items-center justify-center shrink-0',
          'transition-colors duration-200'
        )}>
          <Icon className="h-6 w-6 text-black/70 dark:text-white/70" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="text-lg font-semibold text-black dark:text-white">
              {title}
            </h3>
            <ArrowRight className={cn(
              'h-4 w-4 text-black/30 dark:text-white/30 shrink-0 mt-0.5',
              'group-hover:text-black/50 dark:group-hover:text-white/50',
              'group-hover:translate-x-1',
              'transition-all duration-200'
            )} />
          </div>
          <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}
