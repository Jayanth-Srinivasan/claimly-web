'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileText, ExternalLink, Check, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UploadedFile } from '@/lib/supabase/storage'

interface UploadedFileCardProps {
  file: UploadedFile
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

function formatUploadTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function UploadedFileCard({ file }: UploadedFileCardProps) {
  const [copied, setCopied] = useState(false)
  const isImage = file.type.startsWith('image/')
  const isPDF = file.type === 'application/pdf'

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(file.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group border-2 border-black/10 dark:border-white/10 rounded-xl overflow-hidden hover:border-black/20 dark:hover:border-white/20 transition-all hover:shadow-lg">
      {/* Preview */}
      <div className="aspect-square bg-gradient-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 flex items-center justify-center relative overflow-hidden">
        {isImage ? (
          <>
            <Image
              src={file.url}
              alt={file.filename}
              width={300}
              height={300}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              unoptimized
            />
            {/* File extension badge on image */}
            <div className="absolute bottom-2 right-2 bg-black/80 dark:bg-white/80 text-white dark:text-black text-xs px-2 py-1 rounded-md font-bold backdrop-blur-sm">
              {getFileExtension(file.filename)}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20">
            <div className="flex flex-col items-center">
              <FileText className="h-16 w-16 text-red-600 dark:text-red-400 mb-2" />
              <span className="text-sm font-bold text-red-600 dark:text-red-400">PDF</span>
            </div>
          </div>
        )}

        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-black/80 dark:bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-white dark:bg-black rounded-full hover:scale-110 transition-transform shadow-lg"
            title="Open in new tab"
          >
            <ExternalLink className="h-5 w-5 text-black dark:text-white" />
          </a>
          <a
            href={file.url}
            download={file.filename}
            className="p-3 bg-white dark:bg-black rounded-full hover:scale-110 transition-transform shadow-lg"
            title="Download file"
          >
            <Download className="h-5 w-5 text-black dark:text-white" />
          </a>
          <button
            onClick={handleCopyUrl}
            className="p-3 bg-white dark:bg-black rounded-full hover:scale-110 transition-transform shadow-lg"
            title={copied ? 'Copied!' : 'Copy URL'}
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <svg
                className="h-5 w-5 text-black dark:text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* File Info */}
      <div className="p-3 bg-white dark:bg-black">
        <p className="text-sm font-medium text-black dark:text-white truncate mb-2" title={file.filename}>
          {file.filename}
        </p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
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
          <span className="text-xs text-black/40 dark:text-white/40">
            {formatUploadTime(file.uploaded_at)}
          </span>
        </div>
      </div>

      {/* Success Badge */}
      <div className="absolute top-2 left-2 bg-green-600 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
        <Check className="h-3 w-3" />
        Uploaded
      </div>
    </div>
  )
}
