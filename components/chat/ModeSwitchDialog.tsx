'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ModeSwitchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMode: 'policy' | 'claim'
  targetMode: 'policy' | 'claim' | null
  onSave: () => void
  onDiscard: () => void
}

export function ModeSwitchDialog({
  open,
  onOpenChange,
  currentMode,
  targetMode,
  onSave,
  onDiscard,
}: ModeSwitchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch to {targetMode} mode?</DialogTitle>
          <DialogDescription>
            You have an active {currentMode} mode chat. What would you like to
            do?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDiscard}>
            Discard & Switch
          </Button>
          <Button onClick={onSave}>Save & Switch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
