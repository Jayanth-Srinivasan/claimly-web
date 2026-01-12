import { SupabaseClient } from '@supabase/supabase-js'
import type { FlowState } from '../core/types'
import { StateManager } from '../core/state'
import { ClaimService } from '@/lib/services/claim-service'
import { QuestionService } from '@/lib/services/question-service'
import { DocumentService } from '@/lib/services/document-service'

/**
 * Stage 5: Finalization
 *
 * CRITICAL: This is the ONLY stage where claim records are created!
 * All validation has passed, all data collected - now create the claim.
 */
export class FinalizationStage {
  private supabase: SupabaseClient
  private stateManager: StateManager
  private claimService: ClaimService
  private questionService: QuestionService
  private documentService: DocumentService

  constructor(supabase: SupabaseClient, stateManager: StateManager) {
    this.supabase = supabase
    this.stateManager = stateManager
    this.claimService = new ClaimService(supabase)
    this.questionService = new QuestionService(supabase)
    this.documentService = new DocumentService(supabase)
  }

  /**
   * Run finalization stage - create claim and link all data
   */
  async* run(state: FlowState): AsyncGenerator<string> {
    yield 'Creating your claim...\n\n'

    // Validate state has required data
    if (!state.coverageTypeIds || state.coverageTypeIds.length === 0) {
      yield 'Error: Coverage types not set. Cannot create claim.'
      return
    }

    if (!state.incidentDescription) {
      yield 'Error: Incident description missing. Cannot create claim.'
      return
    }

    try {
      // Generate unique claim number
      const claimNumber = this.claimService.generateClaimNumber()

      // Gather all collected data
      const extractedData = state.extractedData || {}
      const incidentDate = extractedData.incident_date?.value ||
        extractedData.scheduled_departure_date?.value ||
        new Date().toISOString()
      const incidentLocation = extractedData.incident_location?.value ||
        extractedData.destination?.value ||
        'Not specified'
      const totalClaimedAmount = extractedData.total_claimed_amount?.value ||
        extractedData.ticket_cost?.value ||
        extractedData.claimed_amount?.value ||
        0

      // CREATE CLAIM RECORD (finally!)
      const claim = await this.claimService.createClaim({
        userId: state.userId,
        chatSessionId: state.sessionId,
        claimNumber,
        coverageTypeIds: state.coverageTypeIds,
        incidentDescription: state.incidentDescription,
        incidentDate,
        incidentLocation,
        incidentType: state.coverageTypeIds[0],
        totalClaimedAmount,
        currency: 'USD',
        status: 'submitted',
      })

      yield `✓ Claim created successfully!\n\n`
      yield `**Claim Number:** ${claimNumber}\n`
      yield `**Claim ID:** ${claim.id}\n\n`

      // Link chat session to claim
      await this.claimService.linkSessionToClaim(state.sessionId, claim.id)

      // Link all answers to claim
      yield 'Linking your answers...'
      await this.questionService.linkAnswersToClaim(state.sessionId, claim.id)
      yield ' ✓\n'

      // Link all documents to claim
      if (state.uploadedDocumentIds && state.uploadedDocumentIds.length > 0) {
        yield 'Linking your documents...'
        await this.documentService.linkDocumentsToClaim(state.uploadedDocumentIds, claim.id)
        yield ' ✓\n'
      }

      // Save all extracted information
      if (Object.keys(extractedData).length > 0) {
        yield 'Saving extracted information...'
        for (const [fieldName, fieldData] of Object.entries(extractedData)) {
          await this.claimService.saveExtractedInformation(
            claim.id,
            fieldName,
            fieldData.value,
            fieldData.confidence || 'high',
            fieldData.source || 'ai_inference'
          )
        }
        yield ' ✓\n'
      }

      yield '\n'

      // Mark state as completed
      await this.stateManager.markCompleted(state.sessionId, claim.id, claimNumber)

      yield '🎉 Your claim has been submitted for review!\n\n'
      yield `You can track its status in your dashboard. We'll notify you once it's been reviewed.\n\n`

      // Provide summary
      yield `**Summary:**\n`
      yield `- Coverage: ${state.coverageTypeIds.length} type(s)\n`
      yield `- Incident Date: ${new Date(incidentDate).toLocaleDateString()}\n`
      yield `- Location: ${incidentLocation}\n`
      if (totalClaimedAmount > 0) {
        yield `- Claimed Amount: $${totalClaimedAmount.toLocaleString()}\n`
      }
      if (state.uploadedDocumentIds && state.uploadedDocumentIds.length > 0) {
        yield `- Documents: ${state.uploadedDocumentIds.length} file(s)\n`
      }

      yield `\nThank you for using our claims system! 🙏`

    } catch (error: any) {
      yield `\n❌ Error creating claim: ${error.message}\n\n`
      yield 'Please try again or contact support for assistance.'
      console.error('Claim creation error:', error)
    }
  }
}
