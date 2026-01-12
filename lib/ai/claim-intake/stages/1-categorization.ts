import { SupabaseClient } from '@supabase/supabase-js'
import { LanguageModel, generateObject } from 'ai'
import { z } from 'zod'
import type { FlowState, CategorizationResult, CoverageTypeInfo } from '../core/types'
import { StateManager } from '../core/state'
import { ClaimService } from '@/lib/services/claim-service'

/**
 * Stage 1: Coverage Categorization
 *
 * Analyzes incident description and categorizes into appropriate coverage types.
 * DOES NOT create claim - only categorizes and transitions to questioning stage.
 */
export class CategorizationStage {
  private supabase: SupabaseClient
  private model: LanguageModel
  private stateManager: StateManager
  private claimService: ClaimService

  constructor(
    supabase: SupabaseClient,
    model: LanguageModel,
    stateManager: StateManager
  ) {
    this.supabase = supabase
    this.model = model
    this.stateManager = stateManager
    this.claimService = new ClaimService(supabase)
  }

  /**
   * Run categorization stage
   */
  async* run(
    state: FlowState,
    incidentDescription: string
  ): AsyncGenerator<string> {
    console.log('[Categorization] Starting categorization for user:', state.userId)
    yield 'Analyzing your incident...\n\n'

    // Get user's available coverage types from their active policies
    const availableCoverageTypes = await this.getAvailableCoverageTypes(state.userId)
    console.log('[Categorization] Found coverage types:', availableCoverageTypes.length)

    if (availableCoverageTypes.length === 0) {
      yield 'You do not have any active policies. Please contact support to set up a policy before filing a claim.'
      return
    }

    // Use AI to categorize incident
    console.log('[Categorization] Calling AI to categorize incident')
    const categorization = await this.categorizeIncident(
      incidentDescription,
      availableCoverageTypes
    )
    console.log('[Categorization] AI categorization complete:', categorization.coverageTypeIds)

    if (!categorization.coverageTypeIds || categorization.coverageTypeIds.length === 0) {
      yield "I couldn't find a matching coverage type for your incident. Please contact support for assistance."
      return
    }

    // Get coverage type names for friendly response
    const coverageTypeNames = availableCoverageTypes
      .filter(ct => categorization.coverageTypeIds.includes(ct.id))
      .map(ct => ct.name)
      .join(' and ')

    yield `I understand you're filing a claim for **${coverageTypeNames}**.\n\n`

    if (categorization.reasoning) {
      yield `_${categorization.reasoning}_\n\n`
    }

    // Update state (NO CLAIM CREATION!)
    await this.stateManager.update(state.sessionId, {
      coverageTypeIds: categorization.coverageTypeIds,
      incidentDescription,
      categorizationConfidence: categorization.confidence,
      categorizationReasoning: categorization.reasoning,
    })

    // Transition to questioning stage
    await this.stateManager.transition(state.sessionId, 'questioning')

    yield 'Let me ask you a few questions to process your claim...\n\n'
  }

  /**
   * Categorize incident using AI
   */
  private async categorizeIncident(
    description: string,
    availableCoverageTypes: CoverageTypeInfo[]
  ): Promise<CategorizationResult> {
    const coverageTypesContext = availableCoverageTypes
      .map(ct => `- ID: ${ct.id}, Name: ${ct.name}, Description: ${ct.description || 'N/A'}`)
      .join('\n')

    const systemPrompt = `You are an insurance claims specialist. Analyze the incident description and determine which coverage type(s) apply.

Available coverage types:
${coverageTypesContext}

Return the matching coverage type ID(s), your reasoning, confidence level, and any extracted details.`

    const categorizationSchema = z.object({
      coverage_type_ids: z.array(z.string()).min(1).describe('Array of coverage type IDs that match this incident'),
      confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level in the categorization'),
      reasoning: z.string().describe('Brief explanation of why these coverage types were selected'),
      extracted_details: z.object({
        incident_date: z.string().optional().describe('Date of incident if mentioned (ISO format)'),
        incident_location: z.string().optional().describe('Location of incident if mentioned'),
        incident_type: z.string().optional().describe('Type or category of incident'),
        estimated_amount: z.number().optional().describe('Estimated claim amount if mentioned'),
      }).optional(),
    })

    const result = await generateObject({
      model: this.model,
      mode: 'json',
      schema: categorizationSchema,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: description },
      ],
    })

    const object = result.object as z.infer<typeof categorizationSchema>

    return {
      coverageTypeIds: object.coverage_type_ids,
      confidence: object.confidence,
      reasoning: object.reasoning,
      extractedDetails: object.extracted_details ? {
        incidentDate: object.extracted_details.incident_date,
        incidentLocation: object.extracted_details.incident_location,
        incidentType: object.extracted_details.incident_type,
        estimatedAmount: object.extracted_details.estimated_amount,
      } : undefined,
    }
  }

  /**
   * Get user's available coverage types from active policies
   */
  private async getAvailableCoverageTypes(userId: string): Promise<CoverageTypeInfo[]> {
    console.log('[Categorization] Fetching policies for user:', userId)
    const userPolicies = await this.claimService.getUserPoliciesWithCoverage(userId)
    console.log('[Categorization] User policies count:', userPolicies.length)

    const coverageTypeMap = new Map<string, CoverageTypeInfo>()

    userPolicies.forEach((userPolicy) => {
      console.log('[Categorization] Processing policy:', userPolicy.policy?.name)
      const policyCoverageTypes = userPolicy.policy?.policy_coverage_types || []
      console.log('[Categorization] Policy coverage types count:', policyCoverageTypes.length)

      // Handle junction table schema (policy_coverage_types)
      if (policyCoverageTypes.length > 0) {
        policyCoverageTypes.forEach((pct: any) => {
          if (pct.coverage_type && !coverageTypeMap.has(pct.coverage_type.id)) {
            coverageTypeMap.set(pct.coverage_type.id, {
              id: pct.coverage_type.id,
              name: pct.coverage_type.name,
              description: pct.coverage_type.description,
              category: pct.coverage_type.category,
            })
          }
        })
      }

      // Handle JSONB coverage_items schema (fallback)
      const coverageItems = userPolicy.policy?.coverage_items || userPolicy.coverage_items || []
      console.log('[Categorization] Coverage items count:', coverageItems.length)

      if (coverageItems.length > 0) {
        coverageItems.forEach((item: any) => {
          const itemName = item.name
          // Generate a slug-style ID from the name
          const slugId = itemName.toLowerCase().replace(/\s+/g, '_')

          if (!coverageTypeMap.has(slugId)) {
            coverageTypeMap.set(slugId, {
              id: slugId,
              name: itemName,
              description: `Coverage for ${itemName.toLowerCase()}`,
              category: 'travel',
            })
          }
        })
      }
    })

    const result = Array.from(coverageTypeMap.values())
    console.log('[Categorization] Final coverage types:', result)
    return result
  }
}
