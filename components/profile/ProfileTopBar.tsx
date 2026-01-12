'use client'

import { User } from 'lucide-react'
import { UserMenu } from '@/components/chat/UserMenu'
import type { Profile } from '@/types/auth'

interface ProfileTopBarProps {
  profile: Profile
}

export function ProfileTopBar({ profile }: ProfileTopBarProps) {
  return (
    <div className="sticky top-0 z-10 h-16 border-b border-black/10 dark:border-white/10 bg-white dark:bg-black flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-linear-to-br from-black to-black/70 dark:from-white dark:to-white/70 flex items-center justify-center shadow-sm">
          <User className="h-5 w-5 text-white dark:text-black" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">My Profile</h1>
          <p className="text-xs text-black/60 dark:text-white/60">Manage your account and preferences</p>
        </div>
      </div>

      <UserMenu profile={profile} />
    </div>
  )
}
