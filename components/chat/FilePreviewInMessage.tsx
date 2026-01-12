'use client'

import { useState, useEffect } from 'react'
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface FilePreviewInMessageProps {
  fileId: string
}

export function FilePreviewInMessage({ fileId }: FilePreviewInMessageProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileType, setFileType] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadFile() {
      try {
        // First check if we have a cached URL from sessionStorage
        const cachedUrl = sessionStorage.getItem(`file_url_${fileId}`)
        if (cachedUrl) {
          setFileUrl(cachedUrl)
          setFileName(fileId.split('/').pop() || 'file')
          const ext = fileId.split('.').pop()?.toLowerCase() || ''
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            setFileType('image')
          } else if (ext === 'pdf') {
            setFileType('pdf')
          } else {
            setFileType('file')
          }
          setLoading(false)
          return
        }

        const supabase = createClient()
        
        // fileId is the path in the bucket (e.g., "userId/timestamp-filename.pdf")
        // Bucket name is 'claim-documents'
        const bucket = 'claim-documents'
        const path = fileId
        
        // Try to get signed URL first (works for private buckets)
        const { data: signedData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600) // 1 hour expiry
        
        if (signedData?.signedUrl && !signedError) {
          setFileUrl(signedData.signedUrl)
          // Cache the URL for future use
          sessionStorage.setItem(`file_url_${fileId}`, signedData.signedUrl)
        } else {
          // Fallback to public URL if signed URL fails
          const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path)
          if (publicData?.publicUrl) {
            setFileUrl(publicData.publicUrl)
            sessionStorage.setItem(`file_url_${fileId}`, publicData.publicUrl)
          } else {
            console.error('Failed to get URL for file:', path, 'Error:', signedError)
            setError(true)
            setLoading(false)
            return
          }
        }
        
        setFileName(path.split('/').pop() || 'file')
        
        // Determine file type from extension
        const ext = path.split('.').pop()?.toLowerCase() || ''
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          setFileType('image')
        } else if (ext === 'pdf') {
          setFileType('pdf')
        } else {
          setFileType('file')
        }
      } catch (err) {
        console.error('Error loading file:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadFile()
  }, [fileId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg p-2">
        <Loader2 className="h-4 w-4 animate-spin text-black/60 dark:text-white/60" />
        <span className="text-xs text-black/60 dark:text-white/60">Loading...</span>
      </div>
    )
  }

  if (error || !fileUrl) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 dark:bg-red-500/20 rounded-lg p-2 border border-red-500/20">
        <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
        <span className="text-xs text-red-600 dark:text-red-400">File not found</span>
      </div>
    )
  }

  const isImage = fileType === 'image'
  const isPDF = fileType === 'pdf'

  return (
    <div className="relative group my-2">
      {isImage && fileUrl ? (
        // Full image preview - show actual image
        <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-2 hover:border-black/20 dark:hover:border-white/20 transition-all max-w-md">
          <div className="relative w-full rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 mb-2 flex items-center justify-center" style={{ minHeight: '200px' }}>
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-[500px] w-auto h-auto object-contain rounded-lg"
              style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
              crossOrigin="anonymous"
              onError={(e) => {
                console.error('Image load error for file:', fileId, 'URL:', fileUrl, e)
                setError(true)
                setLoading(false)
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', fileUrl)
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-black dark:text-white truncate" title={fileName}>
                {fileName}
              </p>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium inline-block mt-1 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                Image
              </span>
            </div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white underline ml-2"
            >
              Open
            </a>
          </div>
        </div>
      ) : (
        // File card for PDFs and other files
        <div className="flex items-start gap-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-3 hover:border-black/20 dark:hover:border-white/20 transition-all max-w-md">
          {/* Icon */}
          <div className="shrink-0">
            <div className="w-16 h-16 rounded-lg bg-linear-to-br from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 flex items-center justify-center border border-red-500/20 dark:border-red-500/30">
              {isPDF ? (
                <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />
              ) : (
                <ImageIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              )}
            </div>
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black dark:text-white truncate mb-1" title={fileName}>
              {fileName}
            </p>
            <span className={cn(
              "text-xs px-2 py-1 rounded font-medium inline-block",
              isPDF
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
            )}>
              {isPDF ? 'PDF Document' : 'File'}
            </span>
            <div className="mt-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Open in new tab →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
