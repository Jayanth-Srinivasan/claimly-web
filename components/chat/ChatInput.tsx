'use client'

import { useState, useRef } from 'react'
import { Send, Paperclip} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilePreview } from './FilePreview'

interface ChatInputProps {
  mode: 'policy' | 'claim'
  onSendMessage: (content: string, files: File[]) => void
}

export function ChatInput({ mode, onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!message.trim() && files.length === 0) return

    onSendMessage(message, files)
    setMessage('')
    setFiles([])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selectedFiles])
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-black/10 dark:border-white/10 bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {/* File Previews */}
        {files.length > 0 && (
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
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 h-11 w-11 rounded-xl"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${mode === 'policy' ? 'policies' : 'claims'}...`}
              className="w-full resize-none bg-black/5 dark:bg-white/5 border-0 rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 min-h-12 max-h-50 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
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
            disabled={!message.trim() && files.length === 0}
            size="icon"
            className="shrink-0 h-11 w-11 rounded-xl"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-xs text-black/40 dark:text-white/40 text-center">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
