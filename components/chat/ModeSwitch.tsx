'use client'

import { cn } from '@/lib/utils'
import { FileText, ClipboardList } from 'lucide-react'

interface ModeSwitchProps {
  mode: 'policy' | 'claim'
  onModeChange: (mode: 'policy' | 'claim') => void
}

export function ModeSwitch({ mode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-full p-1">
      <button
        onClick={() => onModeChange('policy')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
          mode === 'policy'
            ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
            : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
        )}
      >
        <FileText className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Policy</span>
      </button>
      <button
        onClick={() => onModeChange('claim')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
          mode === 'claim'
            ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
            : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
        )}
      >
        <ClipboardList className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Claim</span>
      </button>
    </div>
  )
}
