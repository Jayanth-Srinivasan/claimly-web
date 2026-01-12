'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Paperclip, Camera } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { FilePreview } from './FilePreview'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Dynamically import to avoid SSR issues
const Webcam = dynamic(() => import('react-webcam'), { ssr: false })

interface ChatInputProps {
  mode: 'policy' | 'claim'
  onSendMessage: (content: string, files: File[]) => void
  isUploading?: boolean
  allowAttachments?: boolean
  disabled?: boolean
  disabledMessage?: string
}

export function ChatInput({ mode, onSendMessage, isUploading, allowAttachments = true, disabled = false, disabledMessage }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const webcamRef = useRef<any>(null)

  // Clear attachments when switching modes or when attachments are disabled
  useEffect(() => {
    if (mode === 'policy' || !allowAttachments) {
      setFiles([])
      setUploadError(null)
      setShowCamera(false)
    }
  }, [mode, allowAttachments])

  const handleSend = () => {
    if (disabled) return
    if (!message.trim() && files.length === 0) return

    onSendMessage(message, mode === 'claim' && allowAttachments ? files : [])
    setMessage('')
    setFiles([])
  }

  const validateFileLocal = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ]

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `${file.name}: Only images and PDF files are allowed`,
      }
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `${file.name}: File size must be less than 10MB`,
      }
    }

    return { valid: true }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const validFiles: File[] = []
    setUploadError(null)

    for (const file of selectedFiles) {
      const validation = validateFileLocal(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        setUploadError(validation.error || 'Invalid file')
        return
      }
    }

    setFiles((prev) => [...prev, ...validFiles])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `camera-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          })
          setFiles((prev) => [...prev, file])
          setShowCamera(false)
        })
        .catch((error) => {
          console.error('Failed to capture image:', error)
          setUploadError('Failed to capture image')
        })
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Camera Dialog */}
      {showCamera && (
        <Dialog open={showCamera} onOpenChange={setShowCamera}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Take a Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full rounded-lg"
                videoConstraints={{
                  facingMode: 'environment', // Back camera on mobile
                }}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCamera(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleCapture}>
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="border-t border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
        {/* Disabled Message */}
        {disabled && disabledMessage && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-900 dark:text-blue-100">
            {disabledMessage}
          </div>
        )}

        {/* Upload Loading State */}
        {allowAttachments && isUploading && !disabled && (
          <div className="flex items-center gap-2 px-2 py-1 text-sm text-black/60 dark:text-white/60">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            <span>Uploading files...</span>
          </div>
        )}

        {/* Upload Error */}
        {allowAttachments && uploadError && !disabled && (
          <div className="px-2 py-1 text-sm text-red-600 dark:text-red-400">
            {uploadError}
          </div>
        )}

        {/* File Previews */}
        {allowAttachments && files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2">
            {files.map((file, index) => (
              <FilePreview
                key={index}
                file={file}
                onRemove={() => handleRemoveFile(index)}
              />
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-3">
          {allowAttachments && mode === 'claim' && !disabled && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="shrink-0 h-11 w-11 rounded-xl"
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              {/* Camera button - only visible in claim mode */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowCamera(true)}
                disabled={isUploading}
                className="shrink-0 h-11 w-11 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Camera className="h-5 w-5 text-black/70 dark:text-white/70" />
              </Button>
            </>
          )}

          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? 'This chat session is closed. Create a new chat to file another claim.' : `Ask about ${mode === 'policy' ? 'policies' : 'claims'}...`}
              disabled={disabled}
              className="w-full resize-none bg-black/5 dark:bg-white/5 border-0 rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 min-h-12 max-h-50 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <span className="text-xs text-black/40 dark:text-white/40 mr-1">
                {message.length > 0 && `${message.length}`}
              </span>
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && files.length === 0)}
            size="icon"
            className="shrink-0 h-11 w-11 rounded-xl"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

          {!disabled && (
            <p className="text-xs text-black/40 dark:text-white/40 text-center">
              Press Enter to send, Shift + Enter for new line
            </p>
          )}
        </div>
      </div>
    </>
  )
}
