'use client'

import { User, LogOut, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import type { Profile } from '@/types/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface UserMenuProps {
  profile: Profile
}

export function UserMenu({ profile }: UserMenuProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors outline-none">
        <div className="h-8 w-8 rounded-full bg-black dark:bg-white flex items-center justify-center">
          <User className="h-4 w-4 text-white dark:text-black" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium text-black dark:text-white">{profile.full_name}</div>
          <div className="text-black/60 dark:text-white/60 text-xs">{profile.email}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <Settings className="h-4 w-4 mr-2" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
