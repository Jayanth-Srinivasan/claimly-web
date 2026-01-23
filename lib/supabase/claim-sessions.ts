import { createClient } from './server'
import { createClaim, generateClaimNumber } from './claims'
import type { Json } from '@/types/database'

/**
 * Claim Session Types
 */
export type ClaimSessionStage = 'gathering_info' | 'reviewing_summary' | 'submitted'

export interface ClaimSessionAnswer {
  value: string | number | string[]
  type: 'text' | 'date' | 'number' | 'select' | 'file'
  label: string
  /** Source of the answer: 'user_input' (default) or 'document_extraction' */
  source?: 'user_input' | 'document_extraction'
  /** Document ID if source is 'document_extraction' */
  document_id?: string
  /** Confidence level for document extractions */
  confidence?: 'high' | 'medium' | 'low'
}

export interface ClaimSession {
  id: string
  chat_session_id: string
  user_id: string
  policy_id: string | null
  stage: string
  incident_type: string | null
  incident_description: string | null
  incident_date: string | null
  incident_location: string | null
  coverage_type_ids: string[] | null
  answers: Json | null
  questions_asked: string[] | null
  claim_id: string | null
  claim_number: string | null
  created_at: string | null
  updated_at: string | null
  submitted_at: string | null
}

export interface ClaimSessionInsert {
  chat_session_id: string
  user_id: string
  policy_id?: string | null
  stage?: string
  incident_type?: string | null
  incident_description?: string | null
  incident_date?: string | null
  incident_location?: string | null
  coverage_type_ids?: string[] | null
  answers?: Json | null
  questions_asked?: string[] | null
}

export interface ClaimSessionUpdate {
  policy_id?: string | null
  stage?: string
  incident_type?: string | null
  incident_description?: string | null
  incident_date?: string | null
  incident_location?: string | null
  coverage_type_ids?: string[] | null
  answers?: Json | null
  questions_asked?: string[] | null
  claim_id?: string | null
  claim_number?: string | null
  submitted_at?: string | null
}

/**
 * Get or create a claim session for a chat session
 */
export async function getOrCreateSession(
  chatSessionId: string,
  userId: string
): Promise<ClaimSession> {
  const supabase = await createClient()

  // Try to get existing session
  const { data: existing, error: fetchError } = await supabase
    .from('claim_sessions')
    .select('*')
    .eq('chat_session_id', chatSessionId)
    .single()

  if (existing && !fetchError) {
    return existing as ClaimSession
  }

  // Create new session
  const { data: newSession, error: insertError } = await supabase
    .from('claim_sessions')
    .insert({
      chat_session_id: chatSessionId,
      user_id: userId,
      stage: 'gathering_info',
      answers: {},
      questions_asked: [],
      coverage_type_ids: [],
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to create claim session: ${insertError.message}`)
  }

  return newSession as ClaimSession
}

/**
 * Get a claim session by ID
 */
export async function getSession(id: string): Promise<ClaimSession | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch claim session: ${error.message}`)
  }

  return data as ClaimSession
}

/**
 * Get a claim session by chat session ID
 */
export async function getSessionByChatId(
  chatSessionId: string
): Promise<ClaimSession | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claim_sessions')
    .select('*')
    .eq('chat_session_id', chatSessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch claim session: ${error.message}`)
  }

  return data as ClaimSession
}

/**
 * Update a claim session
 */
export async function updateSession(
  id: string,
  updates: ClaimSessionUpdate
): Promise<ClaimSession> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('claim_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update claim session: ${error.message}`)
  }

  return data as ClaimSession
}

/**
 * Update session by chat session ID
 */
export async function updateSessionByChatId(
  chatSessionId: string,
  updates: ClaimSessionUpdate
): Promise<ClaimSession> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('claim_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('chat_session_id', chatSessionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update claim session: ${error.message}`)
  }

  return data as ClaimSession
}

/**
 * Add an answer to the session
 */
export async function addAnswer(
  sessionId: string,
  key: string,
  answer: ClaimSessionAnswer
): Promise<ClaimSession> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Claim session not found')
  }

  const currentAnswers = (session.answers as unknown as Record<string, ClaimSessionAnswer>) || {}
  const updatedAnswers = {
    ...currentAnswers,
    [key]: answer,
  }

  return updateSession(sessionId, { answers: updatedAnswers as unknown as Json })
}

/**
 * Mark a question as asked
 */
export async function markQuestionAsked(
  sessionId: string,
  questionId: string
): Promise<ClaimSession> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Claim session not found')
  }

  const currentQuestions = session.questions_asked || []
  if (currentQuestions.includes(questionId)) {
    return session
  }

  const updatedQuestions = [...currentQuestions, questionId]
  return updateSession(sessionId, { questions_asked: updatedQuestions })
}

/**
 * Submit the claim - creates final claim record
 */
export async function submitClaim(sessionId: string): Promise<{
  claimId: string
  claimNumber: string
}> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Claim session not found')
  }

  if (session.stage === 'submitted') {
    throw new Error('Claim has already been submitted')
  }

  // Generate claim number
  const claimNumber = await generateClaimNumber()

  // Determine total claimed amount from answers
  let totalClaimedAmount = 0
  const answers = (session.answers as unknown as Record<string, ClaimSessionAnswer>) || {}
  for (const [key, answer] of Object.entries(answers)) {
    if (key.toLowerCase().includes('amount') && typeof answer.value === 'number') {
      totalClaimedAmount += answer.value
    }
  }

  // Create the final claim
  const claim = await createClaim({
    user_id: session.user_id,
    claim_number: claimNumber,
    chat_session_id: session.chat_session_id,
    policy_id: session.policy_id,
    coverage_type_ids: session.coverage_type_ids || [],
    incident_type: session.incident_type || 'general',
    incident_description: session.incident_description || '',
    incident_date: session.incident_date || new Date().toISOString(),
    incident_location: session.incident_location || 'Not specified',
    total_claimed_amount: totalClaimedAmount,
    currency: 'USD',
    status: 'pending',
  })

  // Update session with final claim details
  await updateSession(sessionId, {
    stage: 'submitted',
    claim_id: claim.id,
    claim_number: claimNumber,
    submitted_at: new Date().toISOString(),
  })

  // Move documents from session to claim
  const supabase = await createClient()
  await supabase
    .from('claim_documents')
    .update({ claim_id: claim.id })
    .eq('claim_session_id', sessionId)

  return {
    claimId: claim.id,
    claimNumber: claimNumber,
  }
}

/**
 * Format extracted document information for display
 */
function formatDocumentExtractedInfo(
  extractedData: Record<string, unknown> | null,
  documentType: string | null,
  fileName: string
): string[] {
  if (!extractedData || typeof extractedData !== 'object') {
    return []
  }

  const lines: string[] = []
  const data = extractedData as Record<string, unknown>

  // Common field mappings
  const fieldMappings: Record<string, { label: string; formatter?: (val: unknown) => string }> = {
    // Passenger/Person info
    passengerName: { label: 'Passenger Name' },
    passenger_name: { label: 'Passenger Name' },
    patientName: { label: 'Patient Name' },
    patient_name: { label: 'Patient Name' },
    customerName: { label: 'Customer Name' },
    customer_name: { label: 'Customer Name' },
    name: { label: 'Name' },
    
    // Flight info
    flightNumber: { label: 'Flight Number' },
    flight_number: { label: 'Flight Number' },
    airline: { label: 'Airline' },
    route: { label: 'Route' },
    from: { label: 'From' },
    to: { label: 'To' },
    departureDate: { label: 'Departure Date' },
    departure_date: { label: 'Departure Date' },
    arrivalDate: { label: 'Arrival Date' },
    arrival_date: { label: 'Arrival Date' },
    
    // Baggage info
    baggageTag: { label: 'Baggage Tag' },
    baggage_tag: { label: 'Baggage Tag' },
    baggageTagNumber: { label: 'Baggage Tag Number' },
    baggage_tag_number: { label: 'Baggage Tag Number' },
    bagType: { label: 'Bag Type' },
    bag_type: { label: 'Bag Type' },
    bagDescription: { label: 'Bag Description' },
    bag_description: { label: 'Bag Description' },
    bagTypeDescription: { label: 'Bag Description' },
    bag_type_description: { label: 'Bag Description' },
    
    // Reference numbers
    referenceNumber: { label: 'Reference Number' },
    reference_number: { label: 'Reference Number' },
    pirNumber: { label: 'PIR Number' },
    pir_number: { label: 'PIR Number' },
    bookingReference: { label: 'Booking Reference' },
    booking_reference: { label: 'Booking Reference' },
    ticketNumber: { label: 'Ticket Number' },
    ticket_number: { label: 'Ticket Number' },
    
    // Dates
    date: { label: 'Date', formatter: (val) => {
      if (typeof val === 'string') {
        try {
          return new Date(val).toLocaleDateString()
        } catch {
          return String(val)
        }
      }
      return String(val)
    }},
    documentDate: { label: 'Document Date', formatter: (val) => {
      if (typeof val === 'string') {
        try {
          return new Date(val).toLocaleDateString()
        } catch {
          return String(val)
        }
      }
      return String(val)
    }},
    issueDate: { label: 'Issue Date', formatter: (val) => {
      if (typeof val === 'string') {
        try {
          return new Date(val).toLocaleDateString()
        } catch {
          return String(val)
        }
      }
      return String(val)
    }},
    travelDate: { label: 'Travel Date', formatter: (val) => {
      if (typeof val === 'string') {
        try {
          return new Date(val).toLocaleDateString()
        } catch {
          return String(val)
        }
      }
      return String(val)
    }},
    dateOfTravel: { label: 'Date of Travel', formatter: (val) => {
      if (typeof val === 'string') {
        try {
          return new Date(val).toLocaleDateString()
        } catch {
          return String(val)
        }
      }
      return String(val)
    }},
    
    // Amounts
    amount: { label: 'Amount', formatter: (val) => {
      if (typeof val === 'number') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
      }
      return String(val)
    }},
    totalAmount: { label: 'Total Amount', formatter: (val) => {
      if (typeof val === 'number') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
      }
      return String(val)
    }},
    total: { label: 'Total', formatter: (val) => {
      if (typeof val === 'number') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
      }
      return String(val)
    }},
    
    // Medical info
    diagnosis: { label: 'Diagnosis' },
    treatment: { label: 'Treatment' },
    doctorName: { label: 'Doctor Name' },
    doctor_name: { label: 'Doctor Name' },
    hospitalName: { label: 'Hospital Name' },
    hospital_name: { label: 'Hospital Name' },
  }

  // Extract and format fields
  const processedKeys = new Set<string>()
  for (const [key, mapping] of Object.entries(fieldMappings)) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      const value = mapping.formatter 
        ? mapping.formatter(data[key])
        : String(data[key])
      lines.push(`  - ${mapping.label}: ${value}`)
      processedKeys.add(key)
    }
  }

  // Fallback: Show any remaining extracted fields that weren't in our mappings
  // This helps with debugging and ensures we show all extracted information
  for (const [key, value] of Object.entries(data)) {
    if (!processedKeys.has(key) && value !== undefined && value !== null && value !== '') {
      // Skip internal/technical fields
      if (!key.startsWith('_') && key !== 'ocrData' && key !== 'autoFilledFields') {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
        lines.push(`  - ${formattedKey}: ${String(value)}`)
      }
    }
  }

  // If we have extracted info, add document context
  if (lines.length > 0) {
    const docTypeLabel = documentType 
      ? documentType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : 'Document'
    return [
      `**From ${docTypeLabel} (${fileName}):**`,
      ...lines,
    ]
  }

  return []
}

/**
 * Get claim session with summary data for review
 */
export async function getSessionSummary(sessionId: string): Promise<{
  session: ClaimSession
  documentsCount: number
  formattedSummary: string
}> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Claim session not found')
  }

  const supabase = await createClient()

  // Count documents
  const { count } = await supabase
    .from('claim_documents')
    .select('*', { count: 'exact', head: true })
    .eq('claim_session_id', sessionId)

  // Fetch documents with extracted data (include all statuses that might have extracted_data)
  const { data: documents, error: documentsError } = await supabase
    .from('claim_documents')
    .select('file_name, detected_document_type, extracted_data, validation_status')
    .eq('claim_session_id', sessionId)
    .not('extracted_data', 'is', null)
    .order('uploaded_at', { ascending: false })

  console.log(`[getSessionSummary] Fetched ${documents?.length || 0} documents for session ${sessionId}`)
  if (documentsError) {
    console.error(`[getSessionSummary] Error fetching documents:`, documentsError)
  }

  // Format summary
  const lines: string[] = [
    '## Claim Summary',
    '',
    `**Incident Type:** ${session.incident_type || 'Not specified'}`,
    `**Date:** ${session.incident_date || 'Not specified'}`,
    `**Location:** ${session.incident_location || 'Not specified'}`,
    '',
    '**Description:**',
    session.incident_description || 'No description provided',
    '',
    '**Collected Information:**',
  ]

  const answers = (session.answers as unknown as Record<string, ClaimSessionAnswer>) || {}
  for (const [key, answer] of Object.entries(answers)) {
    const formattedValue = Array.isArray(answer.value)
      ? answer.value.join(', ')
      : String(answer.value)
    lines.push(`- ${answer.label}: ${formattedValue}`)
  }

  // Add document information section
  const documentInfoLines: string[] = []
  if (documents && documents.length > 0) {
    console.log(`[getSessionSummary] Processing ${documents.length} documents for extracted data`)
    for (const doc of documents) {
      console.log(`[getSessionSummary] Document: ${doc.file_name}, Has extracted_data: ${!!doc.extracted_data}, Type: ${doc.detected_document_type}`)
      const extractedData = doc.extracted_data as Record<string, unknown> | null
      if (extractedData) {
        console.log(`[getSessionSummary] Extracted data for ${doc.file_name}:`, JSON.stringify(extractedData, null, 2))
        const formattedInfo = formatDocumentExtractedInfo(
          extractedData,
          doc.detected_document_type,
          doc.file_name
        )
        console.log(`[getSessionSummary] Formatted info for ${doc.file_name}:`, formattedInfo)
        if (formattedInfo.length > 0) {
          documentInfoLines.push(...formattedInfo)
          documentInfoLines.push('') // Add spacing between documents
        } else {
          console.log(`[getSessionSummary] No formatted info generated for ${doc.file_name} - extracted data may not match expected fields`)
        }
      } else {
        console.log(`[getSessionSummary] Document ${doc.file_name} has no extracted_data`)
      }
    }
  } else {
    console.log(`[getSessionSummary] No documents found or documents array is empty`)
  }

  if (documentInfoLines.length > 0) {
    lines.push('')
    lines.push('**Document Information:**')
    lines.push('')
    // Remove the last empty line
    if (documentInfoLines[documentInfoLines.length - 1] === '') {
      documentInfoLines.pop()
    }
    lines.push(...documentInfoLines)
  }

  lines.push('')
  lines.push(`**Documents Uploaded:** ${count || 0}`)

  return {
    session,
    documentsCount: count || 0,
    formattedSummary: lines.join('\n'),
  }
}
