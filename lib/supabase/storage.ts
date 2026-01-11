import { createClient } from './server'

const BUCKET_NAME = 'claim-documents'

export interface UploadedFile {
  filename: string
  path: string
  url: string
  type: string
  size: number
  uploaded_at: string
}

/**
 * Sanitize filename to remove special characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

/**
 * Generate storage path for uploaded file
 */
function generateStoragePath(userId: string, filename: string): string {
  const timestamp = Date.now()
  const sanitized = sanitizeFilename(filename)
  return `${userId}/${timestamp}-${sanitized}`
}

/**
 * Validate file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
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
      error: 'Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed',
    }
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' }
  }

  return { valid: true }
}

/**
 * Upload a single file to storage bucket
 */
export async function uploadFile(
  file: File,
  userId: string
): Promise<UploadedFile> {
  console.log('[Storage] Starting upload:', {
    filename: file.name,
    size: file.size,
    type: file.type,
    userId,
  })

  const supabase = await createClient()
  const path = generateStoragePath(userId, file.name)

  console.log('[Storage] Generated path:', path)

  // Upload file to storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('[Storage] Upload failed:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  console.log('[Storage] Upload successful:', data)

  // Generate signed URL (1 year expiry)
  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  if (urlError || !urlData?.signedUrl) {
    console.error('[Storage] Failed to generate signed URL:', urlError)
    throw new Error('Failed to generate signed URL')
  }

  console.log('[Storage] Generated signed URL successfully')

  const result = {
    filename: file.name,
    path: path,
    url: urlData.signedUrl,
    type: file.type,
    size: file.size,
    uploaded_at: new Date().toISOString(),
  }

  console.log('[Storage] Upload complete:', result)

  return result
}

/**
 * Upload multiple files to storage bucket
 */
export async function uploadFiles(
  files: File[],
  userId: string
): Promise<UploadedFile[]> {
  const uploads = await Promise.all(files.map((file) => uploadFile(file, userId)))
  return uploads
}

/**
 * Delete a file from storage bucket
 */
export async function deleteFile(path: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}
