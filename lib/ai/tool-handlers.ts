import { createClient } from '@/lib/supabase/server'
import { getUserPolicies, getActiveUserPolicies } from '@/lib/supabase/user-policies'
import { getPolicy, getPolicyWithCoverageTypes, getPolicies, getActivePoliciesWithCoverageTypes } from '@/lib/supabase/policies'
import { getCoverageTypes, getCoverageType } from '@/lib/supabase/coverage-types'
import type { Json } from '@/types/database'
import {
  getOrCreateSession,
  getSessionByChatId,
  updateSessionByChatId,
  addAnswer,
  markQuestionAsked,
  submitClaim,
  getSessionSummary,
  type ClaimSessionAnswer,
} from '@/lib/supabase/claim-sessions'
import {
  uploadDocument,
  getSessionDocuments,
  updateOcrData,
  getDocument,
  updateDocumentValidation,
} from '@/lib/supabase/claim-documents'
import {
  createClaim,
  generateClaimNumber,
  updateClaim,
  updateClaimStatus,
} from '@/lib/supabase/claims'
import {
  detectTone,
} from '@/lib/ai/tone-detector'
import {
  processAndValidateDocument,
  type DocumentValidationStatus,
} from '@/lib/ai/document-processor'
import {
  formatRequiredDocumentsMessage,
  getCompletenessMessage,
  DOCUMENT_TYPES,
} from '@/lib/ai/document-validation-messages'
import type { DocumentRequirement, RuleAction } from '@/types/rules'

/**
 * Tool handler result type
 */
export interface ToolHandlerResult {
  success: boolean
  data?: unknown
  error?: string
}

// ============================================================
// POLICY MODE HANDLERS (unchanged)
// ============================================================

/**
 * Get user's active policies (Policy Mode)
 */
export async function handleGetUserPolicies(
  userId: string
): Promise<ToolHandlerResult> {
  try {
    const policies = await getActiveUserPolicies(userId)

    if (policies.length === 0) {
      return {
        success: true,
        data: {
          policies: [],
          message: 'You currently have no active policies. Use suggest_policies to find policies that match your needs.',
        },
      }
    }

    const supabase = await createClient()
    const policiesWithDetails = await Promise.all(
      policies.map(async (policy) => {
        const { data: coverageTypesData } = await supabase
          .from('policy_coverage_types')
          .select(`
            coverage_limit,
            deductible,
            is_optional,
            additional_premium,
            coverage_type:coverage_types (
              id,
              name,
              description,
              category
            )
          `)
          .eq('policy_id', policy.policy_id)

        return {
          ...policy,
          coverage_details: coverageTypesData || [],
        }
      })
    )

    return {
      success: true,
      data: {
        policies: policiesWithDetails,
        count: policiesWithDetails.length,
        message: `You have ${policiesWithDetails.length} active policy(ies).`,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user policies',
    }
  }
}

/**
 * Get policy details (Policy Mode)
 */
export async function handleGetPolicyDetails(
  policyId: string
): Promise<ToolHandlerResult> {
  try {
    const policy = await getPolicyWithCoverageTypes(policyId)
    if (!policy) {
      return {
        success: false,
        error: 'Policy not found',
      }
    }

    const formattedData = {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      premium: policy.premium,
      currency: policy.currency || 'USD',
      deductible: policy.deductible,
      premium_frequency: policy.premium_frequency,
      policy_term_months: policy.policy_term_months,
      exclusions: policy.exclusions || [],
      coverage_details: (policy.policy_coverage_types || []).map((pct: any) => ({
        coverage_type_name: pct.coverage_type?.name || 'Unknown',
        coverage_type_description: pct.coverage_type?.description || null,
        coverage_type_category: pct.coverage_type?.category || null,
        coverage_limit: pct.coverage_limit,
        deductible: pct.deductible,
        is_optional: pct.is_optional,
        additional_premium: pct.additional_premium,
      })),
    }

    return {
      success: true,
      data: formattedData,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch policy details',
    }
  }
}

/**
 * Get coverage usage (Policy Mode)
 */
export async function handleGetCoverageUsage(
  userPolicyId: string
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_policies')
      .select('coverage_items')
      .eq('id', userPolicyId)
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'User policy not found',
      }
    }

    const coverageItems = data.coverage_items as Array<{
      name: string
      total_limit: number
      used_limit?: number
    }>

    return {
      success: true,
      data: {
        coverageItems: coverageItems.map((item) => ({
          name: item.name,
          totalLimit: item.total_limit,
          usedLimit: item.used_limit || 0,
          availableLimit: item.total_limit - (item.used_limit || 0),
          usagePercentage: ((item.used_limit || 0) / item.total_limit) * 100,
        })),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch coverage usage',
    }
  }
}

/**
 * Suggest policies (Policy Mode)
 */
export async function handleSuggestPolicies(
  coverageTypes?: string[],
  minCoverageLimit?: number,
  maxPremium?: number
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()

    const { data: policiesData, error: policiesError } = await supabase
      .from('policies')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (policiesError) {
      throw new Error(`Failed to fetch policies: ${policiesError.message}`)
    }

    if (!policiesData || policiesData.length === 0) {
      return {
        success: true,
        data: {
          suggestions: [],
          message: 'No active policies found in the database.',
        },
      }
    }

    let filtered = policiesData

    // Filter by coverage types if provided
    if (coverageTypes && coverageTypes.length > 0) {
      const coverageTypeIds: string[] = []

      for (const ct of coverageTypes) {
        if (ct.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          coverageTypeIds.push(ct)
        } else {
          const { data: coverageTypeData } = await supabase
            .from('coverage_types')
            .select('id')
            .or(`name.ilike.%${ct}%,slug.ilike.%${ct}%`)
            .eq('is_active', true)
            .limit(1)

          if (coverageTypeData && coverageTypeData.length > 0) {
            coverageTypeIds.push(coverageTypeData[0].id)
          }
        }
      }

      if (coverageTypeIds.length > 0) {
        const { data: policyCoverageData } = await supabase
          .from('policy_coverage_types')
          .select('policy_id, coverage_type_id')
          .in('coverage_type_id', coverageTypeIds)

        if (policyCoverageData) {
          const matchingPolicyIds = new Set(
            policyCoverageData.map((pc: { policy_id: string }) => pc.policy_id)
          )
          filtered = filtered.filter((p: { id: string }) => matchingPolicyIds.has(p.id))
        }
      }
    }

    // Filter by premium if provided
    if (maxPremium !== undefined) {
      filtered = filtered.filter((p: { premium: number | null }) => {
        const premium = p.premium || 0
        return premium <= maxPremium
      })
    }

    // Get coverage type details for each policy
    const suggestions = await Promise.all(
      filtered.map(async (policy: any) => {
        const fullPolicy = await getPolicyWithCoverageTypes(policy.id)
        const coverageList = (fullPolicy?.policy_coverage_types || []).map((pct: any) => ({
          name: pct.coverage_type?.name || 'Unknown Coverage',
          limit: pct.coverage_limit,
          deductible: pct.deductible,
          is_optional: pct.is_optional,
        }))

        return {
          id: policy.id,
          name: policy.name,
          description: policy.description,
          premium: policy.premium,
          currency: policy.currency || 'USD',
          coverage_list: coverageList,
        }
      })
    )

    return {
      success: true,
      data: {
        suggestions,
        count: suggestions.length,
        message: suggestions.length > 0
          ? `Found ${suggestions.length} matching policy(ies).`
          : 'No policies match your requirements.',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to suggest policies',
    }
  }
}

// ============================================================
// CLAIMS MODE HANDLERS (simplified with new architecture)
// ============================================================

/**
 * Update claim session - Main handler for storing claim data
 * Handles: stage transitions, incident info, answers, questions asked
 */
export async function handleUpdateClaimSession(
  sessionId: string,
  updates: {
    stage?: 'gathering_info' | 'reviewing_summary' | 'submitted'
    incident_type?: string
    incident_description?: string
    incident_date?: string
    incident_location?: string
    coverage_type_ids?: string[]
    policy_id?: string
    answer_key?: string
    answer?: ClaimSessionAnswer
    question_asked?: string
  }
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get or create session
    const session = await getOrCreateSession(sessionId, user.id)

    // Build update object
    const sessionUpdates: Record<string, any> = {}

    if (updates.stage) sessionUpdates.stage = updates.stage
    if (updates.incident_type) sessionUpdates.incident_type = updates.incident_type
    if (updates.incident_description) sessionUpdates.incident_description = updates.incident_description
    if (updates.incident_date) sessionUpdates.incident_date = updates.incident_date
    if (updates.incident_location) sessionUpdates.incident_location = updates.incident_location
    if (updates.coverage_type_ids) sessionUpdates.coverage_type_ids = updates.coverage_type_ids
    if (updates.policy_id) sessionUpdates.policy_id = updates.policy_id

    // Handle answer addition
    if (updates.answer_key && updates.answer) {
      const currentAnswers = (session.answers as Record<string, unknown>) || {}
      const updatedAnswers = {
        ...currentAnswers,
        [updates.answer_key]: updates.answer,
      }
      sessionUpdates.answers = updatedAnswers
    }

    // Handle question tracking
    const currentQuestions = session.questions_asked || []
    if (updates.question_asked && !currentQuestions.includes(updates.question_asked)) {
      sessionUpdates.questions_asked = [...currentQuestions, updates.question_asked]
    }

    // Update session if there are changes
    if (Object.keys(sessionUpdates).length > 0) {
      await updateSessionByChatId(sessionId, sessionUpdates)
    }

    return {
      success: true,
      data: {
        message: 'Session updated',
        session_id: session.id,
        stage: updates.stage || session.stage,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update claim session',
    }
  }
}

/**
 * Get claim session state
 */
export async function handleGetClaimSession(
  sessionId: string
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const session = await getOrCreateSession(sessionId, user.id)

    const answers = (session.answers as Record<string, unknown>) || {}
    const questionsAsked = session.questions_asked || []

    return {
      success: true,
      data: {
        session,
        stage: session.stage,
        has_answers: Object.keys(answers).length > 0,
        questions_asked_count: questionsAsked.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get claim session',
    }
  }
}

/**
 * Prepare claim summary for review
 */
export async function handlePrepareClaimSummary(
  sessionId: string
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const session = await getSessionByChatId(sessionId)
    if (!session) {
      return { success: false, error: 'No claim session found' }
    }

    const summary = await getSessionSummary(session.id)

    // Update stage to reviewing_summary
    await updateSessionByChatId(sessionId, { stage: 'reviewing_summary' })

    return {
      success: true,
      data: {
        summary: summary.session,
        documents_count: summary.documentsCount,
        formatted_summary: summary.formattedSummary,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare claim summary',
    }
  }
}

/**
 * Submit claim - Finalize and create claim record
 */
export async function handleSubmitClaim(
  sessionId: string
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const session = await getSessionByChatId(sessionId)
    if (!session) {
      return { success: false, error: 'No claim session found' }
    }

    if (session.stage === 'submitted') {
      return {
        success: true,
        data: {
          claimId: session.claim_id,
          claimNumber: session.claim_number,
          message: 'Claim already submitted',
        },
      }
    }

    // Check document completeness and validation before submitting
    const completenessCheck = await handleCheckDocumentCompleteness(sessionId)
    if (!completenessCheck.success) {
      return {
        success: false,
        error: `Cannot submit claim: ${completenessCheck.error || 'Document validation check failed'}`,
      }
    }

    const completenessData = completenessCheck.data as {
      is_complete?: boolean
      can_proceed?: boolean
      message?: string
      missing_documents?: string[]
      invalid_documents?: Array<{ name: string; reason: string }>
    }

    if (completenessData.can_proceed === false) {
      const issues: string[] = []
      if (completenessData.missing_documents && completenessData.missing_documents.length > 0) {
        issues.push(`Missing required documents: ${completenessData.missing_documents.join(', ')}`)
      }
      if (completenessData.invalid_documents && completenessData.invalid_documents.length > 0) {
        const invalidReasons = completenessData.invalid_documents.map(d => `${d.name} (${d.reason})`).join(', ')
        issues.push(`Invalid documents: ${invalidReasons}`)
      }
      return {
        success: false,
        error: `Cannot submit claim. ${issues.join('. ')}. ${completenessData.message || 'Please fix the document issues before submitting.'}`,
      }
    }

    const result = await submitClaim(session.id)

    // Archive the chat session
    await supabase
      .from('chat_sessions')
      .update({
        claim_id: result.claimId,
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return {
      success: true,
      data: {
        claimId: result.claimId,
        claimNumber: result.claimNumber,
        status: 'pending',
        message: 'Claim submitted successfully',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit claim',
    }
  }
}

/**
 * Format extracted document information for AI response
 */
function formatExtractedInfoForResponse(extractedEntities: Record<string, unknown>): string {
  if (!extractedEntities || typeof extractedEntities !== 'object') {
    return ''
  }

  const info: string[] = []

  // Common field mappings for user-friendly display
  const fieldLabels: Record<string, string> = {
    passengerName: 'Passenger Name',
    passenger_name: 'Passenger Name',
    patientName: 'Patient Name',
    patient_name: 'Patient Name',
    customerName: 'Customer Name',
    customer_name: 'Customer Name',
    name: 'Name',
    flightNumber: 'Flight Number',
    flight_number: 'Flight Number',
    airline: 'Airline',
    route: 'Route',
    from: 'From',
    to: 'To',
    baggageTag: 'Baggage Tag',
    baggage_tag: 'Baggage Tag',
    baggageTagNumber: 'Baggage Tag Number',
    baggage_tag_number: 'Baggage Tag Number',
    referenceNumber: 'Reference Number',
    reference_number: 'Reference Number',
    pirNumber: 'PIR Number',
    pir_number: 'PIR Number',
    bookingReference: 'Booking Reference',
    booking_reference: 'Booking Reference',
    ticketNumber: 'Ticket Number',
    ticket_number: 'Ticket Number',
    date: 'Date',
    documentDate: 'Document Date',
    issueDate: 'Issue Date',
    amount: 'Amount',
    totalAmount: 'Total Amount',
    total: 'Total',
  }

  // Extract and format key fields
  for (const [key, label] of Object.entries(fieldLabels)) {
    if (extractedEntities[key] !== undefined && extractedEntities[key] !== null && extractedEntities[key] !== '') {
      let value = String(extractedEntities[key])
      
      // Format dates
      if (key.includes('date') || key.includes('Date')) {
        try {
          value = new Date(value).toLocaleDateString()
        } catch {
          // Keep original value if date parsing fails
        }
      }
      
      // Format amounts
      if (key.includes('amount') || key.includes('Amount') || key === 'total') {
        const numValue = Number(value)
        if (!isNaN(numValue)) {
          value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numValue)
        }
      }
      
      info.push(`${label}: ${value}`)
    }
  }

  return info.length > 0 ? info.join(', ') : ''
}

/**
 * Upload document to claim session
 * Automatically validates the document and stores extracted information
 */
export async function handleUploadDocument(
  sessionId: string,
  fileData: {
    file_name: string
    file_path: string
    file_type: string
    file_size?: number
    mime_type?: string
  }
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get or create session
    const session = await getOrCreateSession(sessionId, user.id)

    // Create document record
    const document = await uploadDocument({
      claim_session_id: session.id,
      user_id: user.id,
      file_name: fileData.file_name,
      file_path: fileData.file_path,
      file_type: fileData.file_type,
      file_size: fileData.file_size,
      mime_type: fileData.mime_type,
    })

    // Automatically validate the document and store extracted data
    let validationResult = null
    let extractedInfo = ''
    
    console.log(`[handleUploadDocument] Starting auto-validation for document: ${document.id}, file: ${document.file_name}`)
    
    try {
      // Get user profile for validation
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, date_of_birth, email')
        .eq('id', user.id)
        .single()

      console.log(`[handleUploadDocument] User profile: ${profile?.full_name || 'Not found'}`)

      // Get coverage type and required documents
      const coverageTypeId = session.coverage_type_ids?.[0]
      let requiredDocuments: DocumentRequirement[] = []
      
      console.log(`[handleUploadDocument] Claim session context:`, {
        coverageTypeId,
        incidentDate: session.incident_date,
        incidentLocation: session.incident_location,
        incidentDescription: session.incident_description,
      })

      if (coverageTypeId) {
        // Get document rules
        const { data: rules } = await supabase
          .from('rules')
          .select('*')
          .eq('coverage_type_id', coverageTypeId)
          .eq('rule_type', 'document')
          .eq('is_active', true)

        if (rules) {
          for (const rule of rules) {
            const actions = rule.actions as unknown as RuleAction[]
            if (!Array.isArray(actions)) continue

            for (const action of actions) {
              if (action.type === 'require_document' && action.documentTypes) {
                requiredDocuments.push({
                  questionId: rule.id,
                  documentTypes: action.documentTypes,
                  minFiles: action.minFiles || 1,
                  maxFiles: action.maxFiles || 10,
                  allowedFormats: action.allowedFormats || ['pdf', 'jpg', 'jpeg', 'png'],
                  message: action.errorMessage,
                })
              }
              // Support legacy format
              else if ((action as any).action === 'request_documents') {
                requiredDocuments.push({
                  questionId: rule.id,
                  documentTypes: ['supporting_document'],
                  minFiles: 0,
                  maxFiles: 10,
                  allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
                  message: (action as any).message,
                })
              }
            }
          }
        }
      }

      // Get coverage type name
      let coverageTypeName = 'claim'
      if (coverageTypeId) {
        const coverageType = await getCoverageType(coverageTypeId)
        if (coverageType) {
          coverageTypeName = coverageType.name
        }
      }

      // Get answers for claimed amount
      const answers = session.answers as Record<string, { value: unknown }> || {}
      const claimedAmount = answers.claimed_amount?.value as number || undefined

      // Process and validate the document
      console.log(`[handleUploadDocument] Calling processAndValidateDocument with context:`, {
        coverageType: coverageTypeName,
        incidentDate: session.incident_date,
        incidentLocation: session.incident_location,
        userProfileName: profile?.full_name,
      })
      
      validationResult = await processAndValidateDocument(
        { path: document.file_path, mimeType: document.mime_type || undefined },
        {
          claimContext: {
            coverageType: coverageTypeName,
            coverageTypeId,
            incidentDate: session.incident_date || undefined,
            incidentLocation: session.incident_location || undefined,
            claimedAmount,
            incidentDescription: session.incident_description || undefined,
          },
          userProfile: {
            fullName: profile?.full_name || 'Unknown',
            dateOfBirth: profile?.date_of_birth || undefined,
            email: profile?.email || undefined,
          },
          requiredDocuments,
        }
      )

      console.log(`[handleUploadDocument] Validation result:`, {
        status: validationResult.overallStatus,
        detectedType: validationResult.documentTypeValidation.detectedType,
        dateAligns: validationResult.contextValidation.dateAligns,
        locationAligns: validationResult.contextValidation.locationAligns,
        nameMatches: validationResult.profileValidation.nameMatches,
        extractedEntitiesCount: Object.keys(validationResult.extraction.extractedEntities).length,
      })

      // Validate extraction quality
      const extractedEntities = validationResult.extraction.extractedEntities
      const hasKeyFields = !!(extractedEntities.passengerName || extractedEntities.name || 
                               extractedEntities.flightNumber || extractedEntities.baggageTag ||
                               extractedEntities.date || extractedEntities.dateOfTravel)
      
      if (!hasKeyFields && Object.keys(extractedEntities).length === 0) {
        console.warn(`[handleUploadDocument] WARNING: No entities extracted from document - extraction may have failed`)
      } else if (!hasKeyFields) {
        console.warn(`[handleUploadDocument] WARNING: No key fields (name, flight, date, baggage tag) extracted - document may be unclear or wrong type`)
      }

      // Check for obviously wrong extraction (e.g., name doesn't match when it should)
      if (validationResult.profileValidation.nameMatches === false) {
        const extractedName = extractedEntities.passengerName || extractedEntities.name || extractedEntities.patientName
        console.warn(`[handleUploadDocument] WARNING: Name mismatch detected - Extracted: "${extractedName}", Expected: "${profile?.full_name}"`)
      }

      // Check if OCR data is available for verification
      if (!validationResult.extraction.ocrData || validationResult.extraction.ocrData.trim().length === 0) {
        console.warn(`[handleUploadDocument] WARNING: No OCR data available for verification - extraction quality cannot be verified`)
      } else {
        console.log(`[handleUploadDocument] OCR data available for verification: ${validationResult.extraction.ocrData.length} characters`)
      }

      // Update document with validation results
      await updateDocumentValidation(document.id, {
        validation_status: validationResult.overallStatus,
        validation_errors: validationResult.validationErrors,
        validation_warnings: validationResult.validationWarnings,
        detected_document_type: validationResult.documentTypeValidation.detectedType,
        expected_document_type: validationResult.documentTypeValidation.expectedTypes[0],
        profile_validation: validationResult.profileValidation as Json,
        context_validation: validationResult.contextValidation as Json,
        authenticity_score: validationResult.extraction.authenticityScore,
        ocr_data: validationResult.extraction.ocrData as Json,
        extracted_data: validationResult.extraction.extractedEntities as Json,
      })

      console.log(`[handleUploadDocument] Stored validation results in database for document ${document.id}`)

      // Auto-populate claim session answers from extracted data (Fix 3)
      if (validationResult.overallStatus === 'valid' || validationResult.overallStatus === 'needs_review') {
        const extractedEntities = validationResult.extraction.extractedEntities
        const sessionUpdates: Record<string, ClaimSessionAnswer> = {}

        // Field mappings: extracted field -> claim session answer
        const fieldMappings: Record<string, { key: string; label: string; type: 'text' | 'date' | 'number' }> = {
          'passengerName': { key: 'passenger_name', label: 'Passenger Name', type: 'text' },
          'name': { key: 'document_name', label: 'Name on Document', type: 'text' },
          'patientName': { key: 'patient_name', label: 'Patient Name', type: 'text' },
          'customerName': { key: 'customer_name', label: 'Customer Name', type: 'text' },
          'flightNumber': { key: 'flight_number', label: 'Flight Number', type: 'text' },
          'flight_number': { key: 'flight_number', label: 'Flight Number', type: 'text' },
          'baggageTag': { key: 'baggage_tag', label: 'Baggage Tag', type: 'text' },
          'baggageTagNumber': { key: 'baggage_tag', label: 'Baggage Tag', type: 'text' },
          'pirNumber': { key: 'pir_number', label: 'PIR Number', type: 'text' },
          'referenceNumber': { key: 'reference_number', label: 'Reference Number', type: 'text' },
          'bookingReference': { key: 'booking_reference', label: 'Booking Reference', type: 'text' },
          'ticketNumber': { key: 'ticket_number', label: 'Ticket Number', type: 'text' },
          'from': { key: 'departure_location', label: 'Departure Location', type: 'text' },
          'origin': { key: 'departure_location', label: 'Departure Location', type: 'text' },
          'to': { key: 'arrival_location', label: 'Arrival Location', type: 'text' },
          'destination': { key: 'arrival_location', label: 'Arrival Location', type: 'text' },
          'date': { key: 'document_date', label: 'Document Date', type: 'date' },
          'dateOfTravel': { key: 'travel_date', label: 'Date of Travel', type: 'date' },
          'documentDate': { key: 'document_date', label: 'Document Date', type: 'date' },
          'issueDate': { key: 'document_date', label: 'Document Date', type: 'date' },
          'amount': { key: 'document_amount', label: 'Document Amount', type: 'number' },
          'totalAmount': { key: 'document_amount', label: 'Document Amount', type: 'number' },
          'airline': { key: 'airline', label: 'Airline', type: 'text' },
        }

        // Map extracted fields to session answers
        for (const [extractedKey, mapping] of Object.entries(fieldMappings)) {
          const value = extractedEntities[extractedKey]
          if (value !== undefined && value !== null && value !== '') {
            // Only add if not already set by a higher-priority key
            if (!sessionUpdates[mapping.key]) {
              sessionUpdates[mapping.key] = {
                value: mapping.type === 'number' ? Number(value) : String(value),
                type: mapping.type,
                label: mapping.label,
                source: 'document_extraction',
                document_id: document.id,
                confidence: 'high', // Validated documents have high confidence
              }
            }
          }
        }

        // Update session with extracted answers if we have any
        if (Object.keys(sessionUpdates).length > 0) {
          const currentAnswers = (session.answers as Record<string, unknown>) || {}
          // Only add fields that don't already exist (don't overwrite user input)
          const newAnswers = { ...currentAnswers }
          for (const [key, answer] of Object.entries(sessionUpdates)) {
            if (!newAnswers[key]) {
              newAnswers[key] = answer
            }
          }

          await updateSessionByChatId(sessionId, {
            answers: newAnswers as Json
          })

          console.log(`[handleUploadDocument] Auto-populated ${Object.keys(sessionUpdates).length} fields from document extraction:`, Object.keys(sessionUpdates))
        }
      }

      // Format extracted information for AI response
      extractedInfo = formatExtractedInfoForResponse(validationResult.extraction.extractedEntities)
      console.log(`[handleUploadDocument] Formatted extracted info: ${extractedInfo}`)
    } catch (validationError) {
      // Log error but don't fail the upload
      console.error('[handleUploadDocument] Error during automatic validation:', {
        error: validationError instanceof Error ? validationError.message : String(validationError),
        stack: validationError instanceof Error ? validationError.stack : undefined,
        documentId: document.id,
        sessionId: session.id,
      })
      // Continue without validation - document is still uploaded
    }

    return {
      success: true,
      data: {
        document_id: document.id,
        file_name: document.file_name,
        processing_status: document.processing_status,
        validation_status: validationResult?.overallStatus || 'pending',
        detected_document_type: validationResult?.documentTypeValidation.detectedType,
        extracted_info: extractedInfo,
        extracted_data: validationResult?.extraction.extractedEntities || {},
        message: validationResult 
          ? `Document uploaded and validated successfully. ${extractedInfo ? `Extracted information: ${extractedInfo}` : ''}`
          : 'Document uploaded successfully',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload document',
    }
  }
}

/**
 * Update document with OCR/extracted data
 */
export async function handleUpdateDocumentOcr(
  documentId: string,
  ocrData: Json,
  extractedData?: Json
): Promise<ToolHandlerResult> {
  try {
    const document = await updateOcrData(documentId, ocrData, extractedData)

    return {
      success: true,
      data: {
        document_id: document.id,
        processing_status: document.processing_status,
        message: 'Document OCR data updated',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update document OCR',
    }
  }
}

/**
 * Categorize incident - Match incident to coverage types
 */
export async function handleCategorizeIncident(
  incidentDescription: string
): Promise<ToolHandlerResult> {
  try {
    const allCoverageTypes = await getCoverageTypes()
    const activeCoverageTypes = allCoverageTypes.filter((ct) => ct.is_active)

    // Simple keyword matching
    const synonyms: Record<string, string[]> = {
      'lost': ['loss', 'missing', 'disappeared'],
      'baggage': ['luggage', 'suitcase', 'bag'],
      'damaged': ['damage', 'broken', 'destroyed'],
      'delayed': ['delay', 'late'],
      'cancelled': ['cancel', 'cancellation'],
      'medical': ['health', 'hospital', 'doctor', 'injury'],
      'accident': ['crash', 'collision'],
    }

    const incidentLower = incidentDescription.toLowerCase()
    const incidentWords = incidentLower.split(/\s+/)

    const matches = activeCoverageTypes
      .map((ct) => {
        const name = ct.name.toLowerCase()
        const description = (ct.description || '').toLowerCase()
        let score = 0

        // Exact phrase matching
        if (incidentLower.includes(name)) score += 20

        // Word matching
        const nameWords = name.split(/\s+/)
        for (const word of incidentWords) {
          if (nameWords.includes(word)) score += 8
          if (description.includes(word)) score += 4

          // Synonym matching
          for (const [key, synonymList] of Object.entries(synonyms)) {
            if (word === key || synonymList.includes(word)) {
              if (name.includes(key) || nameWords.some(w => synonymList.includes(w))) {
                score += 6
              }
            }
          }
        }

        return { coverageType: ct, score }
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    return {
      success: true,
      data: {
        matches: matches.map((m) => ({
          coverageTypeId: m.coverageType.id,
          coverageTypeName: m.coverageType.name,
          confidence: Math.min(m.score / 20, 1),
        })),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to categorize incident',
    }
  }
}

/**
 * Get required documents for a coverage type
 * Reads from rules table where rule_type = 'document'
 */
export async function handleGetRequiredDocuments(
  coverageTypeId: string
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()

    // Get document rules for this coverage type
    const { data: rules, error } = await supabase
      .from('rules')
      .select('*')
      .eq('coverage_type_id', coverageTypeId)
      .eq('rule_type', 'document')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch document rules: ${error.message}`)
    }

    if (!rules || rules.length === 0) {
      return {
        success: true,
        data: {
          requirements: [],
          message: 'No specific document requirements configured for this coverage type. Please upload any supporting documents for your claim.',
          formatted_message: 'Please upload any relevant supporting documents for your claim.',
        },
      }
    }

    // Extract document requirements from rule actions
    const requirements: Array<{
      documentTypes: string[]
      minFiles: number
      maxFiles: number
      allowedFormats: string[]
      message: string
      descriptions: Array<{ type: string; name: string; description: string; guidance: string }>
    }> = []

    for (const rule of rules) {
      const actions = rule.actions as unknown as RuleAction[]
      if (!Array.isArray(actions)) continue

      for (const action of actions) {
        // Support new format: type: 'require_document' with documentTypes array
        if (action.type === 'require_document' && action.documentTypes) {
          const descriptions = action.documentTypes.map(type => ({
            type,
            name: DOCUMENT_TYPES[type]?.name || type,
            description: DOCUMENT_TYPES[type]?.description || '',
            guidance: DOCUMENT_TYPES[type]?.guidance || '',
          }))

          requirements.push({
            documentTypes: action.documentTypes,
            minFiles: action.minFiles || 0,
            maxFiles: action.maxFiles || 10,
            allowedFormats: action.allowedFormats || ['pdf', 'jpg', 'jpeg', 'png'],
            message: action.errorMessage || `Please upload: ${descriptions.map(d => d.name).join(' or ')}`,
            descriptions,
          })
        }
        // Support legacy format: action: 'request_documents' with message
        else if ((action as any).action === 'request_documents' && (action as any).message) {
          requirements.push({
            documentTypes: ['supporting_document'],
            minFiles: 0,
            maxFiles: 10,
            allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
            message: (action as any).message,
            descriptions: [{
              type: 'supporting_document',
              name: 'Supporting Document',
              description: 'Documents supporting your claim',
              guidance: (action as any).message,
            }],
          })
        }
      }
    }

    // Generate formatted message for AI to present to user
    const formattedMessage = formatRequiredDocumentsMessage(requirements)

    return {
      success: true,
      data: {
        requirements,
        message: `Found ${requirements.length} document requirement(s) for this coverage type.`,
        formatted_message: formattedMessage,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get required documents',
    }
  }
}

/**
 * Validate an uploaded document against claim requirements
 */
export async function handleValidateDocument(
  documentId: string,
  sessionId: string,
  expectedDocumentType?: string
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get the document
    const document = await getDocument(documentId)
    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    // Get the session for context
    const session = await getSessionByChatId(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, date_of_birth, email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get coverage type and required documents
    const coverageTypeId = session.coverage_type_ids?.[0]
    let requiredDocuments: DocumentRequirement[] = []

    if (coverageTypeId) {
      // Get document rules
      const { data: rules } = await supabase
        .from('rules')
        .select('*')
        .eq('coverage_type_id', coverageTypeId)
        .eq('rule_type', 'document')
        .eq('is_active', true)

      if (rules) {
        for (const rule of rules) {
          const actions = rule.actions as unknown as RuleAction[]
          if (!Array.isArray(actions)) continue

          for (const action of actions) {
            if (action.type === 'require_document' && action.documentTypes) {
              requiredDocuments.push({
                questionId: rule.id,
                documentTypes: action.documentTypes,
                minFiles: action.minFiles || 1,
                maxFiles: action.maxFiles || 10,
                allowedFormats: action.allowedFormats || ['pdf', 'jpg', 'jpeg', 'png'],
                message: action.errorMessage,
              })
            }
            // Support legacy format
            else if ((action as any).action === 'request_documents') {
              requiredDocuments.push({
                questionId: rule.id,
                documentTypes: ['supporting_document'],
                minFiles: 0,
                maxFiles: 10,
                allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
                message: (action as any).message,
              })
            }
          }
        }
      }
    }

    // Get coverage type name
    let coverageTypeName = 'claim'
    if (coverageTypeId) {
      const coverageType = await getCoverageType(coverageTypeId)
      if (coverageType) {
        coverageTypeName = coverageType.name
      }
    }

    // Get answers for claimed amount
    const answers = session.answers as Record<string, { value: unknown }> || {}
    const claimedAmount = answers.claimed_amount?.value as number || undefined

    // Process and validate the document
    const validationResult = await processAndValidateDocument(
      { path: document.file_path, mimeType: document.mime_type || undefined },
      {
        claimContext: {
          coverageType: coverageTypeName,
          coverageTypeId,
          incidentDate: session.incident_date || undefined,
          incidentLocation: session.incident_location || undefined,
          claimedAmount,
          incidentDescription: session.incident_description || undefined,
        },
        userProfile: {
          fullName: profile.full_name,
          dateOfBirth: profile.date_of_birth || undefined,
          email: profile.email,
        },
        requiredDocuments,
      }
    )

    // Update document with validation results
    await updateDocumentValidation(documentId, {
      validation_status: validationResult.overallStatus,
      validation_errors: validationResult.validationErrors,
      validation_warnings: validationResult.validationWarnings,
      detected_document_type: validationResult.documentTypeValidation.detectedType,
      expected_document_type: expectedDocumentType || validationResult.documentTypeValidation.expectedTypes[0],
      profile_validation: validationResult.profileValidation as Json,
      context_validation: validationResult.contextValidation as Json,
      authenticity_score: validationResult.extraction.authenticityScore,
      ocr_data: validationResult.extraction.ocrData as Json,
      extracted_data: validationResult.extraction.extractedEntities as Json,
    })

    return {
      success: true,
      data: {
        document_id: documentId,
        validation_status: validationResult.overallStatus,
        detected_type: validationResult.documentTypeValidation.detectedType,
        expected_types: validationResult.documentTypeValidation.expectedTypes,
        is_expected_type: validationResult.documentTypeValidation.isExpectedType,
        errors: validationResult.validationErrors,
        warnings: validationResult.validationWarnings,
        extracted_data: validationResult.extraction.extractedEntities,
        authenticity_score: validationResult.extraction.authenticityScore,
        reupload_reason: validationResult.reuploadReason,
        reupload_guidance: validationResult.reuploadGuidance,
        user_message: validationResult.userMessage,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate document',
    }
  }
}

/**
 * Check if all required documents have been uploaded and validated
 */
export async function handleCheckDocumentCompleteness(
  sessionId: string
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get the session
    const session = await getSessionByChatId(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    // Get all documents for this session
    const documents = await getSessionDocuments(session.id)

    // Get coverage type and required documents
    const coverageTypeId = session.coverage_type_ids?.[0]
    if (!coverageTypeId) {
      return {
        success: true,
        data: {
          is_complete: documents.length > 0,
          can_proceed: true,
          message: 'No specific document requirements for this claim type.',
          valid_documents: documents.map(d => d.file_type),
          missing_documents: [],
          invalid_documents: [],
        },
      }
    }

    // Get document rules
    const { data: rules } = await supabase
      .from('rules')
      .select('*')
      .eq('coverage_type_id', coverageTypeId)
      .eq('rule_type', 'document')
      .eq('is_active', true)

    const requiredDocTypes: Array<{
      types: string[]
      minFiles: number
      message: string
    }> = []

    if (rules) {
      for (const rule of rules) {
        const actions = rule.actions as unknown as RuleAction[]
        if (!Array.isArray(actions)) continue

        for (const action of actions) {
          if (action.type === 'require_document' && action.documentTypes && (action.minFiles || 0) > 0) {
            requiredDocTypes.push({
              types: action.documentTypes,
              minFiles: action.minFiles || 1,
              message: action.errorMessage || `Required: ${action.documentTypes.join(' or ')}`,
            })
          }
          // Legacy format - note: these are optional (minFiles: 0) by default
          // To make them required, you'd need to add new rules with require_document type
        }
      }
    }

    // Check which requirements are met
    const validDocuments: string[] = []
    const missingDocuments: string[] = []
    const invalidDocuments: Array<{ name: string; reason: string }> = []

    for (const req of requiredDocTypes) {
      // Find documents matching this requirement
      const matchingDocs = documents.filter(doc => {
        const detectedType = (doc as any).detected_document_type || doc.file_type
        return req.types.some(reqType =>
          detectedType?.toLowerCase().includes(reqType.toLowerCase()) ||
          reqType.toLowerCase().includes(detectedType?.toLowerCase() || '')
        )
      })

      // Check validation status
      // Documents with critical issues (name mismatch, context mismatch) in needs_review should be treated as invalid
      const validMatchingDocs = matchingDocs.filter(doc => {
        const status = (doc as any).validation_status
        if (status === 'valid') return true
        if (status === 'needs_review') {
          // Check for critical issues in profile_validation
          const profileValidation = (doc as any).profile_validation
          if (profileValidation && typeof profileValidation === 'object') {
            // If name doesn't match, treat as invalid (should be reupload_required now, but check for legacy data)
            if (profileValidation.nameMatches === false) {
              return false
            }
          }
          // Check for critical context validation issues
          const contextValidation = (doc as any).context_validation
          if (contextValidation && typeof contextValidation === 'object') {
            // If context doesn't match, treat as invalid
            if (contextValidation.dateAligns === false || contextValidation.amountAligns === false) {
              return false
            }
          }
          return true
        }
        return false
      })

      const invalidMatchingDocs = matchingDocs.filter(doc => {
        const status = (doc as any).validation_status
        if (status === 'invalid' || status === 'reupload_required') {
          return true
        }
        if (status === 'needs_review') {
          // Check for critical issues that should block submission
          const profileValidation = (doc as any).profile_validation
          if (profileValidation && typeof profileValidation === 'object') {
            if (profileValidation.nameMatches === false) {
              return true
            }
          }
          const contextValidation = (doc as any).context_validation
          if (contextValidation && typeof contextValidation === 'object') {
            if (contextValidation.dateAligns === false || contextValidation.amountAligns === false) {
              return true
            }
          }
        }
        return false
      })

      if (validMatchingDocs.length >= req.minFiles) {
        validDocuments.push(...validMatchingDocs.map(d => (d as any).detected_document_type || d.file_type))
      } else if (invalidMatchingDocs.length > 0) {
        invalidDocuments.push(...invalidMatchingDocs.map(d => ({
          name: (d as any).detected_document_type || d.file_type,
          reason: ((d as any).validation_errors || [])[0] || 'Validation failed',
        })))
      } else {
        missingDocuments.push(req.types[0])
      }
    }

    // Generate completeness message
    const completenessResult = getCompletenessMessage(
      validDocuments,
      missingDocuments,
      invalidDocuments
    )

    return {
      success: true,
      data: {
        is_complete: completenessResult.isComplete,
        can_proceed: completenessResult.canProceed,
        message: completenessResult.message,
        valid_documents: validDocuments,
        missing_documents: missingDocuments,
        invalid_documents: invalidDocuments,
        documents_count: documents.length,
        valid_count: validDocuments.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check document completeness',
    }
  }
}

/**
 * Check if coverage type is covered by user's policies
 */
export async function handleCheckPolicyCoverage(
  coverageTypeId: string,
  userId: string
): Promise<ToolHandlerResult> {
  try {
    const { getUserPoliciesWithCoverageTypes } = await import('@/lib/supabase/user-policies')
    const policiesWithCoverage = await getUserPoliciesWithCoverageTypes(userId)

    if (policiesWithCoverage.length === 0) {
      return {
        success: false,
        error: 'You do not have any active policies.',
      }
    }

    const matchingPolicies = policiesWithCoverage.filter((policy) =>
      policy.coverage_types.some((ct) => ct.coverage_type_id === coverageTypeId)
    )

    if (matchingPolicies.length === 0) {
      return {
        success: false,
        error: 'This incident type is not covered by your active policies.',
      }
    }

    const coverageType = await getCoverageType(coverageTypeId)

    return {
      success: true,
      data: {
        is_covered: true,
        coverage_type_id: coverageTypeId,
        coverage_type_name: coverageType?.name || 'Unknown',
        matching_policies: matchingPolicies.map((policy) => ({
          policy_id: policy.policy_id,
          policy_name: policy.policy_name,
          coverage_limit: policy.coverage_types.find((ct) => ct.coverage_type_id === coverageTypeId)?.coverage_limit,
        })),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check policy coverage',
    }
  }
}

// ============================================================
// COMMON HANDLERS
// ============================================================

/**
 * Detect tone (Both Modes)
 */
export async function handleDetectTone(message: string): Promise<ToolHandlerResult> {
  try {
    const analysis = await detectTone(message)
    return {
      success: true,
      data: analysis,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to detect tone',
    }
  }
}

// ============================================================
// ADMIN HANDLERS
// ============================================================

/**
 * Admin: Get claim details
 */
export async function handleGetClaimDetails(
  claimId: string
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return { success: false, error: 'Claim not found' }
    }

    // Get documents
    const { data: documents } = await supabase
      .from('claim_documents')
      .select('*')
      .eq('claim_id', claimId)

    return {
      success: true,
      data: {
        claim,
        documents: documents || [],
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch claim details',
    }
  }
}

/**
 * Admin: Update claim status
 */
export async function handleUpdateClaimStatus(
  claimId: string,
  status: string,
  approvedAmount?: number
): Promise<ToolHandlerResult> {
  try {
    const claim = await updateClaimStatus(claimId, status, approvedAmount)
    return {
      success: true,
      data: claim,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update claim status',
    }
  }
}

// ============================================================
// MAIN ROUTER
// ============================================================

/**
 * Route tool call to appropriate handler
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  sessionId?: string
): Promise<ToolHandlerResult> {
  try {
    switch (toolName) {
      // Policy tools
      case 'get_user_policies':
        return handleGetUserPolicies(userId)
      case 'get_policy_details':
        return handleGetPolicyDetails(args.policy_id as string)
      case 'get_coverage_usage':
        return handleGetCoverageUsage(args.user_policy_id as string)
      case 'suggest_policies':
        return handleSuggestPolicies(
          args.coverage_types as string[] | undefined,
          args.min_coverage_limit as number | undefined,
          args.max_premium as number | undefined
        )

      // Claims tools (new simple architecture)
      case 'update_claim_session':
        return handleUpdateClaimSession(
          sessionId || args.session_id as string,
          args as any
        )
      case 'get_claim_session':
        return handleGetClaimSession(sessionId || args.session_id as string)
      case 'upload_document':
        return handleUploadDocument(
          sessionId || args.session_id as string,
          args as any
        )
      case 'prepare_claim_summary':
        return handlePrepareClaimSummary(sessionId || args.session_id as string)
      case 'submit_claim':
        return handleSubmitClaim(sessionId || args.session_id as string)
      case 'update_document_ocr':
        return handleUpdateDocumentOcr(
          args.document_id as string,
          args.ocr_data as Json,
          args.extracted_data as Json | undefined
        )

      // Document validation tools (MANDATORY for strict document requirements)
      case 'get_required_documents':
        return handleGetRequiredDocuments(args.coverage_type_id as string)
      case 'validate_document':
        if (!sessionId) {
          return { success: false, error: 'Session ID required for document validation' }
        }
        return handleValidateDocument(
          args.document_id as string,
          sessionId,
          args.expected_document_type as string | undefined
        )
      case 'check_document_completeness':
        if (!sessionId) {
          return { success: false, error: 'Session ID required for document completeness check' }
        }
        return handleCheckDocumentCompleteness(sessionId)

      // Helper tools (still useful)
      case 'categorize_incident':
        return handleCategorizeIncident(args.incident_description as string)
      case 'check_policy_coverage':
        return handleCheckPolicyCoverage(args.coverage_type_id as string, userId)

      // Common tools
      case 'detect_tone':
        return handleDetectTone(args.message as string)

      // Admin tools
      case 'get_claim_details':
        return handleGetClaimDetails(args.claim_id as string)
      case 'update_claim_status':
        return handleUpdateClaimStatus(
          args.claim_id as string,
          args.status as string,
          args.approved_amount as number | undefined
        )

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `Error handling tool ${toolName}`,
    }
  }
}
