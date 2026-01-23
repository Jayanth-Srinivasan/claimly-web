import { createOpenAIClient } from './openai-client'
import type { UploadedFile } from '@/lib/supabase/storage'
import type { DocumentRequirement } from '@/types/rules'
import {
  getValidationMessage,
  generateReuploadMessage,
  DOCUMENT_TYPES,
} from './document-validation-messages'
import { applyValidationRules } from '@/lib/rules/document-validation'

export type DocumentValidationStatus = 'pending' | 'valid' | 'needs_review' | 'invalid' | 'reupload_required'

// ============================================================
// OCR VERIFICATION TYPES & FUNCTIONS (Fix 1: Anti-Hallucination)
// ============================================================

export interface VerificationResult {
  field: string
  extractedValue: string
  foundInOCR: boolean
  confidence: 'high' | 'medium' | 'low' | 'not_found'
  ocrMatch?: string // The actual text found in OCR
}

export interface OCRVerificationResult {
  verified: Record<string, unknown>
  unverified: string[]
  verificationDetails: VerificationResult[]
  overallConfidence: number
  warnings: string[]
}

/**
 * Normalize string for fuzzy matching
 * Handles case, whitespace, and common OCR errors
 */
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[^\w\s-]/g, '') // Remove special characters except dash
}

/**
 * Check if a value appears in OCR text with fuzzy matching
 * Handles minor OCR errors and case differences
 */
function findValueInOCR(
  value: string,
  ocrData: string,
  allowPartialMatch: boolean = false
): { found: boolean; confidence: 'high' | 'medium' | 'low' | 'not_found'; match?: string } {
  if (!value || !ocrData) {
    return { found: false, confidence: 'not_found' }
  }

  const normalizedValue = normalizeForMatching(value)
  const normalizedOCR = normalizeForMatching(ocrData)

  // Exact match (high confidence)
  if (normalizedOCR.includes(normalizedValue)) {
    return { found: true, confidence: 'high', match: value }
  }

  // Try individual words for multi-word values (medium confidence)
  const words = normalizedValue.split(' ').filter(w => w.length > 2)
  if (words.length > 1) {
    const matchingWords = words.filter(word => normalizedOCR.includes(word))
    if (matchingWords.length === words.length) {
      return { found: true, confidence: 'high', match: value }
    }
    if (matchingWords.length >= words.length * 0.6) {
      return { found: true, confidence: 'medium', match: matchingWords.join(' ') }
    }
  }

  // Try partial match for longer values (low confidence)
  if (allowPartialMatch && normalizedValue.length > 5) {
    // Check if at least 60% of characters match consecutively
    for (let i = 0; i <= normalizedOCR.length - normalizedValue.length * 0.6; i++) {
      const substring = normalizedOCR.substring(i, i + normalizedValue.length)
      let matchCount = 0
      for (let j = 0; j < Math.min(substring.length, normalizedValue.length); j++) {
        if (substring[j] === normalizedValue[j]) matchCount++
      }
      if (matchCount >= normalizedValue.length * 0.8) {
        return { found: true, confidence: 'low', match: substring }
      }
    }
  }

  return { found: false, confidence: 'not_found' }
}

/**
 * Find date value in OCR text (handles multiple date formats)
 */
function findDateInOCR(
  dateValue: string,
  ocrData: string
): { found: boolean; confidence: 'high' | 'medium' | 'low' | 'not_found'; match?: string } {
  if (!dateValue || !ocrData) {
    return { found: false, confidence: 'not_found' }
  }

  const normalizedOCR = ocrData.toLowerCase()

  // Try to parse the date
  let dateObj: Date
  try {
    dateObj = new Date(dateValue)
    if (isNaN(dateObj.getTime())) {
      return { found: false, confidence: 'not_found' }
    }
  } catch {
    return { found: false, confidence: 'not_found' }
  }

  const day = dateObj.getDate()
  const month = dateObj.getMonth() + 1
  const year = dateObj.getFullYear()
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december']
  const monthShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                      'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

  // Generate various date formats to search for
  const dateFormats = [
    // ISO format
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    // US format
    `${month}/${day}/${year}`,
    `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`,
    // European format
    `${day}/${month}/${year}`,
    `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    // With dashes
    `${day}-${month}-${year}`,
    `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
    // Full month name
    `${day} ${monthNames[month - 1]} ${year}`,
    `${monthNames[month - 1]} ${day}, ${year}`,
    `${monthNames[month - 1]} ${day} ${year}`,
    // Short month name
    `${day} ${monthShort[month - 1]} ${year}`,
    `${monthShort[month - 1]} ${day}, ${year}`,
    `${monthShort[month - 1]} ${day} ${year}`,
    // Day with ordinal
    `${day}th ${monthNames[month - 1]}`,
    `${day}st ${monthNames[month - 1]}`,
    `${day}nd ${monthNames[month - 1]}`,
    `${day}rd ${monthNames[month - 1]}`,
  ]

  // Check for exact format matches
  for (const format of dateFormats) {
    if (normalizedOCR.includes(format.toLowerCase())) {
      return { found: true, confidence: 'high', match: format }
    }
  }

  // Check if day, month, and year appear separately (medium confidence)
  const hasDay = normalizedOCR.includes(String(day))
  const hasMonth = normalizedOCR.includes(monthNames[month - 1]) ||
                   normalizedOCR.includes(monthShort[month - 1]) ||
                   normalizedOCR.includes(String(month))
  const hasYear = normalizedOCR.includes(String(year))

  if (hasDay && hasMonth && hasYear) {
    return { found: true, confidence: 'medium', match: `${day}/${month}/${year}` }
  }

  // Check for just day and month (low confidence)
  if (hasDay && hasMonth) {
    return { found: true, confidence: 'low', match: `${day}/${month}` }
  }

  return { found: false, confidence: 'not_found' }
}

/**
 * Verify extracted entities against raw OCR text
 * This is the core anti-hallucination function
 */
export function verifyExtractionAgainstOCR(
  extractedEntities: Record<string, unknown>,
  ocrData: string
): OCRVerificationResult {
  const verified: Record<string, unknown> = {}
  const unverified: string[] = []
  const verificationDetails: VerificationResult[] = []
  const warnings: string[] = []

  // Critical fields that MUST be verified
  const criticalFields = ['passengerName', 'name', 'patientName', 'customerName']
  const dateFields = ['date', 'dateOfTravel', 'documentDate', 'issueDate', 'travelDate']
  const importantFields = ['flightNumber', 'baggageTag', 'baggageTagNumber', 'pirNumber', 'referenceNumber']
  const locationFields = ['from', 'to', 'origin', 'destination', 'location', 'airport']

  for (const [key, value] of Object.entries(extractedEntities)) {
    if (value === null || value === undefined || value === '') {
      continue
    }

    const stringValue = String(value)
    let result: { found: boolean; confidence: 'high' | 'medium' | 'low' | 'not_found'; match?: string }

    // Handle date fields specially
    if (dateFields.includes(key)) {
      result = findDateInOCR(stringValue, ocrData)
    } else {
      // Allow partial match for names, strict match for codes
      const allowPartial = criticalFields.includes(key) || locationFields.includes(key)
      result = findValueInOCR(stringValue, ocrData, allowPartial)
    }

    const verificationResult: VerificationResult = {
      field: key,
      extractedValue: stringValue,
      foundInOCR: result.found,
      confidence: result.confidence,
      ocrMatch: result.match,
    }
    verificationDetails.push(verificationResult)

    if (result.found) {
      verified[key] = value
    } else {
      unverified.push(key)

      // Add warnings for critical unverified fields
      if (criticalFields.includes(key)) {
        warnings.push(`CRITICAL: Extracted ${key} "${stringValue}" could not be verified in document text - possible hallucination`)
      } else if (importantFields.includes(key)) {
        warnings.push(`WARNING: Extracted ${key} "${stringValue}" could not be verified in document text`)
      } else if (dateFields.includes(key)) {
        warnings.push(`WARNING: Extracted date ${key} "${stringValue}" could not be verified in document text`)
      }
    }
  }

  // Calculate overall confidence
  const totalFields = verificationDetails.length
  const verifiedFields = verificationDetails.filter(v => v.foundInOCR).length
  const highConfidenceFields = verificationDetails.filter(v => v.confidence === 'high').length

  let overallConfidence = totalFields > 0 ? verifiedFields / totalFields : 0
  // Boost confidence if most fields are high confidence
  if (highConfidenceFields >= totalFields * 0.7) {
    overallConfidence = Math.min(overallConfidence + 0.1, 1.0)
  }

  // Check if any critical field is unverified
  const unverifiedCritical = criticalFields.filter(f =>
    extractedEntities[f] && unverified.includes(f)
  )
  if (unverifiedCritical.length > 0) {
    overallConfidence = Math.min(overallConfidence, 0.5) // Cap confidence if critical fields missing
  }

  console.log(`[verifyExtractionAgainstOCR] Verification complete:`, {
    totalFields,
    verifiedFields,
    unverifiedFields: unverified.length,
    overallConfidence,
    unverifiedCritical,
  })

  return {
    verified,
    unverified,
    verificationDetails,
    overallConfidence,
    warnings,
  }
}

// ============================================================
// SEMANTIC LOCATION MATCHING (Fix 5)
// ============================================================

/**
 * Comprehensive airport code and city mappings
 */
const LOCATION_MAPPINGS: Record<string, string[]> = {
  // Indian airports
  'blr': ['bengaluru', 'bangalore', 'kempegowda', 'kempegowda international'],
  'del': ['delhi', 'new delhi', 'indira gandhi', 'indira gandhi international', 'igi'],
  'bom': ['mumbai', 'bombay', 'chhatrapati shivaji', 'chhatrapati shivaji maharaj', 'csia'],
  'mum': ['mumbai', 'bombay'],
  'maa': ['chennai', 'madras', 'chennai international'],
  'ccu': ['kolkata', 'calcutta', 'netaji subhas chandra bose'],
  'hyd': ['hyderabad', 'rajiv gandhi', 'shamshabad'],
  'goi': ['goa', 'dabolim', 'manohar international', 'mopa'],
  'pnq': ['pune', 'lohegaon'],
  'cok': ['kochi', 'cochin', 'cochin international'],
  'amd': ['ahmedabad', 'sardar vallabhbhai patel'],
  'jai': ['jaipur', 'jaipur international'],
  'lko': ['lucknow', 'chaudhary charan singh'],
  'ixc': ['chandigarh'],
  'gau': ['guwahati', 'lokpriya gopinath bordoloi'],
  'ixr': ['ranchi', 'birsa munda'],
  'pat': ['patna', 'jay prakash narayan'],
  'bbi': ['bhubaneswar', 'biju patnaik'],
  'ixb': ['bagdogra', 'siliguri'],
  'sxr': ['srinagar', 'sheikh ul alam'],
  'trv': ['thiruvananthapuram', 'trivandrum'],
  'ixe': ['mangalore', 'mangaluru'],
  'vtz': ['visakhapatnam', 'vizag'],
  'idr': ['indore', 'devi ahilya bai holkar'],
  'vns': ['varanasi', 'lal bahadur shastri'],
  'ixz': ['port blair', 'veer savarkar'],
  // International airports
  'jfk': ['new york', 'john f kennedy', 'jfk', 'kennedy'],
  'lhr': ['london', 'heathrow', 'london heathrow'],
  'lgw': ['london', 'gatwick', 'london gatwick'],
  'lcy': ['london', 'city airport', 'london city'],
  'dxb': ['dubai', 'dubai international'],
  'sin': ['singapore', 'changi', 'singapore changi'],
  'hkg': ['hong kong', 'chek lap kok'],
  'bkk': ['bangkok', 'suvarnabhumi'],
  'kul': ['kuala lumpur', 'klia'],
  'syd': ['sydney', 'kingsford smith'],
  'mel': ['melbourne', 'tullamarine'],
  'fra': ['frankfurt', 'frankfurt am main'],
  'cdg': ['paris', 'charles de gaulle'],
  'ams': ['amsterdam', 'schiphol'],
  'ord': ['chicago', 'ohare', "o'hare"],
  'lax': ['los angeles', 'lax'],
  'sfo': ['san francisco'],
  'atl': ['atlanta', 'hartsfield jackson'],
  'dfw': ['dallas', 'fort worth'],
  'iah': ['houston', 'george bush'],
  'ewr': ['newark', 'liberty'],
  'bos': ['boston', 'logan'],
  'sea': ['seattle', 'tacoma', 'seatac'],
  'mia': ['miami'],
  'yyz': ['toronto', 'pearson'],
  'yvr': ['vancouver'],
  'pek': ['beijing', 'capital'],
  'pvg': ['shanghai', 'pudong'],
  'nrt': ['tokyo', 'narita'],
  'hnd': ['tokyo', 'haneda'],
  'icn': ['seoul', 'incheon'],
  'auh': ['abu dhabi'],
  'doh': ['doha', 'hamad'],
  'ist': ['istanbul'],
  'cai': ['cairo'],
  'jnb': ['johannesburg', 'or tambo'],
}

/**
 * Semantic location match with detailed results
 */
export function semanticLocationMatch(
  docLocation: string,
  claimLocation: string
): { matches: boolean; confidence: 'exact' | 'likely' | 'possible' | 'no_match'; reason: string } {
  if (!docLocation || !claimLocation) {
    return { matches: false, confidence: 'no_match', reason: 'Missing location data' }
  }

  const normalizeLocation = (loc: string): string => {
    return loc.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
  }

  const normalizedDoc = normalizeLocation(docLocation)
  const normalizedClaim = normalizeLocation(claimLocation)

  // Exact match
  if (normalizedDoc === normalizedClaim) {
    return { matches: true, confidence: 'exact', reason: 'Exact match' }
  }

  // Direct substring match
  if (normalizedDoc.includes(normalizedClaim) || normalizedClaim.includes(normalizedDoc)) {
    return { matches: true, confidence: 'exact', reason: `"${docLocation}" contains "${claimLocation}"` }
  }

  // Check against location mappings (both directions)
  for (const [code, aliases] of Object.entries(LOCATION_MAPPINGS)) {
    const allNames = [code, ...aliases]

    // Check if both locations match the same city/airport
    const docMatches = allNames.some(name =>
      normalizedDoc.includes(name) || name.includes(normalizedDoc)
    )
    const claimMatches = allNames.some(name =>
      normalizedClaim.includes(name) || name.includes(normalizedClaim)
    )

    if (docMatches && claimMatches) {
      return {
        matches: true,
        confidence: 'likely',
        reason: `Both "${docLocation}" and "${claimLocation}" refer to the same location (${code.toUpperCase()})`
      }
    }
  }

  // Check for word overlap (possible match)
  const docWords = normalizedDoc.split(/\s+/).filter(w => w.length > 2)
  const claimWords = normalizedClaim.split(/\s+/).filter(w => w.length > 2)
  const commonWords = docWords.filter(w => claimWords.includes(w))

  if (commonWords.length > 0 && commonWords.length >= Math.min(docWords.length, claimWords.length) * 0.5) {
    return {
      matches: true,
      confidence: 'possible',
      reason: `Partial match: common words "${commonWords.join(', ')}"`
    }
  }

  // No match
  return {
    matches: false,
    confidence: 'no_match',
    reason: `No relationship found between "${docLocation}" and "${claimLocation}"`
  }
}

export interface DocumentExtraction {
  extractedEntities: Record<string, unknown>
  ocrData?: string
  autoFilledFields: Record<string, unknown>
  documentType?: string
  authenticityScore?: number
  tamperingDetected?: boolean
  isLegitimate?: boolean
  isRelevant?: boolean
  contextMatches?: boolean
  validationResults: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export interface DocumentContext {
  claimContext?: {
    coverageType?: string
    incidentDescription?: string
    incidentDate?: string
    incidentLocation?: string
  }
  previousAnswers?: Record<string, unknown>
  extractedInfo?: Record<string, unknown>
}

/**
 * Extract information from a document using OpenAI Vision API
 * Enhanced with legitimacy, relevance, and context validation
 */
export async function extractDocumentInfo(
  document: UploadedFile | { path: string; mimeType?: string; url?: string },
  expectedType?: string,
  context?: DocumentContext
): Promise<DocumentExtraction> {
  const startTime = Date.now()
  const client = createOpenAIClient()

  console.log(`[extractDocumentInfo] Starting document extraction - Expected type: ${expectedType || 'unknown'}, Has URL: ${'url' in document ? !!document.url : false}, Has path: ${'path' in document ? !!document.path : false}`)
  if (context) {
    console.log(`[extractDocumentInfo] Context provided - Coverage Type: ${context.claimContext?.coverageType || 'none'}, Incident Date: ${context.claimContext?.incidentDate || 'none'}, Incident Location: ${context.claimContext?.incidentLocation || 'none'}`)
  }

  try {
    // Get the file URL - prefer provided URL, otherwise generate signed URL
    let fileUrl = 'url' in document ? document.url : undefined
    
    if (!fileUrl && 'path' in document) {
      // Generate signed URL from path
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const bucket = 'claim-documents'
      const path = document.path
      
      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600)
      
      if (signedData?.signedUrl) {
        fileUrl = signedData.signedUrl
      }
    }
    
    if (!fileUrl) {
      throw new Error('Could not get file URL for document processing')
    }

    // Determine if it's an image or PDF
    const mimeType = 'type' in document ? document.type : document.mimeType

    // Fallback to file extension when mimeType is unavailable
    const filePath = 'path' in document ? document.path : ''
    const extension = filePath.split('.').pop()?.toLowerCase() || ''
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
    const pdfExtensions = ['pdf']

    const isImage = mimeType?.startsWith('image/') || imageExtensions.includes(extension)
    const isPDF = mimeType === 'application/pdf' || pdfExtensions.includes(extension)

    console.log(`[extractDocumentInfo] Document type detected - MIME: ${mimeType || 'unknown'}, Extension: ${extension}, Is Image: ${isImage}, Is PDF: ${isPDF}, File URL: ${fileUrl.substring(0, 50)}...`)
    
    // Build message content with image/document
    const messageContent: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [
      {
        type: 'text',
        text: `Analyze this ${expectedType || (isImage ? 'image' : isPDF ? 'PDF document' : 'document')} and extract all relevant information.`,
      },
    ]
    
    // Add image URL if it's an image
    if (isImage && fileUrl) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: fileUrl },
      })
    } else if (isPDF && fileUrl) {
      // NOTE: OpenAI's vision API doesn't support PDFs directly - only images
      // We need to convert PDF pages to images or extract text first
      // For now, we'll fetch the PDF and try to extract text using a simple approach
      console.log(`[extractDocumentInfo] Processing PDF - fetching and extracting text: ${fileUrl.substring(0, 50)}...`)
      
      try {
        // Fetch the PDF from the signed URL
        const pdfResponse = await fetch(fileUrl)
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`)
        }
        
        const pdfBuffer = await pdfResponse.arrayBuffer()
        
        // Try to use pdf-parse if available (requires: npm install pdf-parse)
        try {
          // pdf-parse is a CommonJS module, handle import accordingly
          const pdfParseModule = await import('pdf-parse')
          const pdfParse = (pdfParseModule as any).default || pdfParseModule
          const pdfData = await pdfParse(Buffer.from(pdfBuffer))
          const extractedText = pdfData.text
          
          console.log(`[extractDocumentInfo] PDF text extracted - ${extractedText.length} characters`)
          
          // Send extracted text to the model
          messageContent.push({
            type: 'text',
            text: `\n\nThis is a PDF document. Here is the extracted text content:\n\n${extractedText}\n\nPlease analyze this text and extract all relevant information including: amounts, dates, merchant names, item descriptions, receipt numbers, flight numbers, baggage tag numbers, and any other relevant details.`,
          })
        } catch (parseError) {
          // pdf-parse not available or failed - use fallback
          console.warn(`[extractDocumentInfo] PDF parsing library not available, using fallback approach:`, parseError)
          messageContent.push({
            type: 'text',
            text: `\n\nThis is a PDF document. The PDF file is available at: ${fileUrl}. However, automatic text extraction is not available. Please note that you may need to manually review this PDF. For proper PDF processing, please ensure the pdf-parse library is installed (npm install pdf-parse).`,
          })
        }
      } catch (pdfError) {
        console.error(`[extractDocumentInfo] PDF processing error:`, pdfError)
        // Fallback: inform the model that PDF processing failed
        messageContent.push({
          type: 'text',
          text: `\n\nThis is a PDF document, but automatic processing failed. The PDF is available at: ${fileUrl}. Please note that PDF content extraction may be limited. Error: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
        })
      }
    }

    // Build context information for validation
    const contextInfo = context ? `
CLAIM CONTEXT:
- Coverage Type: ${context.claimContext?.coverageType || 'Not provided'}
- Incident Description: ${context.claimContext?.incidentDescription || 'Not provided'}
- Incident Date: ${context.claimContext?.incidentDate || 'Not provided'}
- Incident Location: ${context.claimContext?.incidentLocation || 'Not provided'}

PREVIOUS ANSWERS: ${JSON.stringify(context.previousAnswers || {}, null, 2)}
EXTRACTED INFO: ${JSON.stringify(context.extractedInfo || {}, null, 2)}
` : ''

    console.log(`[extractDocumentInfo] Context provided for validation:`, {
      coverageType: context?.claimContext?.coverageType,
      incidentDate: context?.claimContext?.incidentDate,
      incidentLocation: context?.claimContext?.incidentLocation,
      hasContext: !!context,
    })

    const response = await client.chat.completions.create({
      model: 'gpt-4o', // GPT-4o supports vision
      messages: [
        {
          role: 'system',
          content: `You are a document analysis assistant. Analyze documents and extract structured information.

${contextInfo ? `CONTEXT FOR VALIDATION:\n${contextInfo}\n` : ''}

CRITICAL ANTI-HALLUCINATION RULES - READ THESE FIRST:
1. ONLY extract text that is LITERALLY VISIBLE in the document image
2. If you cannot clearly read a field, set it to null - DO NOT GUESS or invent values
3. For each field you extract:
   - You MUST be able to point to where it appears in the document
   - Include the EXACT text as shown (case-sensitive)
   - The value MUST appear somewhere in your ocrData output
4. The ocrData field should contain ONLY text you can actually see in the document
5. If the document is blurry, partially visible, or low quality:
   - Set authenticityScore < 0.5
   - Add warning about image quality
   - Only extract fields you can clearly read

VERIFICATION REQUIREMENT (MANDATORY):
- Before returning, verify each extracted value appears in your ocrData
- If extractedEntities.passengerName = "Jay", the string "Jay" MUST appear in ocrData
- If extractedEntities.flightNumber = "SA-204", "SA-204" MUST appear in ocrData
- If extractedEntities.date = "2026-01-11", some form of that date (e.g., "11 January 2026" or "11/01/2026") MUST appear in ocrData
- If a value is in extractedEntities but NOT verifiable in ocrData, REMOVE IT and set to null

OCR ACCURACY RULES:
- Read text EXACTLY as it appears in the document - do NOT guess, assume, or make up values
- Extract values verbatim from the visible text - if you see "Jay", extract "Jay", not "John Doe"
- If text is unclear or partially visible, extract what you can see clearly and mark uncertain fields
- For dates: Extract the exact date format shown (e.g., "11 January 2026" or "11-01-2026"), then convert to ISO format (YYYY-MM-DD)
- For names: Extract the exact name as written (preserve case)
- For flight numbers: Extract exactly as shown (e.g., "SA-204" not "AI123")
- For locations: Extract city/airport names exactly as written (e.g., "Bengaluru" not "Mumbai", "BLR" not "DEL")
- For baggage tags: Extract the exact tag number as shown (e.g., "SA123456" not "BAG123456")

EXTRACTION PROCESS:
1. First, read ALL visible text in the document carefully from top to bottom
2. Identify the document type based on structure and content
3. Extract each field by finding the corresponding label/value pairs (e.g., "Passenger Name: Jay")
4. For each extracted value, verify it matches what is visible in the document
5. If a field is not visible or unclear, set it to null (not a guess)

FIELD-SPECIFIC EXTRACTION GUIDELINES:
- **Passenger/Patient/Customer Name**: Look for fields labeled "Passenger Name", "Name", "Customer Name", etc. Extract the exact value shown
- **Flight Number**: Look for "Flight", "Flight Number", "Flight No." - extract format like "SA-204" or "AI123" exactly as shown
- **Date**: Look for "Date", "Date of Travel", "Issue Date", "Date of Incident" - extract in format shown, then convert to ISO (YYYY-MM-DD)
- **Location/Route**: Look for "From", "To", "Origin", "Destination", "Location" - extract city/airport names exactly as written
- **Baggage Tag**: Look for "Baggage Tag", "Tag Number", "Bag Tag", "Baggage Tag Number" - extract the exact alphanumeric code
- **Amount**: Look for "Amount", "Total", "Total Amount" - extract numeric value with currency if shown

VALIDATION REQUIREMENTS:
- After extraction, review each field to ensure it matches visible text
- In ocrData, include the raw text you read from the document for verification
- If extraction seems incorrect, re-read the document and correct the values
- Flag any fields where text is unclear or ambiguous

Your tasks:
1. EXTRACT information:
   - Document type (receipt, invoice, medical_report, flight_cancellation, baggage_receipt, etc.)
   - Key entities (amounts, dates, names, locations, flight numbers, etc.) - EXTRACT EXACTLY AS SHOWN
   - OCR text content (ALL visible text in reading order with structure preserved)
   - Auto-fillable fields
   - Validation checks (amounts match, dates are valid, etc.)

2. VALIDATE legitimacy:
   - Check for obvious tampering (inconsistent fonts, misaligned text, suspicious edits)
   - Verify document appears authentic (proper formatting, realistic data)
   - Check for consistency in the document (dates make sense, amounts are reasonable)
   - Score authenticity from 0-1 (1 = highly authentic, 0 = clearly tampered)
   - Set isLegitimate to false if tampering is detected or authenticity score < 0.7

3. VALIDATE relevance (CRITICAL):
   - **Document type MUST match the expected document type for the claim type**:
     - For baggage loss claims: expect baggage_receipt, lost_item_receipt, purchase_receipt
     - For flight cancellation claims: expect flight_cancellation, airline_notification, booking_confirmation
     - For medical claims: expect medical_report, hospital_bill, prescription_receipt
     - For other claim types: expect appropriate document types
   - If document type does NOT match the expected type for the coverage type, set isRelevant to false
   - Verify document is appropriate for the coverage type
   - Check if document contains information relevant to the claim
   - Set isRelevant to false if document type is clearly wrong (e.g., medical report for baggage loss claim)

4. VALIDATE context matching (CRITICAL - STRICT):
   - **Dates MUST match exactly or be very close**: If claim context includes an incident date, document dates MUST match the incident date (within 1-2 days tolerance). If the document date is significantly different (e.g., claim says Jan 20 but document shows Jan 11), set contextMatches to FALSE.
   - **Locations MUST match**: If claim context includes an incident location (e.g., "Mumbai Airport", "Mumbai", "BOM"), the document MUST show the same location. Check:
     * Origin/departure airport/city in document
     * Destination/arrival airport/city in document
     * Any location fields in document
     * Airport codes (BLR, DEL, BOM, MUM, etc.) should match city names
     * If claim says "Mumbai" but document shows "Bengaluru" or "BLR→DEL", set contextMatches to FALSE
   - **Flight numbers should match if mentioned**: If the claim description mentions a flight number, check if document flight number matches
   - **Amounts MUST align**: If claim context includes an amount, document amounts should reasonably match (allow small variations for currency conversion or fees)
   - **STRICT RULE**: If ANY of the following don't match, set contextMatches to FALSE:
     * Date mismatch (more than 2 days difference)
     * Location mismatch (different city/airport)
     * Flight number mismatch (if flight is mentioned in claim)
   - Compare extracted information with claim context STRICTLY
   - Check if extracted data matches previous answers (e.g., amount matches what user said)
   - Verify consistency with previously extracted information
   - Flag any discrepancies clearly
   - Set contextMatches to false if dates, locations, or flight numbers significantly differ from claim context
   - Provide specific error messages: "Date mismatch: document shows [date] but claim is [date]" or "Location mismatch: document shows [location] but claim is [location]"

OCR DATA REQUIREMENT (CRITICAL):
- Extract ALL visible text from the document in reading order (top to bottom, left to right)
- Include section headers, labels, and values
- Preserve the structure (e.g., "Passenger Name: Jay" not just "Jay")
- Include all text even if it seems redundant
- This ocrData field is critical for verification and debugging
- Format: Use line breaks to separate sections, preserve label:value pairs

Respond in JSON format with: {
  documentType: string,
  extractedEntities: {
    passengerName?: string (exact name as shown),
    name?: string (exact name as shown),
    flightNumber?: string (exact format as shown, e.g., "SA-204"),
    date?: string (ISO format YYYY-MM-DD),
    dateOfTravel?: string (ISO format YYYY-MM-DD),
    from?: string (exact city/airport name),
    to?: string (exact city/airport name),
    origin?: string (exact city/airport name),
    destination?: string (exact city/airport name),
    location?: string (exact location as shown),
    baggageTag?: string (exact tag number as shown),
    baggageTagNumber?: string (exact tag number as shown),
    amount?: number (numeric value only),
    totalAmount?: number (numeric value only),
    [other fields as found]
  },
  ocrData: string (ALL visible text in reading order with structure preserved),
  autoFilledFields: object,
  isLegitimate: boolean,
  authenticityScore: number (0-1),
  tamperingDetected: boolean,
  isRelevant: boolean,
  contextMatches: boolean,
  validationResults: {
    isValid: boolean,
    errors: string[],
    warnings: string[]
  }
}`,
        },
        {
          role: 'user',
          content: messageContent,
        },
      ],
      temperature: 0.1, // Lower temperature for more accurate, deterministic extraction
      response_format: { type: 'json_object' },
      max_tokens: 4000, // Ensure complete responses including full OCR data
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from document analysis')
    }
    
    console.log(`[extractDocumentInfo] Received response from OpenAI - Content length: ${content.length}`)

    const analysis = JSON.parse(content) as {
      documentType: string
      extractedEntities: Record<string, unknown>
      ocrData: string
      autoFilledFields: Record<string, unknown>
      isLegitimate?: boolean
      authenticityScore?: number
      tamperingDetected?: boolean
      isRelevant?: boolean
      contextMatches?: boolean
      validationResults: {
        isValid: boolean
        errors: string[]
        warnings: string[]
      }
    }

    // Log raw OCR data for verification
    console.log(`[extractDocumentInfo] Raw OCR data (first 500 chars):`, analysis.ocrData?.substring(0, 500) || 'No OCR data provided')
    if (analysis.ocrData && analysis.ocrData.length > 500) {
      console.log(`[extractDocumentInfo] OCR data length: ${analysis.ocrData.length} characters (truncated in log)`)
    }

    // Log each extracted entity with its value
    console.log(`[extractDocumentInfo] Extracted entities (${Object.keys(analysis.extractedEntities).length} fields):`)
    for (const [key, value] of Object.entries(analysis.extractedEntities)) {
      console.log(`  - ${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    }

    // Check for inconsistencies with document type
    const documentType = analysis.documentType?.toLowerCase() || ''
    const hasName = !!(analysis.extractedEntities.passengerName || analysis.extractedEntities.name || analysis.extractedEntities.patientName)
    const hasFlightNumber = !!(analysis.extractedEntities.flightNumber || analysis.extractedEntities.flight_number)
    const hasBaggageTag = !!(analysis.extractedEntities.baggageTag || analysis.extractedEntities.baggageTagNumber)
    const hasDate = !!(analysis.extractedEntities.date || analysis.extractedEntities.dateOfTravel || analysis.extractedEntities.issueDate)

    if (documentType.includes('baggage') && !hasBaggageTag) {
      console.warn(`[extractDocumentInfo] WARNING: Document type is ${documentType} but no baggage tag extracted`)
    }
    if (documentType.includes('flight') && !hasFlightNumber) {
      console.warn(`[extractDocumentInfo] WARNING: Document type is ${documentType} but no flight number extracted`)
    }
    if (!hasName) {
      console.warn(`[extractDocumentInfo] WARNING: No name/passenger name extracted from document`)
    }
    if (!hasDate) {
      console.warn(`[extractDocumentInfo] WARNING: No date extracted from document`)
    }

    // Log validation results
    console.log(`[extractDocumentInfo] Validation results:`, {
      isValid: analysis.validationResults.isValid,
      errors: analysis.validationResults.errors,
      warnings: analysis.validationResults.warnings,
      documentType,
      entityCount: Object.keys(analysis.extractedEntities).length
    })

    // Determine overall validity based on all checks
    // Use strict === true checks to ensure validation only passes if explicitly true
    const isLegitimate = analysis.isLegitimate === true && (analysis.authenticityScore ?? 0.7) >= 0.7
    const isRelevant = analysis.isRelevant === true
    const contextMatches = analysis.contextMatches === true
    
    console.log(`[extractDocumentInfo] Validation flags determined:`, {
      isLegitimate,
      isRelevant,
      contextMatches,
      authenticityScore: analysis.authenticityScore,
      analysisFlags: {
        isLegitimate: analysis.isLegitimate,
        isRelevant: analysis.isRelevant,
        contextMatches: analysis.contextMatches,
      }
    })

    // Add warnings if validation checks fail
    const warnings = [...(analysis.validationResults.warnings || [])]
    if (!isLegitimate) {
      warnings.push('Document may not be legitimate - please verify authenticity')
    }
    if (!isRelevant) {
      warnings.push('Document may not be relevant to this claim type')
    }
    if (!contextMatches) {
      warnings.push('Document information does not match claim context - please verify')
    }

    const isValid = analysis.validationResults.isValid && isLegitimate && isRelevant && contextMatches

    const elapsedTime = Date.now() - startTime
    console.log(`[extractDocumentInfo] Document analysis completed in ${elapsedTime}ms - Document Type: ${analysis.documentType}, Valid: ${isValid}, Entities: ${Object.keys(analysis.extractedEntities).length}, AutoFilled: ${Object.keys(analysis.autoFilledFields).length}`)

    return {
      extractedEntities: analysis.extractedEntities,
      ocrData: analysis.ocrData,
      autoFilledFields: analysis.autoFilledFields,
      documentType: analysis.documentType,
      authenticityScore: analysis.authenticityScore ?? 0.7,
      tamperingDetected: analysis.tamperingDetected ?? false,
      isLegitimate,
      isRelevant,
      contextMatches,
      validationResults: {
        isValid,
        errors: analysis.validationResults.errors || [],
        warnings,
      },
    }
  } catch (error) {
    const elapsedTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error(`[extractDocumentInfo] Error occurred after ${elapsedTime}ms:`, {
      error: errorMessage,
      stack: errorStack,
      document: 'path' in document ? { path: document.path, mimeType: (document as { path: string; mimeType?: string }).mimeType } : 'UploadedFile',
      expectedType: expectedType || 'unknown',
    })
    
    // Return a result that allows processing to continue
    // Don't throw - let the handler decide what to do
    // Note: isLegitimate defaults to true to avoid blocking legitimate documents on technical errors
    // But isRelevant and contextMatches default to false since we can't validate without processing
    return {
      extractedEntities: {},
      ocrData: '',
      autoFilledFields: {},
      documentType: expectedType || 'unknown',
      authenticityScore: 0.5,
      tamperingDetected: false,
      isLegitimate: true, // Assume legitimate to avoid blocking on technical errors
      isRelevant: false, // Cannot validate relevance without processing - require validation
      contextMatches: false, // Cannot validate context matching without processing - require validation
      validationResults: {
        isValid: false,
        errors: [],
        warnings: ['Document processing encountered limitations - document saved for manual review'],
      },
    }
  }
}

/**
 * Extended validation context for document processing
 */
export interface DocumentValidationContext {
  claimContext: {
    coverageType: string
    coverageTypeId?: string
    incidentDate?: string
    incidentLocation?: string
    claimedAmount?: number
    incidentDescription?: string
  }
  userProfile: {
    fullName: string
    dateOfBirth?: string
    email?: string
  }
  requiredDocuments: DocumentRequirement[]
}

/**
 * Document validation result with profile and context validation
 */
export interface DocumentValidationResult {
  extraction: DocumentExtraction
  profileValidation: {
    nameMatches: boolean | null
    dobMatches: boolean | null
    discrepancies: string[]
  }
  contextValidation: {
    dateAligns: boolean | null
    amountAligns: boolean | null
    locationAligns: boolean | null
    discrepancies: string[]
  }
  documentTypeValidation: {
    isExpectedType: boolean
    detectedType: string
    expectedTypes: string[]
  }
  overallStatus: DocumentValidationStatus
  validationErrors: string[]
  validationWarnings: string[]
  reuploadReason?: string
  reuploadGuidance?: string
  userMessage: string
}

/**
 * Check if extracted name matches user profile name
 */
function validateNameMatch(extractedName: string | undefined, profileName: string): boolean | null {
  if (!extractedName) return null

  const extractedNormalized = extractedName.toLowerCase().trim()
  const profileNormalized = profileName.toLowerCase().trim()

  // Exact match
  if (extractedNormalized === profileNormalized) return true

  // Check if profile name is contained in extracted name (handles full names with middle names)
  const profileParts = profileNormalized.split(/\s+/)
  const extractedParts = extractedNormalized.split(/\s+/)

  // Check if first and last name match
  if (profileParts.length >= 2 && extractedParts.length >= 2) {
    const profileFirst = profileParts[0]
    const profileLast = profileParts[profileParts.length - 1]
    const extractedFirst = extractedParts[0]
    const extractedLast = extractedParts[extractedParts.length - 1]

    if (profileFirst === extractedFirst && profileLast === extractedLast) return true
  }

  // Fuzzy match - at least 80% of name parts match
  const matchingParts = profileParts.filter(part =>
    extractedParts.some(ePart => ePart.includes(part) || part.includes(ePart))
  )

  return matchingParts.length / profileParts.length >= 0.8
}

/**
 * Document type categories for date tolerance configuration
 */
type DocumentCategory = 'incident_report' | 'booking' | 'medical' | 'receipt' | 'general'

/**
 * Determine document category based on type string
 */
function getDocumentCategory(documentType?: string): DocumentCategory {
  if (!documentType) return 'general'
  const type = documentType.toLowerCase()

  if (type.includes('pir') || type.includes('incident') || type.includes('baggage_receipt')) {
    return 'incident_report'
  }
  if (type.includes('booking') || type.includes('ticket') || type.includes('confirmation')) {
    return 'booking'
  }
  if (type.includes('medical') || type.includes('hospital') || type.includes('doctor')) {
    return 'medical'
  }
  if (type.includes('receipt') || type.includes('invoice')) {
    return 'receipt'
  }
  return 'general'
}

/**
 * Check if dates align with STRICT tolerances based on document type
 * Fix 2: Reduced from ±30/+90 days to much stricter tolerances
 */
function validateDateAlignment(
  documentDate: string | undefined,
  incidentDate: string | undefined,
  documentType?: string
): { aligns: boolean | null; daysDiff: number | null; reason?: string } {
  if (!documentDate || !incidentDate) {
    return { aligns: null, daysDiff: null, reason: 'Missing date data' }
  }

  try {
    const docDate = new Date(documentDate)
    const incDate = new Date(incidentDate)

    if (isNaN(docDate.getTime()) || isNaN(incDate.getTime())) {
      return { aligns: null, daysDiff: null, reason: 'Invalid date format' }
    }

    const daysDiff = Math.round((docDate.getTime() - incDate.getTime()) / (1000 * 60 * 60 * 24))
    const category = getDocumentCategory(documentType)

    // Strict tolerances based on document type
    let minDays: number
    let maxDays: number
    let toleranceReason: string

    switch (category) {
      case 'incident_report':
        // PIR, baggage reports: should be on incident date or within 1 day
        minDays = -1
        maxDays = 1
        toleranceReason = 'Incident reports must be dated within 1 day of incident'
        break
      case 'booking':
        // Booking confirmations: can be before the incident (travel date)
        minDays = -365 // Bookings can be made up to a year in advance
        maxDays = 7    // But shouldn't be dated after incident (unless issued after)
        toleranceReason = 'Booking documents should be dated on or before travel date'
        break
      case 'medical':
        // Medical reports: within 3 days of incident
        minDays = -1
        maxDays = 7
        toleranceReason = 'Medical reports should be dated within 7 days of incident'
        break
      case 'receipt':
        // Receipts: on or shortly after incident
        minDays = -1
        maxDays = 7
        toleranceReason = 'Receipts should be dated on or shortly after incident'
        break
      default:
        // General documents: within 3 days for strict validation
        minDays = -3
        maxDays = 7
        toleranceReason = 'Document date should be within a few days of incident'
    }

    const aligns = daysDiff >= minDays && daysDiff <= maxDays

    if (!aligns) {
      const formattedDocDate = docDate.toISOString().split('T')[0]
      const formattedIncDate = incDate.toISOString().split('T')[0]
      return {
        aligns: false,
        daysDiff,
        reason: `Date mismatch: document date (${formattedDocDate}) is ${Math.abs(daysDiff)} days ${daysDiff > 0 ? 'after' : 'before'} incident date (${formattedIncDate}). ${toleranceReason}`
      }
    }

    return { aligns: true, daysDiff, reason: 'Date is within acceptable range' }
  } catch {
    return { aligns: null, daysDiff: null, reason: 'Error parsing dates' }
  }
}

/**
 * Check if amounts align with STRICTER tolerance
 * Fix 2: Reduced from 20% to 10%, with better logic
 */
function validateAmountAlignment(
  documentAmount: number | undefined,
  claimedAmount: number | undefined
): { aligns: boolean | null; reason?: string; warning?: string } {
  if (documentAmount === undefined || claimedAmount === undefined) {
    return { aligns: null, reason: 'Missing amount data' }
  }

  // Handle zero amounts
  if (claimedAmount === 0 && documentAmount === 0) {
    return { aligns: true, reason: 'Both amounts are zero' }
  }
  if (claimedAmount === 0) {
    return { aligns: null, warning: 'Claimed amount is zero but document shows amount' }
  }

  // Strict tolerance: 10%
  const tolerance = 0.10
  const lowerBound = claimedAmount * (1 - tolerance)
  const upperBound = claimedAmount * (1 + tolerance)

  // Document amount should not significantly exceed claimed amount
  if (documentAmount > upperBound) {
    const percentOver = ((documentAmount - claimedAmount) / claimedAmount * 100).toFixed(1)
    return {
      aligns: false,
      reason: `Document amount (${documentAmount}) exceeds claimed amount (${claimedAmount}) by ${percentOver}%`,
      warning: `Document shows ${percentOver}% more than claimed - verify if additional costs should be included`
    }
  }

  // Document amount is within tolerance or less than claimed (partial receipt is OK)
  if (documentAmount <= upperBound) {
    // Warn if document amount is significantly less
    if (documentAmount < claimedAmount * 0.5) {
      return {
        aligns: true,
        warning: `Document amount (${documentAmount}) is less than 50% of claimed amount (${claimedAmount}) - additional documentation may be needed`
      }
    }
    return { aligns: true, reason: 'Amount is within acceptable range' }
  }

  return { aligns: true, reason: 'Amount validation passed' }
}

/**
 * Check if locations align using semantic matching
 * Fix 2 & 5: Uses comprehensive airport/city mappings for strict validation
 */
function validateLocationAlignment(
  documentLocation: string | undefined,
  claimLocation: string | undefined
): { aligns: boolean | null; confidence?: string; reason?: string } {
  if (!documentLocation || !claimLocation) {
    return { aligns: null, reason: 'Missing location data' }
  }

  // Use the semantic location matching function
  const result = semanticLocationMatch(documentLocation, claimLocation)

  if (result.matches) {
    return {
      aligns: true,
      confidence: result.confidence,
      reason: result.reason
    }
  }

  return {
    aligns: false,
    confidence: result.confidence,
    reason: result.reason
  }
}

/**
 * Check if document route (from/to) matches claim location
 * For flight documents, the claim location should match either origin or destination
 */
function validateRouteAgainstLocation(
  documentFrom: string | undefined,
  documentTo: string | undefined,
  claimLocation: string | undefined
): { aligns: boolean | null; matchedEndpoint?: 'from' | 'to' | 'both'; reason?: string } {
  if (!claimLocation) {
    return { aligns: null, reason: 'Missing claim location' }
  }

  if (!documentFrom && !documentTo) {
    return { aligns: null, reason: 'No route information in document' }
  }

  // Check if claim location matches either endpoint
  const fromMatch = documentFrom ? semanticLocationMatch(documentFrom, claimLocation) : null
  const toMatch = documentTo ? semanticLocationMatch(documentTo, claimLocation) : null

  if (fromMatch?.matches && toMatch?.matches) {
    return {
      aligns: true,
      matchedEndpoint: 'both',
      reason: `Claim location "${claimLocation}" matches both origin and destination`
    }
  }

  if (fromMatch?.matches) {
    return {
      aligns: true,
      matchedEndpoint: 'from',
      reason: `Claim location "${claimLocation}" matches departure: ${documentFrom}`
    }
  }

  if (toMatch?.matches) {
    return {
      aligns: true,
      matchedEndpoint: 'to',
      reason: `Claim location "${claimLocation}" matches arrival: ${documentTo}`
    }
  }

  // No match - provide detailed mismatch info
  const routeStr = [documentFrom, documentTo].filter(Boolean).join(' → ')
  return {
    aligns: false,
    reason: `Document route (${routeStr}) does not include claim location "${claimLocation}"`
  }
}

/**
 * Check if document type matches expected types
 */
function validateDocumentType(
  detectedType: string | undefined,
  expectedTypes: string[]
): boolean {
  if (!detectedType || expectedTypes.length === 0) return true

  const normalizedDetected = detectedType.toLowerCase().replace(/[-_\s]/g, '')

  return expectedTypes.filter(Boolean).some(expected => {
    const normalizedExpected = expected.toLowerCase().replace(/[-_\s]/g, '')
    return normalizedDetected.includes(normalizedExpected) ||
           normalizedExpected.includes(normalizedDetected) ||
           normalizedDetected === normalizedExpected
  })
}

/**
 * Process and validate a document against claim context and user profile
 * This is the main validation function that combines OCR extraction with validation
 */
export async function processAndValidateDocument(
  document: UploadedFile | { path: string; mimeType?: string; url?: string },
  validationContext: DocumentValidationContext
): Promise<DocumentValidationResult> {
  const startTime = Date.now()
  const documentId = 'path' in document ? document.path : 'unknown'

  // Log claim context at start
  console.log(`[processAndValidateDocument] Starting validation`, {
    documentId,
    coverageType: validationContext.claimContext.coverageType,
    incidentDate: validationContext.claimContext.incidentDate,
    incidentLocation: validationContext.claimContext.incidentLocation,
    incidentDescription: validationContext.claimContext.incidentDescription,
    userProfileName: validationContext.userProfile.fullName,
  })

  // Step 1: Extract document information using existing function
  const expectedTypes = validationContext.requiredDocuments.flatMap(r => r.documentTypes)
  const extraction = await extractDocumentInfo(
    document,
    expectedTypes[0], // Primary expected type
    {
      claimContext: {
        coverageType: validationContext.claimContext.coverageType,
        incidentDate: validationContext.claimContext.incidentDate,
        incidentLocation: validationContext.claimContext.incidentLocation,
        incidentDescription: validationContext.claimContext.incidentDescription,
      },
    }
  )

  // Log extracted entities with detailed breakdown
  console.log(`[processAndValidateDocument] Extracted entities:`, JSON.stringify(extraction.extractedEntities, null, 2))
  console.log(`[processAndValidateDocument] OCR data available: ${!!extraction.ocrData}, Length: ${extraction.ocrData?.length || 0} chars`)

  // Log key field extraction for validation
  const keyFields = ['passengerName', 'name', 'flightNumber', 'date', 'dateOfTravel', 'from', 'to', 'baggageTag', 'baggageTagNumber', 'location', 'amount']
  const extractedKeyFields = keyFields.filter(field => extraction.extractedEntities[field] !== undefined && extraction.extractedEntities[field] !== null)
  console.log(`[processAndValidateDocument] Key fields extracted: ${extractedKeyFields.join(', ')}`)
  if (extractedKeyFields.length === 0) {
    console.warn(`[processAndValidateDocument] WARNING: No key fields extracted from document - extraction may be incomplete`)
  }

  // Step 1.5: Verify extracted entities against OCR text (Anti-Hallucination)
  let ocrVerification: OCRVerificationResult | null = null
  if (extraction.ocrData && extraction.ocrData.length > 0) {
    ocrVerification = verifyExtractionAgainstOCR(
      extraction.extractedEntities,
      extraction.ocrData
    )
    console.log(`[processAndValidateDocument] OCR Verification:`, {
      verifiedCount: Object.keys(ocrVerification.verified).length,
      unverifiedCount: ocrVerification.unverified.length,
      overallConfidence: ocrVerification.overallConfidence,
      unverifiedFields: ocrVerification.unverified,
    })

    // Add OCR verification warnings
    if (ocrVerification.warnings.length > 0) {
      extraction.validationResults.warnings.push(...ocrVerification.warnings)
    }

    // If confidence is very low due to hallucination, reduce authenticity score
    if (ocrVerification.overallConfidence < 0.5) {
      console.warn(`[processAndValidateDocument] WARNING: Low OCR verification confidence (${ocrVerification.overallConfidence}) - possible hallucination detected`)
      extraction.authenticityScore = Math.min(extraction.authenticityScore ?? 0.7, 0.5)
    }
  } else {
    console.warn(`[processAndValidateDocument] WARNING: No OCR data available for verification - cannot verify extraction accuracy`)
  }

  // Step 2: Validate against user profile
  const extractedEntities = extraction.extractedEntities as Record<string, unknown>
  const extractedName = extractedEntities.passengerName as string ||
                       extractedEntities.patientName as string ||
                       extractedEntities.customerName as string ||
                       extractedEntities.name as string

  console.log(`[processAndValidateDocument] Name validation - Document: "${extractedName}", Profile: "${validationContext.userProfile.fullName}"`)

  const nameMatches = validateNameMatch(extractedName, validationContext.userProfile.fullName)

  console.log(`[processAndValidateDocument] Name match result: ${nameMatches}`)

  const profileValidation = {
    nameMatches,
    dobMatches: null as boolean | null, // Could be implemented if DOB extraction is available
    discrepancies: [] as string[],
  }

  if (nameMatches === false) {
    profileValidation.discrepancies.push(
      `Name on document (${extractedName}) does not match profile name (${validationContext.userProfile.fullName})`
    )
  }

  // Step 3: Validate against claim context
  const extractedDate = extractedEntities.date as string ||
                       extractedEntities.documentDate as string ||
                       extractedEntities.issueDate as string ||
                       extractedEntities.travelDate as string ||
                       extractedEntities.dateOfTravel as string
  const extractedAmount = extractedEntities.amount as number ||
                         extractedEntities.totalAmount as number ||
                         extractedEntities.total as number

  // Extract location fields from document
  const extractedFrom = extractedEntities.from as string ||
                       extractedEntities.origin as string ||
                       extractedEntities.originAirport as string
  const extractedTo = extractedEntities.to as string ||
                     extractedEntities.destination as string ||
                     extractedEntities.destinationAirport as string
  const extractedLocation = extractedEntities.location as string ||
                           extractedFrom ||
                           extractedTo ||
                           extractedEntities.airport as string

  // Date validation with new stricter function
  console.log(`[processAndValidateDocument] Date validation - Document: "${extractedDate}", Claim: "${validationContext.claimContext.incidentDate}"`)
  const detectedType = extraction.documentType || 'unknown'
  const dateValidation = validateDateAlignment(
    extractedDate,
    validationContext.claimContext.incidentDate,
    detectedType
  )
  const dateAligns = dateValidation.aligns
  console.log(`[processAndValidateDocument] Date alignment result:`, dateValidation)

  // Location validation with enhanced semantic matching
  console.log(`[processAndValidateDocument] Location validation - Document: "${extractedLocation}" (from: "${extractedFrom}", to: "${extractedTo}"), Claim: "${validationContext.claimContext.incidentLocation}"`)

  // Validate location - use route validation for flight documents, otherwise direct location match
  let locationAligns: boolean | null = null
  let locationValidationReason: string | undefined

  if (validationContext.claimContext.incidentLocation) {
    // For documents with route info (from/to), use route validation
    if (extractedFrom || extractedTo) {
      const routeValidation = validateRouteAgainstLocation(
        extractedFrom,
        extractedTo,
        validationContext.claimContext.incidentLocation
      )
      locationAligns = routeValidation.aligns
      locationValidationReason = routeValidation.reason
      console.log(`[processAndValidateDocument] Route validation:`, routeValidation)
    } else {
      // Direct location comparison
      const locationValidation = validateLocationAlignment(
        extractedLocation,
        validationContext.claimContext.incidentLocation
      )
      locationAligns = locationValidation.aligns
      locationValidationReason = locationValidation.reason
      console.log(`[processAndValidateDocument] Direct location validation:`, locationValidation)
    }
  }

  console.log(`[processAndValidateDocument] Location alignment result: ${locationAligns}, Reason: ${locationValidationReason}`)

  // Amount validation with new stricter function
  const amountValidation = validateAmountAlignment(
    extractedAmount,
    validationContext.claimContext.claimedAmount
  )
  const amountAligns = amountValidation.aligns
  console.log(`[processAndValidateDocument] Amount alignment result:`, amountValidation)

  // Check flight number if provided in claim description
  let flightNumberMatches: boolean | null = null
  const extractedFlightNumber = extractedEntities.flightNumber as string ||
                               extractedEntities.flight_number as string ||
                               extractedEntities.flight as string
  if (extractedFlightNumber && validationContext.claimContext.incidentDescription) {
    const descLower = validationContext.claimContext.incidentDescription.toLowerCase()
    const flightLower = extractedFlightNumber.toLowerCase()
    flightNumberMatches = descLower.includes(flightLower) || flightLower.includes(descLower.split(/\s+/).find(w => w.length >= 3) || '')
    console.log(`[processAndValidateDocument] Flight number validation - Document: "${extractedFlightNumber}", Description contains flight: ${flightNumberMatches}`)
  }

  const contextValidation = {
    dateAligns,
    amountAligns,
    locationAligns,
    discrepancies: [] as string[],
  }

  // Add detailed discrepancies with reasons from validation functions
  if (dateAligns === false && dateValidation.reason) {
    contextValidation.discrepancies.push(dateValidation.reason)
  } else if (dateAligns === false) {
    contextValidation.discrepancies.push(
      `Document date (${extractedDate}) does not align with incident date (${validationContext.claimContext.incidentDate})`
    )
  }

  if (locationAligns === false && locationValidationReason) {
    contextValidation.discrepancies.push(locationValidationReason)
  } else if (locationAligns === false) {
    const locationDetails = [extractedFrom, extractedTo, extractedLocation].filter(Boolean).join(', ')
    contextValidation.discrepancies.push(
      `Document location (${locationDetails}) does not match incident location (${validationContext.claimContext.incidentLocation})`
    )
  }

  if (amountAligns === false && amountValidation.reason) {
    contextValidation.discrepancies.push(amountValidation.reason)
  } else if (amountAligns === false) {
    contextValidation.discrepancies.push(
      `Document amount (${extractedAmount}) significantly differs from claimed amount (${validationContext.claimContext.claimedAmount})`
    )
  }

  // Add amount warnings (even if amount aligns)
  if (amountValidation.warning) {
    contextValidation.discrepancies.push(amountValidation.warning)
  }

  // Step 4: Validate document type (detectedType already defined above)
  const isExpectedType = validateDocumentType(detectedType, expectedTypes)

  const documentTypeValidation = {
    isExpectedType,
    detectedType,
    expectedTypes,
  }

  // Step 4.5: Apply rules-based validation (Fix 6)
  let rulesValidation: { isValid: boolean; errors: string[]; warnings: string[]; appliedRules: string[] } | null = null
  if (validationContext.claimContext.coverageTypeId) {
    try {
      rulesValidation = await applyValidationRules(
        validationContext.claimContext.coverageTypeId,
        {
          documentType: detectedType,
          extractedData: extractedEntities,
          ocrData: extraction.ocrData,
        },
        {
          coverageType: validationContext.claimContext.coverageType,
          coverageTypeId: validationContext.claimContext.coverageTypeId,
          incidentDate: validationContext.claimContext.incidentDate,
          incidentLocation: validationContext.claimContext.incidentLocation,
          claimedAmount: validationContext.claimContext.claimedAmount,
          incidentDescription: validationContext.claimContext.incidentDescription,
        }
      )
      console.log(`[processAndValidateDocument] Rules validation result:`, {
        isValid: rulesValidation.isValid,
        appliedRules: rulesValidation.appliedRules,
        errorsCount: rulesValidation.errors.length,
        warningsCount: rulesValidation.warnings.length,
      })
    } catch (rulesError) {
      console.error(`[processAndValidateDocument] Rules validation error:`, rulesError)
      // Continue without rules validation on error
    }
  }

  // Step 5: Compile validation errors and warnings
  const validationErrors: string[] = [...extraction.validationResults.errors]
  const validationWarnings: string[] = [...extraction.validationResults.warnings]

  // Add profile validation issues
  if (profileValidation.discrepancies.length > 0) {
    validationWarnings.push(...profileValidation.discrepancies)
  }

  // Add context validation issues
  if (contextValidation.discrepancies.length > 0) {
    validationWarnings.push(...contextValidation.discrepancies)
  }

  // Add rules-based validation issues (Fix 6)
  if (rulesValidation) {
    if (rulesValidation.errors.length > 0) {
      validationErrors.push(...rulesValidation.errors)
    }
    if (rulesValidation.warnings.length > 0) {
      validationWarnings.push(...rulesValidation.warnings)
    }
  }

  // Add document type issues
  if (!isExpectedType && expectedTypes.length > 0) {
    validationErrors.push(
      `Document type "${detectedType}" does not match expected types: ${expectedTypes.join(', ')}`
    )
  }

  // Authenticity issues
  if (extraction.tamperingDetected) {
    validationErrors.push('Document may have been tampered with')
  }

  if ((extraction.authenticityScore ?? 0.7) < 0.5) {
    validationErrors.push('Document authenticity could not be verified')
  }

  // Step 6: Determine overall status
  let overallStatus: DocumentValidationStatus = 'valid'
  let reuploadReason: string | undefined
  let reuploadGuidance: string | undefined

  console.log(`[processAndValidateDocument] Determining status - Date aligns: ${dateAligns}, Location aligns: ${locationAligns}, Name matches: ${nameMatches}, Context matches: ${extraction.contextMatches}`)

  // Critical issues that require re-upload
  if (!isExpectedType && expectedTypes.length > 0) {
    overallStatus = 'reupload_required'
    reuploadReason = `This appears to be a ${detectedType}, but I need a ${expectedTypes.join(' or ')}`
    reuploadGuidance = generateReuploadMessage(detectedType, expectedTypes, '')
    console.log(`[processAndValidateDocument] Status: reupload_required - Wrong document type`)
  } else if (extraction.tamperingDetected) {
    overallStatus = 'invalid'
    reuploadReason = 'Document appears to have been modified'
    reuploadGuidance = 'Please upload an original, unmodified document'
    console.log(`[processAndValidateDocument] Status: invalid - Tampering detected`)
  } else if ((extraction.authenticityScore ?? 0.7) < 0.5) {
    overallStatus = 'invalid'
    reuploadReason = 'Document could not be verified as authentic'
    reuploadGuidance = 'Please upload a clearer image of the original document'
    console.log(`[processAndValidateDocument] Status: invalid - Low authenticity score`)
  } else if (!extraction.isRelevant) {
    overallStatus = 'reupload_required'
    reuploadReason = 'This document does not appear to be relevant to your claim'
    reuploadGuidance = `Please upload a document related to your ${validationContext.claimContext.coverageType} claim`
    console.log(`[processAndValidateDocument] Status: reupload_required - Not relevant`)
  } else if (nameMatches === false) {
    // Name mismatch is a critical issue that requires re-upload
    overallStatus = 'reupload_required'
    reuploadReason = 'The name on the document doesn\'t match your profile name'
    reuploadGuidance = `Please upload a document with the name "${validationContext.userProfile.fullName}" or update your profile if the name on the document is correct.`
    console.log(`[processAndValidateDocument] Status: reupload_required - Name mismatch`)
  } else if (dateAligns === false) {
    // Date mismatch is critical - requires re-upload
    overallStatus = 'reupload_required'
    reuploadReason = `The date on the document (${extractedDate}) does not match your incident date (${validationContext.claimContext.incidentDate})`
    reuploadGuidance = `Please upload a document that matches your incident date of ${validationContext.claimContext.incidentDate}`
    console.log(`[processAndValidateDocument] Status: reupload_required - Date mismatch`)
  } else if (locationAligns === false) {
    // Location mismatch is critical - requires re-upload
    const locationDetails = [extractedFrom, extractedTo, extractedLocation].filter(Boolean).join(', ')
    overallStatus = 'reupload_required'
    reuploadReason = `The location on the document (${locationDetails}) does not match your incident location (${validationContext.claimContext.incidentLocation})`
    reuploadGuidance = `Please upload a document that matches your incident location of ${validationContext.claimContext.incidentLocation}`
    console.log(`[processAndValidateDocument] Status: reupload_required - Location mismatch`)
  } else if (!extraction.contextMatches) {
    // General context mismatch - requires re-upload
    overallStatus = 'reupload_required'
    reuploadReason = 'The information on the document does not match your claim details'
    reuploadGuidance = 'Please upload a document that matches your claim information (date, location, flight details, etc.)'
    console.log(`[processAndValidateDocument] Status: reupload_required - Context mismatch`)
  } else if (validationErrors.length > 0) {
    overallStatus = 'invalid'
    console.log(`[processAndValidateDocument] Status: invalid - Validation errors: ${validationErrors.join(', ')}`)
  } else if (validationWarnings.length > 0) {
    overallStatus = 'needs_review'
    console.log(`[processAndValidateDocument] Status: needs_review - Warnings: ${validationWarnings.join(', ')}`)
  } else {
    console.log(`[processAndValidateDocument] Status: valid - All checks passed`)
  }

  // Step 7: Generate user-friendly message
  const validationMessage = getValidationMessage(
    overallStatus,
    detectedType,
    expectedTypes[0],
    validationErrors,
    validationWarnings
  )

  const elapsedTime = Date.now() - startTime
  
  // Final comprehensive log
  console.log(`[processAndValidateDocument] Validation completed in ${elapsedTime}ms`, {
    documentId,
    status: overallStatus,
    detectedType: detectedType,
    nameMatches,
    dateAligns,
    locationAligns,
    amountAligns,
    contextMatches: extraction.contextMatches,
    errorsCount: validationErrors.length,
    warningsCount: validationWarnings.length,
    extractedEntities: Object.keys(extraction.extractedEntities),
    reuploadReason,
    validationErrors,
    validationWarnings,
  })

  return {
    extraction,
    profileValidation,
    contextValidation,
    documentTypeValidation,
    overallStatus,
    validationErrors,
    validationWarnings,
    reuploadReason,
    reuploadGuidance,
    userMessage: validationMessage.message + (validationMessage.guidance ? ` ${validationMessage.guidance}` : ''),
  }
}

/**
 * Validate document type and format
 */
export function validateDocumentFormat(
  file: UploadedFile | { path: string; mimeType?: string; size?: number },
  allowedTypes?: string[],
  maxSize?: number
): { isValid: boolean; error?: string } {
  const mimeType = 'mimeType' in file ? file.mimeType : ('type' in file ? file.type : undefined)
  
  if (allowedTypes && mimeType && !allowedTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `Document type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  const fileSize = 'size' in file ? file.size : undefined
  if (maxSize && fileSize && fileSize > maxSize) {
    return {
      isValid: false,
      error: `Document size ${fileSize} bytes exceeds maximum ${maxSize} bytes`,
    }
  }

  return { isValid: true }
}
