'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadFiles, validateFile } from '@/lib/supabase/storage'
import type { UploadedFile } from '@/lib/supabase/storage'

interface UploadResult {
  success: boolean
  files?: UploadedFile[]
  error?: string
}

/**
 * Upload files to Supabase Storage
 * Returns uploaded file metadata (filename, url, path, etc.)
 */
export async function uploadFilesAction(
  formData: FormData
): Promise<UploadResult> {
  console.log('[Upload Action] Starting upload process')

  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[Upload Action] Auth failed:', userError)
      return { success: false, error: 'Unauthorized' }
    }

    console.log('[Upload Action] User authenticated:', user.id)

    // Extract files from FormData
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      console.log('[Upload Action] FormData entry:', {
        key,
        value: value.constructor.name,
      })
      if (key === 'files' && value instanceof File) {
        files.push(value)
      }
    }

    console.log('[Upload Action] Extracted files:', files.length)

    if (files.length === 0) {
      console.error('[Upload Action] No files found in FormData')
      return { success: false, error: 'No files provided' }
    }

    // Validate all files first
    for (const file of files) {
      console.log('[Upload Action] Validating file:', {
        name: file.name,
        size: file.size,
        type: file.type,
      })
      const validation = validateFile(file)
      if (!validation.valid) {
        console.error('[Upload Action] Validation failed:', validation.error)
        return { success: false, error: validation.error }
      }
    }

    console.log('[Upload Action] All files validated, starting upload to storage')

    // Upload all files
    const uploadedFiles = await uploadFiles(files, user.id)

    console.log('[Upload Action] Upload complete:', uploadedFiles.length, 'files')

    return { success: true, files: uploadedFiles }
  } catch (error) {
    console.error('[Upload Action] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload files',
    }
  }
}
