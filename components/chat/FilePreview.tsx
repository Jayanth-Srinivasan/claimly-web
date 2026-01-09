'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilePreviewProps {
  file: File
  onRemove: () => void
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const isImage = file.type.startsWith('image/')

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
      <div
        className={cn(
          'flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden',
          isImage ? 'p-0' : 'px-3 py-2'
        )}
      >
        {isImage && preview ? (
          <Image
            src={preview}
            alt={file.name}
            width={80}
            height={80}
            className="h-20 w-20 object-cover"
            unoptimized
          />
        ) : (
          <>
            <FileText className="h-4 w-4 text-black/60 dark:text-white/60" />
            <span className="text-sm text-black dark:text-white truncate max-w-37.5">
              {file.name}
            </span>
          </>
        )}
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 h-5 w-5 bg-black dark:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3 text-white dark:text-black" />
      </button>
    </div>
  )
}
