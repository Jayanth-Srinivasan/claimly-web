import type { DocumentRequirement } from '@/types/rules'

/**
 * Email validation
 */
export function validateEmail(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value.trim())
}

/**
 * Phone number validation (supports various formats)
 */
export function validatePhone(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')

  // Must be between 10-15 digits
  return digits.length >= 10 && digits.length <= 15
}

/**
 * URL validation
 */
export function validateUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Date validation
 */
export function validateDate(value: string | Date): boolean {
  if (!value) return false

  const date = value instanceof Date ? value : new Date(value)
  return !isNaN(date.getTime())
}

/**
 * Date range validation (start must be before end)
 */
export function validateDateRange(start: string | Date, end: string | Date): boolean {
  if (!start || !end) return false

  const startDate = start instanceof Date ? start : new Date(start)
  const endDate = end instanceof Date ? end : new Date(end)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false

  return startDate < endDate
}

/**
 * Numeric range validation
 */
export function validateNumberRange(value: number, min: number, max: number): boolean {
  if (typeof value !== 'number' || isNaN(value)) return false
  return value >= min && value <= max
}

/**
 * String length validation
 */
export function validateStringLength(
  value: string,
  min?: number,
  max?: number
): boolean {
  if (typeof value !== 'string') return false

  const length = value.length

  if (min !== undefined && length < min) return false
  if (max !== undefined && length > max) return false

  return true
}

/**
 * Credit card validation (Luhn algorithm)
 */
export function validateCreditCard(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')

  // Must be 13-19 digits
  if (digits.length < 13 || digits.length > 19) return false

  // Luhn algorithm
  let sum = 0
  let isEven = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Postal code validation (US ZIP code)
 */
export function validateZipCode(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  // 5 digits or 5+4 format
  const zipRegex = /^\d{5}(-\d{4})?$/
  return zipRegex.test(value.trim())
}

/**
 * Currency validation (positive number with optional decimal)
 */
export function validateCurrency(value: string | number): boolean {
  if (value === null || value === undefined) return false

  const num = typeof value === 'number' ? value : parseFloat(value)

  if (isNaN(num)) return false
  if (num < 0) return false

  // Check max 2 decimal places
  const decimalPlaces = value.toString().split('.')[1]?.length || 0
  return decimalPlaces <= 2
}

/**
 * File upload validation
 */
export function validateFileUpload(
  files: File[] | FileList,
  requirements: DocumentRequirement
): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const fileArray = Array.from(files)

  // Check file count
  if (fileArray.length < requirements.minFiles) {
    errors.push(
      `At least ${requirements.minFiles} file${requirements.minFiles > 1 ? 's' : ''} required`
    )
  }

  if (fileArray.length > requirements.maxFiles) {
    errors.push(`Maximum ${requirements.maxFiles} files allowed`)
  }

  // Check each file
  for (const file of fileArray) {
    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension && !requirements.allowedFormats.includes(extension)) {
      errors.push(
        `File "${file.name}" has invalid format. Allowed: ${requirements.allowedFormats.join(', ')}`
      )
    }

    // Check file size
    if (requirements.maxFileSize && file.size > requirements.maxFileSize) {
      const maxSizeMB = (requirements.maxFileSize / (1024 * 1024)).toFixed(1)
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
      errors.push(
        `File "${file.name}" (${fileSizeMB}MB) exceeds maximum size of ${maxSizeMB}MB`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Passport number validation (basic format check)
 */
export function validatePassport(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  // 6-9 alphanumeric characters
  const passportRegex = /^[A-Z0-9]{6,9}$/i
  return passportRegex.test(value.trim())
}

/**
 * Social Security Number validation (US SSN)
 */
export function validateSSN(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  // Format: XXX-XX-XXXX or XXXXXXXXX
  const digits = value.replace(/\D/g, '')

  if (digits.length !== 9) return false

  // Check for invalid SSNs
  const invalidSSNs = ['000000000', '111111111', '222222222', '333333333', '666666666']
  if (invalidSSNs.includes(digits)) return false

  // First 3 digits cannot be 000 or 666
  const firstThree = digits.substring(0, 3)
  if (firstThree === '000' || firstThree === '666') return false

  return true
}

/**
 * IBAN validation (International Bank Account Number)
 */
export function validateIBAN(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  const iban = value.replace(/\s/g, '').toUpperCase()

  // Check length (15-34 characters)
  if (iban.length < 15 || iban.length > 34) return false

  // Check format (2 letters + 2 digits + up to 30 alphanumeric)
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/
  if (!ibanRegex.test(iban)) return false

  // Mod-97 check
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numericString = rearranged.replace(/[A-Z]/g, (char) =>
    (char.charCodeAt(0) - 55).toString()
  )

  // Calculate mod 97
  let remainder = numericString.slice(0, 2)
  for (let i = 2; i < numericString.length; i++) {
    remainder = String(parseInt(remainder + numericString[i]) % 97)
  }

  return parseInt(remainder) === 1
}

/**
 * Custom regex validation
 */
export function validateRegex(value: string, pattern: string): boolean {
  if (!value || typeof value !== 'string') return false
  if (!pattern) return true // No pattern = no validation

  try {
    const regex = new RegExp(pattern)
    return regex.test(value)
  } catch {
    console.error('Invalid regex pattern:', pattern)
    return false
  }
}

/**
 * Validate required field
 */
export function validateRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string' && value.trim() === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  if (typeof value === 'object' && Object.keys(value).length === 0) return false

  return true
}

/**
 * Validate age (based on date of birth)
 */
export function validateAge(dateOfBirth: string | Date, minAge?: number, maxAge?: number): boolean {
  if (!dateOfBirth) return false

  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth)
  if (isNaN(dob.getTime())) return false

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }

  if (minAge !== undefined && age < minAge) return false
  if (maxAge !== undefined && age > maxAge) return false

  return true
}

/**
 * Validate flight number format
 */
export function validateFlightNumber(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  // Format: 2 letters + 1-4 digits (e.g., AA123, BA1234)
  const flightRegex = /^[A-Z]{2}\d{1,4}$/i
  return flightRegex.test(value.trim())
}

/**
 * Validate baggage tag number (airline specific)
 */
export function validateBaggageTag(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  // Common format: 3 letters + 6-10 digits (e.g., ABC1234567)
  const baggageRegex = /^[A-Z]{3}\d{6,10}$/i
  return baggageRegex.test(value.trim())
}

/**
 * Validate claim amount (positive number, max 2 decimals)
 */
export function validateClaimAmount(
  value: number | string,
  min?: number,
  max?: number
): boolean {
  const amount = typeof value === 'number' ? value : parseFloat(value)

  if (isNaN(amount)) return false
  if (amount <= 0) return false

  if (min !== undefined && amount < min) return false
  if (max !== undefined && amount > max) return false

  // Check max 2 decimal places
  const decimalPlaces = value.toString().split('.')[1]?.length || 0
  return decimalPlaces <= 2
}

/**
 * Batch validation - validate multiple fields
 */
export function validateMultiple(
  validations: Array<{ validator: () => boolean; errorMessage: string }>
): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  for (const { validator, errorMessage } of validations) {
    try {
      if (!validator()) {
        errors.push(errorMessage)
      }
    } catch {
      errors.push(errorMessage)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Custom validation function type
 */
export type CustomValidator = (value: unknown) => boolean | { valid: boolean; error?: string }

/**
 * Create a composite validator
 */
export function createCompositeValidator(
  validators: Array<{ validator: CustomValidator; errorMessage: string }>
): (value: unknown) => { valid: boolean; errors: string[] } {
  return (value: unknown) => {
    const errors: string[] = []

    for (const { validator, errorMessage } of validators) {
      const result = validator(value)

      if (typeof result === 'boolean') {
        if (!result) errors.push(errorMessage)
      } else {
        if (!result.valid) errors.push(result.error || errorMessage)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
