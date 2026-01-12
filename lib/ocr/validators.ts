const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]

export interface FileValidationResult {
  ok: boolean
  reason?: string
}

export function validateFile(file: File): FileValidationResult {
  if (!file) return { ok: false, reason: 'No file provided' }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, reason: 'Invalid file type. Only images and PDFs are allowed.' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, reason: 'File size must be less than 10MB' }
  }
  return { ok: true }
}

export const fileValidation = {
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
}
