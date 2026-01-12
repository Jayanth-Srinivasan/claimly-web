import { SupabaseClient } from '@supabase/supabase-js'
import type { ClaimCreationData } from '@/lib/ai/claim-intake/core/types'

/**
 * Pure database operations for claims
 * Separates business logic from data access
 */
export class ClaimService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Create a new claim record
   * ONLY called from Stage 5 (finalization)
   */
  async createClaim(data: ClaimCreationData) {
    const { data: claim, error } = await this.supabase
      .from('claims')
      .insert({
        user_id: data.userId,
        chat_session_id: data.chatSessionId,
        claim_number: data.claimNumber,
        coverage_type_ids: data.coverageTypeIds,
        incident_description: data.incidentDescription,
        incident_date: data.incidentDate || new Date().toISOString(),
        incident_location: data.incidentLocation || 'Not specified',
        incident_type: data.incidentType || data.coverageTypeIds[0] || 'general',
        total_claimed_amount: data.totalClaimedAmount || 0,
        currency: data.currency || 'USD',
        status: data.status || 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create claim: ${error.message}`)
    }

    return claim
  }

  /**
   * Get claim by ID
   */
  async getClaimById(claimId: string) {
    const { data, error } = await this.supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single()

    if (error) {
      throw new Error(`Failed to get claim: ${error.message}`)
    }

    return data
  }

  /**
   * Get claim by session ID
   */
  async getClaimBySessionId(sessionId: string) {
    const { data, error } = await this.supabase
      .from('claims')
      .select('*')
      .eq('chat_session_id', sessionId)
      .single()

    if (error) {
      return null
    }

    return data
  }

  /**
   * Update claim fields
   */
  async updateClaim(claimId: string, updates: Record<string, any>) {
    const { data, error } = await this.supabase
      .from('claims')
      .update(updates)
      .eq('id', claimId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update claim: ${error.message}`)
    }

    return data
  }

  /**
   * Link chat session to claim
   */
  async linkSessionToClaim(sessionId: string, claimId: string) {
    const { error } = await this.supabase
      .from('chat_sessions')
      .update({ claim_id: claimId })
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to link session to claim: ${error.message}`)
    }
  }

  /**
   * Save extracted information to claim
   */
  async saveExtractedInformation(
    claimId: string,
    fieldName: string,
    fieldValue: any,
    confidence: 'high' | 'medium' | 'low',
    source: 'user_message' | 'database_question' | 'ai_inference' | 'document'
  ) {
    const { error } = await this.supabase
      .from('claim_extracted_information')
      .insert({
        claim_id: claimId,
        field_name: fieldName,
        field_value: fieldValue,
        confidence,
        source,
        extracted_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(`Failed to save extracted information: ${error.message}`)
    }
  }

  /**
   * Bulk save extracted information
   */
  async bulkSaveExtractedInformation(
    claimId: string,
    extractedData: Record<string, any>,
    source: 'user_message' | 'database_question' | 'ai_inference' | 'document'
  ) {
    const records = Object.entries(extractedData).map(([fieldName, fieldValue]) => ({
      claim_id: claimId,
      field_name: fieldName,
      field_value: fieldValue,
      confidence: 'high' as const,
      source,
      extracted_at: new Date().toISOString(),
    }))

    if (records.length === 0) return

    const { error } = await this.supabase
      .from('claim_extracted_information')
      .insert(records)

    if (error) {
      throw new Error(`Failed to bulk save extracted information: ${error.message}`)
    }
  }

  /**
   * Get all extracted information for a claim
   */
  async getExtractedInformation(claimId: string) {
    const { data, error } = await this.supabase
      .from('claim_extracted_information')
      .select('*')
      .eq('claim_id', claimId)

    if (error) {
      throw new Error(`Failed to get extracted information: ${error.message}`)
    }

    return data || []
  }

  /**
   * Generate unique claim number
   */
  generateClaimNumber(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CLM-${timestamp}-${random}`
  }

  /**
   * Get user's active policies with coverage types
   */
  async getUserPoliciesWithCoverage(userId: string) {
    console.log('[ClaimService] Getting policies for user:', userId)
    const { data, error } = await this.supabase
      .from('user_policies')
      .select(`
        *,
        policy:policies(
          *,
          policy_coverage_types(
            coverage_type:coverage_types(*)
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    console.log('[ClaimService] Query result - error:', error)
    console.log('[ClaimService] Query result - data count:', data?.length)
    console.log('[ClaimService] Query result - data:', JSON.stringify(data, null, 2))

    if (error) {
      throw new Error(`Failed to get user policies: ${error.message}`)
    }

    return data || []
  }

  /**
   * Check policy limits for a claim
   */
  async checkPolicyLimits(userId: string, coverageTypeIds: string[], claimedAmount: number) {
    // Get user's policies with the specified coverage types
    const userPolicies = await this.getUserPoliciesWithCoverage(userId)

    // Find relevant policy coverage
    let policyLimit = 0
    let deductible = 0

    for (const userPolicy of userPolicies) {
      const policyCoverageTypes = userPolicy.policy?.policy_coverage_types || []

      for (const pct of policyCoverageTypes) {
        if (coverageTypeIds.includes(pct.coverage_type?.id)) {
          policyLimit = Math.max(policyLimit, pct.coverage_limit || 0)
          deductible = Math.max(deductible, pct.deductible || 0)
        }
      }
    }

    // Get existing claims for this user and coverage types
    const { data: existingClaims } = await this.supabase
      .from('claims')
      .select('total_claimed_amount')
      .eq('user_id', userId)
      .overlaps('coverage_type_ids', coverageTypeIds)
      .in('status', ['approved', 'paid'])

    const totalPreviousClaims = existingClaims?.reduce(
      (sum, claim) => sum + (claim.total_claimed_amount || 0),
      0
    ) || 0

    const remainingLimit = policyLimit - totalPreviousClaims
    const valid = claimedAmount <= remainingLimit

    return {
      valid,
      totalClaimedAmount: claimedAmount,
      policyLimit,
      remainingLimit,
      deductible,
      message: valid
        ? `Claim amount $${claimedAmount} is within policy limit.`
        : `Claim amount $${claimedAmount} exceeds remaining limit of $${remainingLimit}.`,
    }
  }
}
