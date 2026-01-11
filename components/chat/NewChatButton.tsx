'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NewChatButtonProps {
  onClick: () => void
}

export function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <Button onClick={onClick} variant="outline" size="sm" className="gap-2">
      <Plus className="h-4 w-4" />
      New Chat
    </Button>
  )
}
