'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UploadedFileCard } from './UploadedFileCard'
import type { UploadedFile } from '@/lib/supabase/storage'

interface UploadedFilesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: UploadedFile[]
  onClearAll: () => void
}

export function UploadedFilesDialog({
  open,
  onOpenChange,
  files,
  onClearAll,
}: UploadedFilesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-black dark:text-white">
                Uploaded Files
              </DialogTitle>
              <DialogDescription className="text-sm text-black/60 dark:text-white/60 mt-1">
                {files.length} {files.length === 1 ? 'file' : 'files'} uploaded successfully
              </DialogDescription>
            </div>
            <button
              onClick={onClearAll}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        </DialogHeader>

        {/* Files Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {files.map((file, index) => (
            <UploadedFileCard key={index} file={file} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
