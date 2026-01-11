'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilePreviewProps {
  file: File
  onRemove: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()
  return ext ? ext.toUpperCase() : 'FILE'
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const isImage = file.type.startsWith('image/')
  const isPDF = file.type === 'application/pdf'

  useEffect(() => {
    if (isImage) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [file, isImage, preview])

  return (
    <div className="relative group">
      <div className="flex items-start gap-3 bg-white dark:bg-black border-2 border-black/10 dark:border-white/10 rounded-xl p-3 hover:border-black/20 dark:hover:border-white/20 transition-all">
        {/* Preview/Icon */}
        <div className="shrink-0">
          {isImage && preview ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5">
              <Image
                src={preview}
                alt={file.name}
                fill
                className="object-cover"
                unoptimized
              />
              {/* File type badge */}
              <div className="absolute bottom-1 right-1 bg-black/80 dark:bg-white/80 text-white dark:text-black text-xs px-1.5 py-0.5 rounded font-semibold">
                {getFileExtension(file.name)}
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 flex items-center justify-center border border-red-500/20 dark:border-red-500/30">
              {isPDF ? (
                <div className="flex flex-col items-center">
                  <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">PDF</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ImageIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1">IMG</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-black dark:text-white truncate mb-1" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
            <span className="font-semibold">{formatFileSize(file.size)}</span>
            <span>•</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full font-medium",
              isImage
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
              {isImage ? 'Image' : 'PDF'}
            </span>
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="shrink-0 h-7 w-7 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-red-500/10 dark:hover:bg-red-500/20 border border-black/10 dark:border-white/10 hover:border-red-500/30 flex items-center justify-center transition-all group-hover:scale-110"
          title="Remove file"
        >
          <X className="h-4 w-4 text-black/60 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400" />
        </button>
      </div>
    </div>
  )
}
