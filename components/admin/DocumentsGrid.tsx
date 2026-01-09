'use client'

import { FileText, Image as ImageIcon, Download, Eye } from 'lucide-react'

interface ClaimDocument {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: Date
}

interface DocumentsGridProps {
  documents: ClaimDocument[]
}

export function DocumentsGrid({ documents }: DocumentsGridProps) {
  const isImage = (type: string) => type.startsWith('image/')

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="group relative rounded-lg border border-black/10 dark:border-white/10 overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="aspect-square bg-black/2 dark:bg-white/2 flex items-center justify-center">
            {isImage(doc.type) ? (
              <div className="w-full h-full bg-linear-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-black/40 dark:text-white/40" />
              </div>
            ) : (
              <FileText className="h-8 w-8 text-black/40 dark:text-white/40" />
            )}
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 dark:bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button className="h-8 w-8 rounded-full bg-white dark:bg-black flex items-center justify-center hover:scale-110 transition-transform">
              <Eye className="h-4 w-4 text-black dark:text-white" />
            </button>
            <button className="h-8 w-8 rounded-full bg-white dark:bg-black flex items-center justify-center hover:scale-110 transition-transform">
              <Download className="h-4 w-4 text-black dark:text-white" />
            </button>
          </div>

          {/* File name */}
          <div className="p-2 bg-white dark:bg-black border-t border-black/10 dark:border-white/10">
            <p className="text-xs font-medium text-black dark:text-white truncate">
              {doc.name}
            </p>
            <p className="text-[10px] text-black/40 dark:text-white/40">
              {doc.uploadedAt.toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
