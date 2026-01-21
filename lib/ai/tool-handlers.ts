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
 * Upload document to claim session
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

    return {
      success: true,
      data: {
        document_id: document.id,
        file_name: document.file_name,
        processing_status: document.processing_status,
        message: 'Document uploaded successfully',
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
