import { createClient } from '@/lib/supabase/server'
import { getUserPolicies, getActiveUserPolicies } from '@/lib/supabase/user-policies'
import { getPolicy, getPolicyWithCoverageTypes, getPolicies, getActivePoliciesWithCoverageTypes } from '@/lib/supabase/policies'
import { getCoverageTypes, getCoverageType } from '@/lib/supabase/coverage-types'
import { getQuestionsByCoverageType } from '@/lib/supabase/questions'
import {
  getIntakeStateBySession,
  upsertIntakeState,
  updateStage,
  addAskedQuestion as addIntakeAskedQuestion,
} from '@/lib/supabase/claim-intake-state'
import {
  saveAnswer,
  getClaimAnswers,
} from '@/lib/supabase/claim-answers'
import {
  createClaim,
  generateClaimNumber,
  getClaimBySessionId,
  updateClaim,
} from '@/lib/supabase/claims'
import {
  createClaimDocument,
  updateDocumentExtraction,
} from '@/lib/supabase/claim-documents'
import {
  saveExtractedInfo,
} from '@/lib/supabase/claim-extracted-info'
import {
  validateAnswers,
} from '@/lib/ai/rules-validator'
import {
  extractDocumentInfo,
} from '@/lib/ai/document-processor'
import {
  detectTone,
} from '@/lib/ai/tone-detector'
import {
  updateClaimStatus,
  assignClaimToAdmin,
} from '@/lib/supabase/claims'
import {
  addNote,
  getClaimNotes,
} from '@/lib/supabase/claim-notes'

/**
 * Tool handler result type
 */
export interface ToolHandlerResult {
  success: boolean
  data?: unknown
  error?: string
}

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

    // Get detailed coverage information for each policy
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

    // Format the response to include all important details
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
      summary: {
        total_coverage_types: (policy.policy_coverage_types || []).length,
        has_optional_coverage: (policy.policy_coverage_types || []).some((pct: any) => pct.is_optional),
      },
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
    
    // Get all active policies with their coverage types
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
      // First, try to find coverage types by name/slug if IDs aren't provided
      const coverageTypeIds: string[] = []
      
      for (const ct of coverageTypes) {
        // Check if it's already an ID (UUID format)
        if (ct.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          coverageTypeIds.push(ct)
        } else {
          // Search by name or slug
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
        // Get policies that have the requested coverage types
        const { data: policyCoverageData, error: pcError } = await supabase
          .from('policy_coverage_types')
          .select('policy_id, coverage_type_id')
          .in('coverage_type_id', coverageTypeIds)

        if (!pcError && policyCoverageData) {
          const matchingPolicyIds = new Set(
            policyCoverageData.map((pc: { policy_id: string }) => pc.policy_id)
          )
          filtered = filtered.filter((p: { id: string }) => matchingPolicyIds.has(p.id))
        }
      }
    }

    // Filter by minimum coverage limit if provided (for specific coverage types)
    if (minCoverageLimit !== undefined && coverageTypes && coverageTypes.length > 0) {
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
          .select('policy_id, coverage_limit')
          .in('coverage_type_id', coverageTypeIds)
          .gte('coverage_limit', minCoverageLimit)

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

    // Get coverage type details for each policy with full information
    const suggestions = await Promise.all(
      filtered.map(async (policy: any) => {
        // Get full policy details with coverage types
        const fullPolicy = await getPolicyWithCoverageTypes(policy.id)

        // Format coverage details in a clear structure
        const coverageDetails = (fullPolicy?.policy_coverage_types || []).map((pct: any) => {
          const coverageType = pct.coverage_type || {}
          return {
            coverage_type_id: pct.coverage_type_id,
            coverage_type_name: coverageType.name || 'Unknown Coverage',
            coverage_type_description: coverageType.description || null,
            coverage_type_category: coverageType.category || null,
            coverage_limit: pct.coverage_limit,
            deductible: pct.deductible,
            is_optional: pct.is_optional,
            additional_premium: pct.additional_premium,
          }
        })

        // Format coverage information clearly
        const coverageList = coverageDetails.map((cd: any) => ({
          name: cd.coverage_type_name,
          limit: cd.coverage_limit,
          deductible: cd.deductible,
          is_optional: cd.is_optional,
          description: cd.coverage_type_description,
        }))

        return {
          id: policy.id,
          name: policy.name,
          description: policy.description,
          premium: policy.premium,
          currency: policy.currency || 'USD',
          deductible: policy.deductible,
          premium_frequency: policy.premium_frequency,
          policy_term_months: policy.policy_term_months,
          exclusions: policy.exclusions || [],
          // Main coverage information - this is what the AI should use
          coverage_list: coverageList,
          coverage_details: coverageDetails, // Full details for reference
          // Summary for quick reference
          summary: {
            total_coverage_types: coverageDetails.length,
            has_baggage_coverage: coverageList.some((c: any) => 
              c.name?.toLowerCase().includes('baggage') || 
              c.name?.toLowerCase().includes('luggage')
            ),
            baggage_coverage_limit: coverageList.find((c: any) => 
              c.name?.toLowerCase().includes('baggage') || 
              c.name?.toLowerCase().includes('luggage')
            )?.limit || null,
          },
        }
      })
    )

    return {
      success: true,
      data: {
        suggestions,
        count: suggestions.length,
        message: suggestions.length > 0 
          ? `Found ${suggestions.length} matching policy(ies) in the database.`
          : 'No policies match your requirements. Please adjust your criteria.',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to suggest policies',
    }
  }
}

/**
 * Categorize incident (Claims Mode)
 */
export async function handleCategorizeIncident(
  incidentDescription: string
): Promise<ToolHandlerResult> {
  try {
    const allCoverageTypes = await getCoverageTypes()
    const activeCoverageTypes = allCoverageTypes.filter((ct) => ct.is_active)

    // Synonym mapping for better matching
    const synonyms: Record<string, string[]> = {
      'lost': ['loss', 'missing', 'disappeared', 'gone'],
      'loss': ['lost', 'missing', 'disappeared', 'gone'],
      'baggage': ['luggage', 'suitcase', 'bag', 'bags'],
      'luggage': ['baggage', 'suitcase', 'bag', 'bags'],
      'damaged': ['damage', 'broken', 'destroyed', 'ruined'],
      'damage': ['damaged', 'broken', 'destroyed', 'ruined'],
      'delayed': ['delay', 'late', 'postponed'],
      'delay': ['delayed', 'late', 'postponed'],
      'cancelled': ['cancel', 'cancellation', 'canceled'],
      'cancellation': ['cancel', 'cancelled', 'canceled'],
      'interrupted': ['interruption', 'cut short', 'stopped'],
      'interruption': ['interrupted', 'cut short', 'stopped'],
      'missed': ['miss', 'missed connection', 'missed flight'],
      'flight': ['plane', 'airline', 'aircraft'],
      'trip': ['travel', 'journey', 'vacation'],
    }

    // Normalize text for matching
    const normalizeText = (text: string): string[] => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 0)
    }

    const incidentWords = normalizeText(incidentDescription)

    // Enhanced keyword matching with word-level and synonym matching
    const matches = activeCoverageTypes
      .map((ct) => {
        const name = ct.name.toLowerCase()
        const description = (ct.description || '').toLowerCase()
        const slug = (ct.slug || '').toLowerCase()
        const incident = incidentDescription.toLowerCase()

        let score = 0

        // Exact phrase matching (highest priority)
        if (incident.includes(name)) {
          score += 20
        }
        if (description && incident.includes(description)) {
          score += 10
        }
        if (slug && incident.includes(slug)) {
          score += 15
        }

        // Word-level matching
        const nameWords = normalizeText(name)
        const descriptionWords = normalizeText(description)
        const slugWords = normalizeText(slug)

        // Check if incident words match coverage type words
        for (const incidentWord of incidentWords) {
          // Direct word match in name
          if (nameWords.includes(incidentWord)) {
            score += 8
          }
          // Direct word match in description
          if (descriptionWords.includes(incidentWord)) {
            score += 4
          }
          // Direct word match in slug
          if (slugWords.includes(incidentWord)) {
            score += 6
          }

          // Synonym matching
          for (const [key, synonymList] of Object.entries(synonyms)) {
            if (incidentWord === key || synonymList.includes(incidentWord)) {
              // Check if synonym matches coverage type
              if (nameWords.includes(key) || nameWords.some(w => synonymList.includes(w))) {
                score += 7
              }
              if (descriptionWords.includes(key) || descriptionWords.some(w => synonymList.includes(w))) {
                score += 3
              }
              if (slugWords.includes(key) || slugWords.some(w => synonymList.includes(w))) {
                score += 5
              }
            }
          }
        }

        // Category-based matching
        if (ct.category) {
          const category = ct.category.toLowerCase()
          if (incident.includes(category)) {
            score += 3
          }
          // Word-level category matching
          if (incidentWords.includes(category)) {
            score += 2
          }
        }

        return { coverageType: ct, score }
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Top 3 matches

    console.log(`[handleCategorizeIncident] Matches found: ${matches.length}`)
    if (matches.length > 0) {
      console.log(`[handleCategorizeIncident] Top match: ${matches[0].coverageType.name} (ID: ${matches[0].coverageType.id}, score: ${matches[0].score})`)
    }

    return {
      success: true,
      data: {
        matches: matches.map((m) => ({
          coverageTypeId: m.coverageType.id,
          coverageTypeName: m.coverageType.name,
          confidence: Math.min(m.score / 20, 1), // Normalize to 0-1 (using 20 as max score)
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
 * Check if a coverage type is covered by user's active policies (Claims Mode)
 */
export async function handleCheckPolicyCoverage(
  coverageTypeId: string,
  userId: string
): Promise<ToolHandlerResult> {
  try {
    console.log(`[handleCheckPolicyCoverage] START - Coverage Type ID: ${coverageTypeId}, User ID: ${userId}`)
    const { getUserPoliciesWithCoverageTypes } = await import('@/lib/supabase/user-policies')
    const policiesWithCoverage = await getUserPoliciesWithCoverageTypes(userId)
    console.log(`[handleCheckPolicyCoverage] Policies found: ${policiesWithCoverage.length}`)

    if (policiesWithCoverage.length === 0) {
      return {
        success: false,
        error: 'You do not have any active policies. Please enroll in a policy before filing a claim.',
      }
    }

    // Check if the coverage type is covered by any active policy
    const matchingPolicies = policiesWithCoverage.filter((policy) =>
      policy.coverage_types.some((ct) => ct.coverage_type_id === coverageTypeId)
    )

    if (matchingPolicies.length === 0) {
      return {
        success: false,
        error: 'This type of incident does not appear to be covered by your current active policies. Please review your policies or contact support for assistance.',
      }
    }

    // Get coverage type details
    const { getCoverageType } = await import('@/lib/supabase/coverage-types')
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
          coverage_limit: policy.coverage_types.find((ct) => ct.coverage_type_id === coverageTypeId)
            ?.coverage_limit,
          deductible: policy.coverage_types.find((ct) => ct.coverage_type_id === coverageTypeId)
            ?.deductible,
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

/**
 * Get intake state (Claims Mode)
 */
export async function handleGetIntakeState(
  sessionId: string
): Promise<ToolHandlerResult> {
  try {
    const state = await getIntakeStateBySession(sessionId)
    return {
      success: true,
      data: state || {
        current_stage: 'initial_contact',
        database_questions_asked: [],
        validation_passed: null,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch intake state',
    }
  }
}

/**
 * Update intake state (Claims Mode)
 */
export async function handleUpdateIntakeState(
  sessionId: string,
  updates: {
    current_stage?: string
    coverage_type_ids?: string[]
    incident_description?: string
    database_questions_asked?: string[]
    validation_passed?: boolean
    validation_errors?: string[]
  }
): Promise<ToolHandlerResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    // Get current intake state
    const currentState = await getIntakeStateBySession(sessionId)
    
    // If we're moving to categorization stage and have coverage types, create a draft claim
    let claimId = currentState?.claim_id || null
    
    if (updates.current_stage === 'categorization' && 
        updates.coverage_type_ids && 
        updates.coverage_type_ids.length > 0 && 
        !claimId) {
      // Create a draft claim for this intake
      const claimNumber = await generateClaimNumber()
      const draftClaim = await createClaim({
        user_id: user.id,
        claim_number: claimNumber,
        coverage_type_ids: updates.coverage_type_ids,
        incident_description: updates.incident_description || 'Claim in progress',
        incident_date: new Date().toISOString(),
        incident_location: 'TBD',
        incident_type: 'pending',
        total_claimed_amount: 0,
        currency: 'USD',
        chat_session_id: sessionId,
        status: 'draft', // Draft status - will be updated to 'pending' when finalized
      })
      
      claimId = draftClaim.id
      
      // Link claim to session
      await supabase
        .from('chat_sessions')
        .update({ claim_id: draftClaim.id })
        .eq('id', sessionId)
    }

    // Handle database_questions_asked array properly - append if provided, otherwise keep existing
    let databaseQuestionsAsked = currentState?.database_questions_asked || []
    if (updates.database_questions_asked) {
      // If new array is provided, use it (it should already include previous questions)
      databaseQuestionsAsked = updates.database_questions_asked
    }

    // Determine the stage we're setting
    const newStage = updates.current_stage || currentState?.current_stage || 'initial_contact'
    // Only set claim_id if stage is finalization or completed (per database constraint)
    const canSetClaimId = newStage === 'finalization' || newStage === 'completed'
    
    await upsertIntakeState({
      session_id: sessionId,
      user_id: user.id,
      current_stage: newStage,
      coverage_type_ids: updates.coverage_type_ids || currentState?.coverage_type_ids || null,
      incident_description: updates.incident_description || currentState?.incident_description || null,
      database_questions_asked: databaseQuestionsAsked,
      validation_passed: updates.validation_passed ?? currentState?.validation_passed ?? null,
      validation_errors: updates.validation_errors || currentState?.validation_errors || null,
      // Don't set claim_id here if stage is not finalization/completed - it violates constraint
      claim_id: canSetClaimId ? claimId : (currentState?.claim_id || null),
    })
    
    if (claimId && !canSetClaimId) {
      console.log(`[handleUpdateIntakeState] Created claim ${claimId} but not setting in intake_state - stage is ${newStage}, constraint only allows claim_id in finalization/completed stages`)
    }

    return {
      success: true,
      data: { 
        message: 'Intake state updated',
        claim_id: claimId,
        stage: updates.current_stage || currentState?.current_stage || 'initial_contact',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update intake state',
    }
  }
}

/**
 * Get coverage questions (Claims Mode)
 */
export async function handleGetCoverageQuestions(
  coverageTypeId: string
): Promise<ToolHandlerResult> {
  try {
    console.log(`[handleGetCoverageQuestions] START - Coverage Type ID: ${coverageTypeId}`)
    
    if (!coverageTypeId) {
      console.error(`[handleGetCoverageQuestions] ERROR - No coverage type ID provided`)
      return {
        success: false,
        error: 'Coverage type ID is required',
      }
    }

    console.log(`[handleGetCoverageQuestions] Calling getQuestionsByCoverageType with ID: ${coverageTypeId}`)
    const questions = await getQuestionsByCoverageType(coverageTypeId)
    
    // Enhanced logging
    console.log(`[handleGetCoverageQuestions] RESULT - Coverage Type ID: ${coverageTypeId}`)
    console.log(`[handleGetCoverageQuestions] Questions found: ${questions?.length || 0}`)
    
    if (questions && questions.length > 0) {
      console.log(`[handleGetCoverageQuestions] Question IDs: ${questions.map(q => q.id).join(', ')}`)
      console.log(`[handleGetCoverageQuestions] Questions by order:`)
      questions.forEach((q, idx) => {
        console.log(`  ${idx + 1}. [${q.id}] order_index=${q.order_index}: "${q.question_text}"`)
      })
    } else {
      console.warn(`[handleGetCoverageQuestions] WARNING - No questions found for coverage_type_id: ${coverageTypeId}`)
      console.log(`[handleGetCoverageQuestions] This might indicate an RLS issue or the coverage type has no questions`)
    }
    
    // Always return success even if questions array is empty
    // The AI should handle empty arrays gracefully
    // IMPORTANT: Return questions in a clear format so AI can easily access them
    return {
      success: true,
      data: {
        questions: questions || [],
        message: questions && questions.length > 0 
          ? `Found ${questions.length} question(s) configured for this coverage type. You MUST ask ALL of them using the exact question_text.`
          : undefined,
      },
    }
  } catch (error) {
    console.error(`[handleGetCoverageQuestions] EXCEPTION - Coverage Type ID: ${coverageTypeId}`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch questions',
    }
  }
}

/**
 * Get coverage rules (Claims Mode)
 */
export async function handleGetCoverageRules(
  coverageTypeId: string
): Promise<ToolHandlerResult> {
  try {
    const { getActiveRulesByCoverageType } = await import('@/lib/supabase/rules')
    const rules = await getActiveRulesByCoverageType(coverageTypeId)
    return {
      success: true,
      data: rules,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch rules',
    }
  }
}

/**
 * Get extracted information for a claim (Claims Mode)
 */
export async function handleGetExtractedInfo(
  claimId: string
): Promise<ToolHandlerResult> {
  try {
    const { getExtractedInfo } = await import('@/lib/supabase/claim-extracted-info')
    const extractedInfo = await getExtractedInfo(claimId)
    return {
      success: true,
      data: extractedInfo,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch extracted info',
    }
  }
}

/**
 * Save answer (Claims Mode)
 */
export async function handleSaveAnswer(
  claimId: string | undefined,
  questionId: string,
  answer: {
    answer_text?: string
    answer_number?: number
    answer_date?: string
    answer_select?: string
    answer_file_ids?: string[]
  },
  sessionId?: string
): Promise<ToolHandlerResult> {
  const startTime = Date.now()
  console.log(`[handleSaveAnswer] Starting - Claim ID provided: ${claimId || 'undefined'}, Question ID: ${questionId}, Session ID: ${sessionId || 'none'}`)
  
  try {
    const supabase = await createClient()
    
    // Get the actual claim ID from session or intake state
    let actualClaimId = claimId
    console.log(`[handleSaveAnswer] Initial claim ID: ${claimId || 'undefined'}, Session ID: ${sessionId || 'none'}`)
    
    // If claimId is provided but might be session_id, or if we need to get it from session
    if (sessionId) {
      // Check if claimId is actually a session_id (same as sessionId)
      const isSessionId = claimId === sessionId || !claimId || claimId === 'session_id' || claimId === 'claim_id'
      
      if (isSessionId) {
        console.log(`[handleSaveAnswer] Claim ID appears to be session_id or missing, resolving from session: ${sessionId}`)
        
        // First try to get claim from session
        const { data: session, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('claim_id')
          .eq('id', sessionId)
          .single()
        
        if (sessionError) {
          console.error(`[handleSaveAnswer] Error querying chat_sessions:`, sessionError)
        }
        
        if (session?.claim_id) {
          actualClaimId = session.claim_id
          console.log(`[handleSaveAnswer] Found claim_id from chat_sessions: ${actualClaimId}`)
        } else {
          console.log(`[handleSaveAnswer] No claim_id in chat_sessions, checking intake state...`)
          
          // Check intake state for claim_id
          const intakeState = await getIntakeStateBySession(sessionId)
          if (intakeState?.claim_id) {
            actualClaimId = intakeState.claim_id
            console.log(`[handleSaveAnswer] Found claim_id from intake state: ${actualClaimId}`)
          } else {
            console.log(`[handleSaveAnswer] No claim_id in intake state, checking if we can create one...`)
            
            // No claim exists - this shouldn't happen if workflow is followed correctly
            // But we'll create one as fallback
            if (intakeState && intakeState.coverage_type_ids && intakeState.coverage_type_ids.length > 0) {
              console.log(`[handleSaveAnswer] Creating new draft claim as fallback - Coverage types: ${intakeState.coverage_type_ids.length}`)
              
              const {
                data: { user },
              } = await supabase.auth.getUser()
              
              if (user) {
                const claimNumber = await generateClaimNumber()
                const newClaim = await createClaim({
                  user_id: user.id,
                  claim_number: claimNumber,
                  coverage_type_ids: intakeState.coverage_type_ids,
                  incident_description: intakeState.incident_description || 'Claim in progress',
                  incident_date: new Date().toISOString(),
                  incident_location: 'TBD',
                  incident_type: 'pending',
                  total_claimed_amount: 0,
                  currency: 'USD',
                  chat_session_id: sessionId,
                  status: 'draft',
                })
                
                actualClaimId = newClaim.id
                console.log(`[handleSaveAnswer] Created new claim - ID: ${actualClaimId}, Number: ${claimNumber}`)
                
                // Update session and intake state
                const { error: sessionUpdateError } = await supabase
                  .from('chat_sessions')
                  .update({ claim_id: newClaim.id })
                  .eq('id', sessionId)
                
                if (sessionUpdateError) {
                  console.error(`[handleSaveAnswer] Error updating chat_sessions with claim_id:`, sessionUpdateError)
                } else {
                  console.log(`[handleSaveAnswer] Updated chat_sessions with claim_id`)
                }
                
                try {
                  // Only set claim_id if stage allows it (per database constraint)
                  const currentStage = intakeState.current_stage || 'questioning'
                  const canSetClaimId = currentStage === 'finalization' || currentStage === 'completed'
                  
                  await upsertIntakeState({
                    session_id: sessionId,
                    user_id: user.id,
                    // Don't set claim_id here if stage doesn't allow it - it violates constraint
                    claim_id: canSetClaimId ? newClaim.id : null,
                    current_stage: currentStage,
                    coverage_type_ids: intakeState.coverage_type_ids,
                    incident_description: intakeState.incident_description,
                  })
                  if (canSetClaimId) {
                    console.log(`[handleSaveAnswer] Updated intake state with claim_id`)
                  } else {
                    console.log(`[handleSaveAnswer] Skipped setting claim_id in intake state - stage is ${currentStage}, constraint only allows claim_id in finalization/completed stages`)
                  }
                } catch (intakeUpdateError) {
                  console.error(`[handleSaveAnswer] Error updating intake state with claim_id:`, intakeUpdateError)
                }
              } else {
                console.error(`[handleSaveAnswer] User not authenticated, cannot create claim`)
              }
            } else {
              console.warn(`[handleSaveAnswer] No claim found and cannot create one without coverage types`)
              return {
                success: false,
                error: 'No claim found and cannot create one without coverage types. Please categorize the incident first.',
              }
            }
          }
        }
      } else {
        console.log(`[handleSaveAnswer] Using provided claim_id directly: ${claimId}`)
        actualClaimId = claimId
      }
      
      // Sync claim_id to intake state if missing (after resolving actualClaimId)
      // Only sync when stage allows it (per database constraint: claim_id_only_in_final_stages)
      if (sessionId && actualClaimId) {
        try {
          const intakeState = await getIntakeStateBySession(sessionId)
          if (intakeState) {
            // Only sync claim_id if stage is finalization or completed (per database constraint)
            const canSetClaimId = intakeState.current_stage === 'finalization' || 
                                 intakeState.current_stage === 'completed'
            
            if (!intakeState.claim_id && canSetClaimId) {
              console.log(`[handleSaveAnswer] Syncing claim_id to intake state - Session: ${sessionId}, Claim: ${actualClaimId}, Stage: ${intakeState.current_stage}`)
              const { error: syncError } = await supabase
                .from('claim_intake_state')
                .update({ claim_id: actualClaimId })
                .eq('id', intakeState.id)
              
              if (syncError) {
                console.error(`[handleSaveAnswer] Failed to sync claim_id to intake state:`, syncError)
              } else {
                console.log(`[handleSaveAnswer] Successfully synced claim_id to intake state`)
              }
            } else if (!intakeState.claim_id && !canSetClaimId) {
              console.log(`[handleSaveAnswer] Skipping claim_id sync - stage is ${intakeState.current_stage}, constraint only allows claim_id in finalization/completed stages`)
            } else if (intakeState.claim_id && intakeState.claim_id !== actualClaimId && canSetClaimId) {
              // Update if different and stage allows
              console.warn(`[handleSaveAnswer] Intake state has different claim_id (${intakeState.claim_id}) than resolved (${actualClaimId}), updating...`)
              const { error: syncError } = await supabase
                .from('claim_intake_state')
                .update({ claim_id: actualClaimId })
                .eq('id', intakeState.id)
              
              if (syncError) {
                console.error(`[handleSaveAnswer] Failed to update claim_id in intake state:`, syncError)
              } else {
                console.log(`[handleSaveAnswer] Successfully updated claim_id in intake state`)
              }
            }
          }
        } catch (syncError) {
          console.error(`[handleSaveAnswer] Exception syncing claim_id to intake state:`, syncError)
          // Don't fail - answer is saved, claim_id is in chat_sessions which is sufficient
        }
      }
    } else {
      console.warn(`[handleSaveAnswer] No sessionId provided, using claimId directly: ${claimId}`)
    }

    if (!actualClaimId) {
      console.error(`[handleSaveAnswer] Could not resolve claim ID - Session: ${sessionId}, Provided claim ID: ${claimId}`)
      return {
        success: false,
        error: 'Could not resolve claim ID. Please ensure you have started a claim and provided a valid session.',
      }
    }

    console.log(`[handleSaveAnswer] Resolved claim ID: ${actualClaimId}, validating question...`)

    // Validate answer against rules
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('coverage_type_id')
      .eq('id', questionId)
      .single()

    if (questionError) {
      console.error(`[handleSaveAnswer] Error fetching question:`, questionError)
      return {
        success: false,
        error: `Question not found: ${questionError.message}`,
      }
    }

    if (!question) {
      console.error(`[handleSaveAnswer] Question not found: ${questionId}`)
      return {
        success: false,
        error: 'Question not found',
      }
    }

    console.log(`[handleSaveAnswer] Question found - Coverage Type ID: ${question.coverage_type_id}, evaluating rules...`)

    // Evaluate rules for this answer
    const answers = {
      [questionId]: answer.answer_text || answer.answer_number || answer.answer_date || answer.answer_select,
    }
    const validationResult = await validateAnswers(question.coverage_type_id, answers)
    console.log(`[handleSaveAnswer] Rule validation - Passed: ${validationResult.passed}, Errors: ${validationResult.errors.length}, Warnings: ${validationResult.warnings.length}`)

    // Save answer
    console.log(`[handleSaveAnswer] Saving answer to database...`)
    try {
      const savedAnswer = await saveAnswer({
        claim_id: actualClaimId,
        question_id: questionId,
        answer_text: answer.answer_text || null,
        answer_number: answer.answer_number || null,
        answer_date: answer.answer_date || null,
        answer_select: answer.answer_select || null,
        answer_file_ids: answer.answer_file_ids || null,
        rule_evaluation_results: validationResult as unknown as any,
      })
      console.log(`[handleSaveAnswer] Answer saved successfully - Answer ID: ${savedAnswer.id}`)
    } catch (saveError) {
      console.error(`[handleSaveAnswer] Error saving answer:`, saveError)
      console.error(`[handleSaveAnswer] Error details - Claim ID: ${actualClaimId}, Question ID: ${questionId}, Error: ${saveError instanceof Error ? saveError.message : String(saveError)}`)
      throw saveError
    }

    // Auto-update intake state to track this question as asked
    if (sessionId) {
      try {
        const { addAskedQuestion } = await import('@/lib/supabase/claim-intake-state')
        await addAskedQuestion(sessionId, questionId)
        console.log(`[handleSaveAnswer] Updated database_questions_asked for session ${sessionId}, question ${questionId}`)
      } catch (error) {
        console.error(`[handleSaveAnswer] Failed to update database_questions_asked:`, error)
        // Don't fail the whole operation - answer is saved
      }
    } else {
      console.warn(`[handleSaveAnswer] No sessionId provided, skipping database_questions_asked update`)
    }

    const elapsedTime = Date.now() - startTime
    console.log(`[handleSaveAnswer] Completed successfully in ${elapsedTime}ms - Claim ID: ${actualClaimId}, Question ID: ${questionId}`)

    return {
      success: true,
      data: {
        message: 'Answer saved',
        claimId: actualClaimId,
        validationResult: {
          passed: validationResult.passed,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        },
      },
    }
  } catch (error) {
    const elapsedTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[handleSaveAnswer] Error after ${elapsedTime}ms - Claim ID: ${claimId}, Question ID: ${questionId}, Error:`, errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Validate answers (Claims Mode)
 */
export async function handleValidateAnswers(
  coverageTypeId: string,
  answers: Record<string, unknown>
): Promise<ToolHandlerResult> {
  try {
    const result = await validateAnswers(coverageTypeId, answers)
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate answers',
    }
  }
}

/**
 * Extract document info (Claims Mode)
 * documentPath can be either:
 * - Full path: "claim-documents/userId/timestamp-filename.pdf"
 * - Just path: "userId/timestamp-filename.pdf" (bucket is assumed to be 'claim-documents')
 */
export async function handleExtractDocumentInfo(
  documentPath: string,
  claimId: string,
  documentType?: string
): Promise<ToolHandlerResult> {
  const startTime = Date.now()
  console.log(`[handleExtractDocumentInfo] Starting extraction - Claim ID: ${claimId}, Document Path: ${documentPath}, Expected Type: ${documentType || 'unknown'}`)
  
  // Validate inputs - reject placeholder values and template patterns
  const placeholderPatterns = [
    'file_path', 
    'path_to_', 
    'document_path', 
    'session_id', 
    'claim_id', 
    'placeholder',
    'userid/timestamp',  // Template pattern like "userId/timestamp-receipt.png"
    'user_id/timestamp', // Alternative template pattern
  ]
  
  const pathLower = documentPath.toLowerCase()
  const claimIdLower = claimId.toLowerCase()
  
  const isPlaceholderPath = placeholderPatterns.some(pattern => 
    pathLower.includes(pattern.toLowerCase())
  ) || pathLower === 'file_path' || pathLower.startsWith('path_to_') || 
      /^(userid|user_id)\/timestamp/.test(pathLower) // Template patterns
  
  const isPlaceholderClaimId = placeholderPatterns.some(pattern => 
    claimIdLower.includes(pattern.toLowerCase())
  ) || claimIdLower === 'session_id' || claimIdLower === 'claim_id'
  
  // Also check if path looks like a template (contains literal "userId" or "timestamp" as words, not UUID/timestamp values)
  const templatePattern = /\b(userid|user_id|timestamp)\b/i
  const looksLikeTemplate = templatePattern.test(documentPath) && 
                             !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(documentPath) // Not a real UUID
  
  if (isPlaceholderPath || isPlaceholderClaimId || looksLikeTemplate) {
    console.error(`[handleExtractDocumentInfo] Rejected placeholder/template values - Path: "${documentPath}", Claim ID: "${claimId}"`)
    
    // Determine if it's an image based on file extension
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(documentPath)
    const imageNote = isImage 
      ? ' Note: Images (PNG, JPEG, etc.) are shown to you via vision API - you should analyze them visually and extract information directly. Do NOT call extract_document_info for images.'
      : ''
    
    return {
      success: false,
      error: `Invalid parameters: Please provide actual document path and claim ID (UUID format), not placeholders or template values like "userId/timestamp-receipt.png" or "session_id". Documents (PDFs) are automatically processed when uploaded - you do not need to call this tool manually.${imageNote}`,
      data: {
        extraction: {
          extractedEntities: {},
          autoFilledFields: {},
          validationResults: {
            isValid: false,
            errors: [`Cannot process document: Invalid parameters provided (placeholder values detected). Documents are automatically processed when uploaded.${imageNote}`],
            warnings: [],
          },
        },
        validation: {
          isLegitimate: true,
          isRelevant: false,
          contextMatches: false,
          isValid: false,
          errors: [`Cannot process document: Invalid parameters provided (placeholder values detected). Documents are automatically processed when uploaded.${imageNote}`],
          warnings: [],
        },
      },
    }
  }
  
  try {
    // Validate claimId is a valid UUID - if not, it might be "session_id" and we need to get the actual claim ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let actualClaimId = claimId
    
    if (!uuidRegex.test(claimId)) {
      console.warn(`[handleExtractDocumentInfo] Invalid claimId format: "${claimId}". Attempting to get claim from current user's session.`)
      
      // Try to get claim ID from current user's most recent chat session
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get the user's most recent claim-mode chat session with a claim_id
        try {
          const { data: recentSession } = await supabase
            .from('chat_sessions')
            .select('claim_id, id')
            .eq('user_id', user.id)
            .eq('mode', 'claim')
            .not('claim_id', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()
          
          if (recentSession?.claim_id && uuidRegex.test(recentSession.claim_id)) {
            actualClaimId = recentSession.claim_id
            console.log(`[handleExtractDocumentInfo] Found claim ID from user's recent session: ${actualClaimId}`)
          } else {
            // Try intake state with the session ID if we got one
            if (recentSession?.id) {
              const { getIntakeStateBySession } = await import('@/lib/supabase/claim-intake-state')
              try {
                const intakeState = await getIntakeStateBySession(recentSession.id)
                if (intakeState?.claim_id && uuidRegex.test(intakeState.claim_id)) {
                  actualClaimId = intakeState.claim_id
                  console.log(`[handleExtractDocumentInfo] Found claim ID from intake state: ${actualClaimId}`)
                }
              } catch (intakeError) {
                console.warn(`[handleExtractDocumentInfo] Could not get claim from intake state:`, intakeError)
              }
            }
          }
        } catch (sessionError) {
          console.warn(`[handleExtractDocumentInfo] Could not get claim from user sessions:`, sessionError)
        }
      }
      
      // If we still don't have a valid claim ID, return error
      if (!uuidRegex.test(actualClaimId)) {
        console.error(`[handleExtractDocumentInfo] Could not determine valid claim ID from: "${claimId}"`)
        return {
          success: false,
          error: 'Invalid claim ID. Cannot process document without a valid claim.',
          data: {
            extraction: {
              extractedEntities: {},
              autoFilledFields: {},
              validationResults: {
                isValid: false,
                errors: ['Cannot process document: No valid claim found. Please ensure you have started a claim before uploading documents.'],
                warnings: [],
              },
            },
            validation: {
              isLegitimate: true,
              isRelevant: false,
              contextMatches: false,
              isValid: false,
              errors: ['Cannot process document: No valid claim found. Please ensure you have started a claim before uploading documents.'],
              warnings: [],
            },
          },
        }
      }
    }
    
    // Get signed URL for the document
    const supabase = await createClient()
    const bucket = 'claim-documents'
    const path = documentPath
    
    console.log(`[handleExtractDocumentInfo] Getting signed URL for path: ${path} in bucket: ${bucket}`)
    const { data: signedData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600)
    
    if (urlError) {
      console.error(`[handleExtractDocumentInfo] Error getting signed URL:`, urlError)
    }
    
    if (!signedData?.signedUrl) {
      console.error(`[handleExtractDocumentInfo] Signed URL creation failed. Path: ${path}, Bucket: ${bucket}, Error:`, urlError)
      // Cannot validate without processing - all validation flags must be false
      return {
        success: true,
        data: {
          extraction: {
            extractedEntities: {},
            autoFilledFields: {},
            validationResults: {
              isValid: false,
              errors: ['Unable to access document for processing. Please check the file and try uploading again.'],
              warnings: [],
            },
          },
          validation: {
            isLegitimate: true, // Assume legitimate on technical errors
            isRelevant: false, // Cannot validate without processing
            contextMatches: false, // Cannot validate without processing
            isValid: false,
            errors: ['Unable to access document for processing. Please check the file and try uploading again.'],
            warnings: [],
          },
        },
      }
    }
    
    console.log(`[handleExtractDocumentInfo] Got signed URL (masked: ${signedData.signedUrl.substring(0, 50)}...), proceeding with extraction`)
    
    // Determine MIME type from extension
    const ext = path.split('.').pop()?.toLowerCase() || ''
    let mimeType = 'application/octet-stream'
    if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg'
    else if (ext === 'png') mimeType = 'image/png'
    else if (ext === 'gif') mimeType = 'image/gif'
    else if (ext === 'webp') mimeType = 'image/webp'
    else if (ext === 'pdf') mimeType = 'application/pdf'
    
    // Get claim context for validation (use actualClaimId)
    const { getClaim } = await import('@/lib/supabase/claims')
    const claim = await getClaim(actualClaimId)
    const { getExtractedInfo } = await import('@/lib/supabase/claim-extracted-info')
    const extractedInfo = await getExtractedInfo(actualClaimId)
    const { getClaimAnswers } = await import('@/lib/supabase/claim-answers')
    const claimAnswers = await getClaimAnswers(actualClaimId)
    const { getCoverageType } = await import('@/lib/supabase/coverage-types')
    
    // Build context from claim and answers
    const coverageType = claim?.coverage_type_ids?.[0] 
      ? await getCoverageType(claim.coverage_type_ids[0])
      : null
    
    // Build previous answers map
    const previousAnswers: Record<string, unknown> = {}
    for (const answer of claimAnswers) {
      if (answer.answer_text) previousAnswers[`answer_${answer.question_id}`] = answer.answer_text
      if (answer.answer_number !== null) previousAnswers[`answer_${answer.question_id}_number`] = answer.answer_number
      if (answer.answer_date) previousAnswers[`answer_${answer.question_id}_date`] = answer.answer_date
    }
    
    // Build extracted info map
    const extractedInfoMap: Record<string, unknown> = {}
    for (const info of extractedInfo) {
      extractedInfoMap[info.field_name] = info.field_value
    }
    
    const context = {
      claimContext: {
        coverageType: coverageType?.name || undefined,
        incidentDescription: claim?.incident_description || undefined,
        incidentDate: claim?.incident_date || undefined,
        incidentLocation: claim?.incident_location || undefined,
      },
      previousAnswers,
      extractedInfo: extractedInfoMap,
    }
    
    console.log(`[handleExtractDocumentInfo] Calling extractDocumentInfo with mimeType: ${mimeType}, documentType: ${documentType}`)
    console.log(`[handleExtractDocumentInfo] Context - Coverage Type: ${context.claimContext.coverageType || 'none'}, Incident Date: ${context.claimContext.incidentDate || 'none'}, Incident Location: ${context.claimContext.incidentLocation || 'none'}`)
    
    const extraction = await extractDocumentInfo(
      { 
        path: documentPath,
        url: signedData.signedUrl,
        mimeType,
      },
      documentType,
      context
    )
    
    console.log(`[handleExtractDocumentInfo] Extraction completed. Validation flags - isRelevant: ${extraction.isRelevant}, contextMatches: ${extraction.contextMatches}, isLegitimate: ${extraction.isLegitimate}, isValid: ${extraction.validationResults.isValid}`)
    console.log(`[handleExtractDocumentInfo] Extraction stats - Entities: ${Object.keys(extraction.extractedEntities).length}, AutoFilled: ${Object.keys(extraction.autoFilledFields).length}, Document Type: ${extraction.documentType}`)

    // Save to claim_documents using Supabase client (structured like SQL for MCP compatibility)
    const fileName = documentPath.split('/').pop() || 'document'
    console.log(`[handleExtractDocumentInfo] Inserting document record into claim_documents - File: ${fileName}, Verified: ${extraction.validationResults.isValid}`)
    
    // Using Supabase client insert (equivalent to SQL INSERT)
    const { data: document, error: docError } = await supabase
      .from('claim_documents')
      .insert({
        claim_id: actualClaimId,
        file_path: documentPath,
        file_name: fileName,
        file_type: documentType || 'unknown',
        mime_type: mimeType,
        extracted_entities: extraction.extractedEntities as any,
        ocr_data: typeof extraction.ocrData === 'string' ? { text: extraction.ocrData } : (extraction.ocrData as any),
        auto_filled_fields: extraction.autoFilledFields as any,
        processing_status: 'completed',
        is_verified: extraction.validationResults.isValid,
        validation_results: extraction.validationResults as any,
        authenticity_score: extraction.authenticityScore || null,
        tampering_detected: extraction.tamperingDetected || false,
        processed_at: new Date().toISOString(),
      } as any)
      .select('id')
      .single()
    
    if (docError || !document) {
      console.error(`[handleExtractDocumentInfo] Failed to insert document record:`, docError)
      throw new Error(`Failed to insert document record: ${docError?.message || 'Unknown error'}`)
    }
    
    const documentId = document.id
    console.log(`[handleExtractDocumentInfo] Document record inserted - ID: ${documentId}`)

    // Check if validation passed - only save extracted info if ALL flags are true
    const allValidationPassed = extraction.isRelevant === true && 
                                 extraction.contextMatches === true && 
                                 extraction.validationResults.isValid === true
    
    console.log(`[handleExtractDocumentInfo] Validation check - isRelevant: ${extraction.isRelevant}, contextMatches: ${extraction.contextMatches}, isValid: ${extraction.validationResults.isValid}, allPassed: ${allValidationPassed}`)
    
    if (allValidationPassed) {
      // Save extracted info to claim_extracted_information using Supabase client (structured like SQL)
      const fieldCount = Object.keys(extraction.autoFilledFields).length
      console.log(`[handleExtractDocumentInfo] Saving ${fieldCount} extracted fields to claim_extracted_information`)
      
      for (const [fieldName, fieldValue] of Object.entries(extraction.autoFilledFields)) {
        try {
          // Check if field already exists (equivalent to SELECT)
          const { data: existingField } = await supabase
            .from('claim_extracted_information')
            .select('id')
            .eq('claim_id', actualClaimId)
            .eq('field_name', fieldName)
            .single()
          
          const fieldValueJson = fieldValue as unknown as Record<string, unknown>
          
          if (existingField) {
            // Update existing (equivalent to SQL UPDATE)
            const existingId = existingField.id
            console.log(`[handleExtractDocumentInfo] Updating existing field: ${fieldName} (ID: ${existingId})`)
            const { error: updateError } = await supabase
              .from('claim_extracted_information')
              .update({
                field_value: fieldValueJson as any,
                confidence: 'high',
                source: 'ai_inference',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingId)
            
            if (updateError) {
              throw updateError
            }
          } else {
            // Insert new (equivalent to SQL INSERT)
            console.log(`[handleExtractDocumentInfo] Inserting new field: ${fieldName}`)
            const { error: insertError } = await supabase
              .from('claim_extracted_information')
              .insert({
                claim_id: actualClaimId,
                field_name: fieldName,
                field_value: fieldValueJson as any,
                confidence: 'high',
                source: 'ai_inference',
              } as any)
            
            if (insertError) {
              throw insertError
            }
          }
          console.log(`[handleExtractDocumentInfo] Successfully saved field: ${fieldName}`)
        } catch (fieldError) {
          console.error(`[handleExtractDocumentInfo] Error saving field ${fieldName}:`, fieldError)
          // Continue with other fields
        }
      }
      console.log(`[handleExtractDocumentInfo] Completed saving ${fieldCount} extracted fields`)
    } else {
      console.log(`[handleExtractDocumentInfo] Validation failed - NOT saving extracted info. Reasons: isRelevant=${extraction.isRelevant}, contextMatches=${extraction.contextMatches}, isValid=${extraction.validationResults.isValid}`)
    }

    // Build validation errors/warnings based on failure reasons
    const validationErrors = [...(extraction.validationResults.errors || [])]
    const validationWarnings = [...(extraction.validationResults.warnings || [])]
    
    // Add specific error messages for validation failures
    if (extraction.isRelevant === false) {
      const coverageTypeName = coverageType?.name || 'claim'
      validationErrors.push(`Document type does not match the requirements for this ${coverageTypeName} claim. Please upload the correct document type (e.g., ${documentType || 'receipt'} for ${coverageTypeName}).`)
    }
    
    if (extraction.contextMatches === false) {
      validationErrors.push('Document information does not match the claim context (dates, amounts, locations, or other details). Please verify and upload the correct document.')
    }
    
    if (extraction.isLegitimate === false) {
      validationWarnings.push('Document authenticity could not be verified. Please ensure the document is original and unaltered.')
    }

    const elapsedTime = Date.now() - startTime
    console.log(`[handleExtractDocumentInfo] Extraction process completed successfully in ${elapsedTime}ms - Document ID: ${documentId}`)

    return {
      success: true,
      data: {
        documentId: documentId,
        extraction,
        validation: {
          isLegitimate: extraction.isLegitimate,
          isRelevant: extraction.isRelevant,
          contextMatches: extraction.contextMatches,
          isValid: extraction.validationResults.isValid,
          errors: validationErrors,
          warnings: validationWarnings,
        },
      },
    }
  } catch (error) {
    const elapsedTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error(`[handleExtractDocumentInfo] Error occurred after ${elapsedTime}ms:`, {
      error: errorMessage,
      stack: errorStack,
      documentPath,
      claimId,
      documentType: documentType || 'unknown',
    })
    
    // Validate claimId before trying to save - don't save if it's invalid
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isValidClaimId = uuidRegex.test(claimId)
    
    // For better error handling, try to at least save the document reference using Supabase client
    // Only if we have a valid claim ID
    if (isValidClaimId) {
      try {
        const supabaseError = await createClient()
        const { data: { user } } = await supabaseError.auth.getUser()
        
        if (user) {
          console.log(`[handleExtractDocumentInfo] Attempting to save failed document record for user: ${user.id}`)
          // Try to save document reference even if extraction failed (equivalent to SQL INSERT)
          const fileName = documentPath.split('/').pop() || 'document'
          const { error: saveError } = await supabaseError
            .from('claim_documents')
            .insert({
              claim_id: claimId,
            file_path: documentPath,
            file_name: fileName,
            file_type: documentType || 'unknown',
            extracted_entities: {},
            ocr_data: {},
            auto_filled_fields: {},
            processing_status: 'failed',
            is_verified: false,
            validation_results: {
              isValid: false,
              errors: [errorMessage],
              warnings: [],
            },
          })
        
          if (saveError) {
            console.error(`[handleExtractDocumentInfo] Failed to save failed document reference:`, saveError)
          } else {
            console.log(`[handleExtractDocumentInfo] Saved failed document record successfully`)
          }
        }
      } catch (saveError) {
        console.error(`[handleExtractDocumentInfo] Exception while saving document reference:`, saveError)
      }
    } else {
      console.warn(`[handleExtractDocumentInfo] Skipping document save - invalid claim ID: "${claimId}"`)
    }
    
    // Return success with minimal data so AI can continue
    // Clear error message - no confusing warnings about manual review
    return {
      success: true,
      data: {
        extraction: {
          extractedEntities: {},
          autoFilledFields: {},
          validationResults: {
            isValid: false,
            errors: [],
            warnings: [],
          },
        },
        validation: {
          isLegitimate: true, // Assume legitimate on technical errors
          isRelevant: false, // Cannot validate without processing
          contextMatches: false, // Cannot validate without processing
          isValid: false,
          errors: ['Unable to process document - please try uploading again with a valid file format'],
          warnings: [],
        },
      },
    }
  }
}

/**
 * Save extracted info (Claims Mode)
 */
export async function handleSaveExtractedInfo(
  claimId: string,
  fieldName: string,
  fieldValue: unknown,
  confidence?: string,
  source?: string
): Promise<ToolHandlerResult> {
  try {
    await saveExtractedInfo({
      claim_id: claimId,
      field_name: fieldName,
      field_value: fieldValue as any,
      confidence: confidence || 'medium',
      source: source || 'ai_analysis',
    })

    return {
      success: true,
      data: { message: 'Extracted info saved' },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save extracted info',
    }
  }
}

/**
 * Create claim (Claims Mode)
 * Note: A draft claim is usually created during categorization.
 * This function finalizes the claim by updating it from 'draft' to 'pending' status.
 * It reads extracted information, claim answers, and user policies to populate all fields.
 */
export async function handleCreateClaim(
  sessionId: string,
  data: {
    coverage_type_ids: string[]
    incident_description: string
    incident_date: string
    incident_location: string
    incident_type: string
    total_claimed_amount: number
    currency?: string
    policy_id?: string
  }
): Promise<ToolHandlerResult> {
  const startTime = Date.now()
  console.log(`[handleCreateClaim] Starting claim finalization - Session ID: ${sessionId}, Incident: ${data.incident_type}, Amount: ${data.total_claimed_amount}, Date: ${data.incident_date}, Location: ${data.incident_location}`)
  
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error(`[handleCreateClaim] User not authenticated for session: ${sessionId}`)
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    // Check if a draft claim already exists
    const intakeState = await getIntakeStateBySession(sessionId)
    const claimId = intakeState?.claim_id

    if (!claimId) {
      console.warn(`[handleCreateClaim] No draft claim found for session: ${sessionId}`)
      return {
        success: false,
        error: 'No draft claim found. Please categorize the incident first.',
      }
    }
    
    console.log(`[handleCreateClaim] Found draft claim ID: ${claimId}, updating to finalized status`)

    // Get all extracted information for the claim
    const { getExtractedInfo } = await import('@/lib/supabase/claim-extracted-info')
    const { getClaimAnswers } = await import('@/lib/supabase/claim-answers')
    const { getActiveUserPolicies } = await import('@/lib/supabase/user-policies')
    
    const extractedInfo = await getExtractedInfo(claimId)
    const claimAnswers = await getClaimAnswers(claimId)
    const userPolicies = await getActiveUserPolicies(user.id)

    // Build a map of extracted information for easy lookup
    const extractedMap: Record<string, unknown> = {}
    for (const info of extractedInfo) {
      let fieldValue = info.field_value
      
      // Handle JSON values - extract the actual value
      if (typeof fieldValue === 'string') {
        // Try to parse if it looks like JSON
        try {
          const parsed = JSON.parse(fieldValue)
          fieldValue = parsed
        } catch {
          // Not JSON, use as-is
        }
      }
      
      if (typeof fieldValue === 'object' && fieldValue !== null) {
        // If it's a JSON object with a value property, extract it
        if ('value' in fieldValue) {
          extractedMap[info.field_name] = (fieldValue as { value: unknown }).value
        } else {
          extractedMap[info.field_name] = fieldValue
        }
      } else {
        extractedMap[info.field_name] = fieldValue
      }
    }

    // Map extracted information to claim fields
    // Use extracted info to override provided data if available and more specific
    let finalIncidentDate = data.incident_date
    let finalIncidentLocation = data.incident_location
    let finalIncidentType = data.incident_type
    let finalTotalClaimedAmount = data.total_claimed_amount
    let finalCurrency = data.currency || 'USD'
    let finalPolicyId = data.policy_id || null

    // Map common extracted fields to claim fields
    if (extractedMap.scheduled_departure_date) {
      const dateValue = extractedMap.scheduled_departure_date
      if (typeof dateValue === 'string') {
        finalIncidentDate = dateValue
      }
    }
    if (extractedMap.incident_date) {
      const dateValue = extractedMap.incident_date
      if (typeof dateValue === 'string') {
        finalIncidentDate = dateValue
      }
    }

    // Map location fields
    if (extractedMap.origin && extractedMap.destination) {
      finalIncidentLocation = `${extractedMap.origin} to ${extractedMap.destination}`
    } else if (extractedMap.origin) {
      finalIncidentLocation = String(extractedMap.origin)
    } else if (extractedMap.destination) {
      finalIncidentLocation = String(extractedMap.destination)
    } else if (extractedMap.incident_location) {
      finalIncidentLocation = String(extractedMap.incident_location)
    } else if (extractedMap.location) {
      finalIncidentLocation = String(extractedMap.location)
    }

    // Map incident type from coverage type or extracted info
    if (extractedMap.incident_type) {
      finalIncidentType = String(extractedMap.incident_type)
    } else if (data.incident_type === 'pending' && extractedMap.cancellation_reason) {
      finalIncidentType = 'flight_cancellation'
    } else if (data.incident_type === 'pending') {
      // Try to infer from coverage type
      const { getCoverageType } = await import('@/lib/supabase/coverage-types')
      if (data.coverage_type_ids.length > 0) {
        const coverageType = await getCoverageType(data.coverage_type_ids[0])
        if (coverageType) {
          // Convert coverage type slug to incident type
          const slug = coverageType.slug || ''
          finalIncidentType = slug.replace(/-/g, '_') || 'other'
        }
      }
    }

    // Map amount fields
    if (extractedMap.ticket_cost) {
      const costValue = extractedMap.ticket_cost
      if (typeof costValue === 'number') {
        finalTotalClaimedAmount = costValue
      } else if (typeof costValue === 'string') {
        const parsed = parseFloat(costValue)
        if (!isNaN(parsed)) {
          finalTotalClaimedAmount = parsed
        }
      }
    } else if (extractedMap.amount) {
      const amountValue = extractedMap.amount
      if (typeof amountValue === 'number') {
        finalTotalClaimedAmount = amountValue
      } else if (typeof amountValue === 'string') {
        const parsed = parseFloat(amountValue)
        if (!isNaN(parsed)) {
          finalTotalClaimedAmount = parsed
        }
      }
    } else if (extractedMap.total_claimed_amount) {
      const amountValue = extractedMap.total_claimed_amount
      if (typeof amountValue === 'number') {
        finalTotalClaimedAmount = amountValue
      } else if (typeof amountValue === 'string') {
        const parsed = parseFloat(amountValue)
        if (!isNaN(parsed)) {
          finalTotalClaimedAmount = parsed
        }
      }
    }

    // Get user's policy if not provided
    if (!finalPolicyId && userPolicies.length > 0) {
      // Try to find a policy that matches the coverage types
      for (const userPolicy of userPolicies) {
        if (userPolicy.policy_id) {
          finalPolicyId = userPolicy.policy_id
          break
        }
      }
    }

    // Build claim summary from all collected data
    const claimSummary: Record<string, unknown> = {
      incident_description: data.incident_description,
      coverage_types: data.coverage_type_ids,
      collected_fields: Object.keys(extractedMap),
      answers_count: claimAnswers.length,
      extracted_info_count: extractedInfo.length,
    }

    // Add extracted information to summary
    for (const [key, value] of Object.entries(extractedMap)) {
      claimSummary[key] = value
    }

    // Build AI analysis
    const aiAnalysis: Record<string, unknown> = {
      extraction_confidence: extractedInfo.length > 0 ? 'high' : 'medium',
      fields_extracted: extractedInfo.map((info) => ({
        field: info.field_name,
        confidence: info.confidence,
        source: info.source,
      })),
      answers_provided: claimAnswers.length,
      data_completeness: extractedInfo.length > 0 && claimAnswers.length > 0 ? 'complete' : 'partial',
      extracted_at: new Date().toISOString(),
    }

    // Update existing draft claim to finalize it
    console.log(`[handleCreateClaim] Setting claim status to submitted - Claim ID: ${claimId}, Previous status: draft`)
    const claim = await updateClaim(claimId, {
      coverage_type_ids: data.coverage_type_ids,
      incident_description: data.incident_description,
      incident_date: finalIncidentDate,
      incident_location: finalIncidentLocation,
      incident_type: finalIncidentType,
      total_claimed_amount: finalTotalClaimedAmount,
      currency: finalCurrency,
      policy_id: finalPolicyId,
      status: 'submitted', // Change from 'draft' to 'submitted'
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      claim_summary: claimSummary as any,
      ai_analysis: aiAnalysis as any,
    })

    // Update intake state to mark as completed
    if (intakeState) {
      await upsertIntakeState({
        session_id: sessionId,
        user_id: user.id,
        claim_id: claim.id,
        current_stage: 'claim_creation',
        completed_at: new Date().toISOString(),
      })
    }

    // Update chat session to link claim and archive it
    const { error: sessionUpdateError } = await supabase
      .from('chat_sessions')
      .update({ 
        claim_id: claim.id, 
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', sessionId)
    
    if (sessionUpdateError) {
      console.error(`[handleCreateClaim] Failed to archive chat session:`, sessionUpdateError)
      // Continue anyway - the claim is created
    }

    const elapsedTime = Date.now() - startTime
    console.log(`[handleCreateClaim] Claim finalized successfully - Claim ID: ${claim.id}, Claim Number: ${claim.claim_number}, Status: ${claim.status}, Elapsed time: ${elapsedTime}ms`)
    
    return {
      success: true,
      data: {
        claimId: claim.id,
        claimNumber: claim.claim_number,
        status: claim.status,
      },
    }
  } catch (error) {
    const elapsedTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[handleCreateClaim] Error finalizing claim after ${elapsedTime}ms - Session ID: ${sessionId}, Error:`, errorMessage, error instanceof Error ? error.stack : '')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create claim',
    }
  }
}

/**
 * Prepare claim summary (Claims Mode)
 * Generates a comprehensive summary of the claim before finalization
 */
export async function handlePrepareClaimSummary(
  sessionId: string
): Promise<ToolHandlerResult> {
  const startTime = Date.now()
  console.log(`[handlePrepareClaimSummary] Starting summary generation - Session ID: ${sessionId}`)
  
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error(`[handlePrepareClaimSummary] User not authenticated for session: ${sessionId}`)
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    // Validate and resolve session_id if it's a placeholder
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let actualSessionId = sessionId
    
    if (!uuidRegex.test(sessionId)) {
      console.warn(`[handlePrepareClaimSummary] Invalid session_id format: "${sessionId}". Attempting to resolve from current user's session.`)
      
      // Try to get the most recent claim-mode session for this user
      try {
        const { data: recentSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('id, claim_id')
          .eq('user_id', user.id)
          .eq('mode', 'claim')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (sessionError) {
          console.error(`[handlePrepareClaimSummary] Error querying sessions:`, sessionError)
        }
        
        if (recentSession?.id && uuidRegex.test(recentSession.id)) {
          actualSessionId = recentSession.id
          console.log(`[handlePrepareClaimSummary] Resolved session_id from user's recent session: ${actualSessionId}`)
        } else {
          console.error(`[handlePrepareClaimSummary] Could not resolve valid session_id. Provided: "${sessionId}", Found session: ${recentSession?.id || 'none'}`)
          return {
            success: false,
            error: `Invalid session ID. Please ensure you're calling this tool with the actual session ID (UUID format), not a placeholder like "session_id". The session_id should be automatically provided by the system.`,
          }
        }
      } catch (resolveError) {
        console.error(`[handlePrepareClaimSummary] Error resolving session_id:`, resolveError)
        return {
          success: false,
          error: `Invalid session ID: "${sessionId}". Could not resolve actual session ID. Error: ${resolveError instanceof Error ? resolveError.message : 'Unknown error'}`,
        }
      }
    } else {
      console.log(`[handlePrepareClaimSummary] Session ID format is valid: ${sessionId}`)
    }

    // Get intake state to find claim_id
    const intakeState = await getIntakeStateBySession(actualSessionId)
    console.log(`[handlePrepareClaimSummary] Intake state lookup - Session: ${actualSessionId}, Has intake state: ${!!intakeState}, Intake state claim_id: ${intakeState?.claim_id || 'NULL'}`)
    
    // If intake state doesn't have claim_id, check chat_sessions as fallback
    let claimId = intakeState?.claim_id || null
    
    if (!claimId) {
      console.log(`[handlePrepareClaimSummary] Intake state has no claim_id, checking chat_sessions as fallback...`)
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('claim_id')
        .eq('id', actualSessionId)
        .single()
      
      if (sessionError) {
        console.error(`[handlePrepareClaimSummary] Error querying chat_sessions:`, sessionError)
      }
      
      if (session?.claim_id) {
        claimId = session.claim_id
        console.log(`[handlePrepareClaimSummary] Found claim_id from chat_sessions: ${claimId}`)
        
        // Sync it back to intake state if intake state exists
        if (intakeState) {
          console.log(`[handlePrepareClaimSummary] Syncing claim_id to intake state - Intake state ID: ${intakeState.id}, Claim ID: ${claimId}`)
          const { error: syncError } = await supabase
            .from('claim_intake_state')
            .update({ claim_id: claimId })
            .eq('id', intakeState.id)
          
          if (syncError) {
            console.error(`[handlePrepareClaimSummary] Error syncing claim_id to intake state:`, syncError)
          } else {
            console.log(`[handlePrepareClaimSummary] Successfully synced claim_id to intake state`)
          }
        } else {
          console.warn(`[handlePrepareClaimSummary] Found claim_id in chat_sessions but no intake state exists to sync to`)
        }
      } else {
        console.warn(`[handlePrepareClaimSummary] No claim_id found in chat_sessions either`)
      }
    } else {
      console.log(`[handlePrepareClaimSummary] Found claim_id from intake state: ${claimId}`)
    }
    
    if (!claimId) {
      console.warn(`[handlePrepareClaimSummary] No draft claim found for session: ${actualSessionId} (original: ${sessionId}) - checked both intake_state and chat_sessions`)
      return {
        success: false,
        error: 'No draft claim found. Please complete the intake process first.',
      }
    }

    console.log(`[handlePrepareClaimSummary] Resolved claim ID: ${claimId} for session: ${actualSessionId} (original: ${sessionId})`)

    // Get all collected information
    const { getExtractedInfo } = await import('@/lib/supabase/claim-extracted-info')
    const extractedInfo = await getExtractedInfo(claimId)
    const claimAnswers = await getClaimAnswers(claimId)
    const { getQuestionsByCoverageType } = await import('@/lib/supabase/questions')

    // Get coverage type information
    const coverageTypeIds = intakeState?.coverage_type_ids || []
    const coverageTypes = await Promise.all(
      coverageTypeIds.map(async (ctId) => {
        const ct = await getCoverageType(ctId)
        const questions = await getQuestionsByCoverageType(ctId)
        return {
          id: ctId,
          name: ct?.name || 'Unknown',
          description: ct?.description || null,
          questions_count: questions.length,
        }
      })
    )

    // Get policy information if available
    const { getUserPoliciesWithCoverageTypes } = await import('@/lib/supabase/user-policies')
    const userPolicies = await getUserPoliciesWithCoverageTypes(user.id)
    const matchingPolicies = userPolicies.filter((policy) =>
      policy.coverage_types.some((ct) => coverageTypeIds.includes(ct.coverage_type_id))
    )

    // Build answers map with question text
    const { getQuestion } = await import('@/lib/supabase/questions')
    const answersWithQuestions = await Promise.all(
      claimAnswers.map(async (answer) => {
        const question = await getQuestion(answer.question_id)
        return {
          question_text: question?.question_text || 'Unknown question',
          answer_text: answer.answer_text,
          answer_number: answer.answer_number,
          answer_date: answer.answer_date,
          answer_select: answer.answer_select,
        }
      })
    )

    // Build extracted information summary
    const extractedSummary: Record<string, unknown> = {}
    for (const info of extractedInfo) {
      extractedSummary[info.field_name] = info.field_value
    }

    // Build comprehensive summary
    console.log(`[handlePrepareClaimSummary] Building summary - Session ID: ${actualSessionId}, Claim ID: ${claimId}, Answers: ${claimAnswers.length}, Extracted fields: ${extractedInfo.length}, Coverage types: ${coverageTypes.length}, Policies: ${matchingPolicies.length}`)
    
    const summary = {
      incident_description: intakeState?.incident_description || 'Not provided',
      coverage_types: coverageTypes.map((ct) => ({
        name: ct.name,
        description: ct.description,
      })),
      policies: matchingPolicies.map((policy) => ({
        policy_name: policy.policy_name,
        coverage_limits: policy.coverage_types
          .filter((ct) => coverageTypeIds.includes(ct.coverage_type_id))
          .map((ct) => ({
            coverage_type: ct.coverage_type_name,
            limit: ct.coverage_limit,
            deductible: ct.deductible,
          })),
      })),
      answers: answersWithQuestions,
      extracted_information: extractedSummary,
      total_answers: claimAnswers.length,
      total_extracted_fields: extractedInfo.length,
      collected_at: new Date().toISOString(),
    }
    
    const formattedSummary = JSON.stringify(summary, null, 2)
    const summaryLength = formattedSummary.length
    const elapsedTime = Date.now() - startTime
    
    console.log(`[handlePrepareClaimSummary] Summary generated successfully - Session ID: ${actualSessionId}, Claim ID: ${claimId}, Summary length: ${summaryLength} chars, Sections: incident_description, coverage_types (${coverageTypes.length}), policies (${matchingPolicies.length}), answers (${claimAnswers.length}), extracted_information (${extractedInfo.length}), Elapsed time: ${elapsedTime}ms`)

    return {
      success: true,
      data: {
        summary,
        formatted_summary: formattedSummary,
      },
    }
  } catch (error) {
    const elapsedTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error(`[handlePrepareClaimSummary] Error generating summary after ${elapsedTime}ms - Session ID: ${sessionId}, Error:`, errorMessage)
    if (errorStack) {
      console.error(`[handlePrepareClaimSummary] Error stack trace:`, errorStack)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare claim summary',
    }
  }
}

/**
 * Update claim stage (Claims Mode)
 */
export async function handleUpdateClaimStage(
  sessionId: string,
  stage: string
): Promise<ToolHandlerResult> {
  try {
    await updateStage(sessionId, stage)
    return {
      success: true,
      data: { message: 'Stage updated' },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update stage',
    }
  }
}

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
      return {
        success: false,
        error: 'Claim not found',
      }
    }

    const answers = await getClaimAnswers(claimId)
    const notes = await getClaimNotes(claimId)

    return {
      success: true,
      data: {
        claim,
        answers,
        notes,
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

/**
 * Admin: Add note
 */
export async function handleAddAdminNote(
  claimId: string,
  adminId: string,
  content: string,
  noteType?: string
): Promise<ToolHandlerResult> {
  try {
    const note = await addNote({
      claim_id: claimId,
      admin_id: adminId,
      content,
      note_type: noteType || 'review',
    })

    return {
      success: true,
      data: note,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add note',
    }
  }
}

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

      // Claims tools
      case 'categorize_incident':
        return handleCategorizeIncident(args.incident_description as string)
      case 'check_policy_coverage':
        return handleCheckPolicyCoverage(
          args.coverage_type_id as string,
          userId
        )
      case 'get_intake_state':
        return handleGetIntakeState(args.session_id as string)
      case 'update_intake_state':
        return handleUpdateIntakeState(args.session_id as string, args as {
          current_stage?: string
          coverage_type_ids?: string[]
          incident_description?: string
          database_questions_asked?: string[]
          validation_passed?: boolean
          validation_errors?: string[]
        })
      case 'get_coverage_questions':
        return handleGetCoverageQuestions(args.coverage_type_id as string)
      case 'get_coverage_rules':
        return handleGetCoverageRules(args.coverage_type_id as string)
      case 'get_extracted_info':
        return handleGetExtractedInfo(args.claim_id as string)
      case 'save_answer':
        return handleSaveAnswer(
          args.claim_id as string | undefined,
          args.question_id as string,
          args as {
            answer_text?: string
            answer_number?: number
            answer_date?: string
            answer_select?: string
            answer_file_ids?: string[]
          },
          sessionId
        )
      case 'validate_answers':
        return handleValidateAnswers(
          args.coverage_type_id as string,
          args.answers as Record<string, unknown>
        )
      case 'extract_document_info':
        return handleExtractDocumentInfo(
          args.document_path as string,
          args.claim_id as string,
          args.document_type as string | undefined
        )
      case 'save_extracted_info':
        return handleSaveExtractedInfo(
          args.claim_id as string,
          args.field_name as string,
          args.field_value as unknown,
          args.confidence as string | undefined,
          args.source as string | undefined
        )
      case 'prepare_claim_summary':
        return handlePrepareClaimSummary(args.session_id as string)
      case 'create_claim':
        return handleCreateClaim(args.session_id as string, args as {
          coverage_type_ids: string[]
          incident_description: string
          incident_date: string
          incident_location: string
          incident_type: string
          total_claimed_amount: number
          currency?: string
          policy_id?: string
        })
      case 'update_claim_stage':
        return handleUpdateClaimStage(args.session_id as string, args.stage as string)

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
      case 'add_admin_note':
        return handleAddAdminNote(
          args.claim_id as string,
          args.admin_id as string,
          args.content as string,
          args.note_type as string | undefined
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
