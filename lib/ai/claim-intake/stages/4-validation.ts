import { SupabaseClient } from '@supabase/supabase-js'
import type { FlowState, ValidationError } from '../core/types'
import { StateManager } from '../core/state'
import { RuleEvaluator } from '@/lib/rules/evaluator'
import { QuestionService } from '@/lib/services/question-service'
import { DocumentService } from '@/lib/services/document-service'
import { ClaimService } from '@/lib/services/claim-service'

/**
 * Stage 4: Validation
 *
 * Comprehensive validation before claim creation:
 * - Rules engine validation
 * - Policy limits check
 * - Required fields completeness
 * - Document completeness
 *
 * Can redirect back to questioning or documents if issues found.
 */
export class ValidationStage {
  private supabase: SupabaseClient
  private stateManager: StateManager
  private ruleEvaluator: RuleEvaluator
  private questionService: QuestionService
  private documentService: DocumentService
  private claimService: ClaimService

  constructor(supabase: SupabaseClient, stateManager: StateManager) {
    this.supabase = supabase
    this.stateManager = stateManager
    this.ruleEvaluator = new RuleEvaluator(supabase)
    this.questionService = new QuestionService(supabase)
    this.documentService = new DocumentService(supabase)
    this.claimService = new ClaimService(supabase)
  }

  /**
   * Run validation stage
   */
  async* run(state: FlowState): AsyncGenerator<string> {
    yield 'Validating your claim information...\n\n'

    const errors: ValidationError[] = []

    // 1. Rules engine validation
    yield '→ Checking eligibility rules...'
    const ruleResults = await this.validateRules(state)

    if (ruleResults.eligibility_status === 'ineligible') {
      errors.push({
        field: 'eligibility',
        message: ruleResults.validation_errors[0]?.message || 'Claim does not meet eligibility requirements',
        code: 'INELIGIBLE',
        severity: 'error',
      })
      yield ' ❌\n\n'
      yield `**Eligibility Issue:** ${errors[0].message}\n\n`
      yield 'Please review your answers and try again.'

      // Go back to questioning to fix
      await this.stateManager.transition(state.sessionId, 'questioning')
      return
    }
    yield ' ✓\n'

    // 2. Required fields validation
    yield '→ Checking required information...'
    const missingFields = await this.checkRequiredFields(state)

    if (missingFields.length > 0) {
      errors.push({
        message: `Missing required information: ${missingFields.join(', ')}`,
        code: 'MISSING_FIELDS',
        severity: 'error',
      })
      yield ' ❌\n\n'
      yield `**Missing Information:**\n`
      for (const field of missingFields) {
        yield `- ${field}\n`
      }
      yield '\n'

      // Go back to questioning to collect missing fields
      await this.stateManager.transition(state.sessionId, 'questioning')
      yield 'Let me ask you a few more questions to complete your claim...'
      return
    }
    yield ' ✓\n'

    // 3. Document completeness validation
    if (ruleResults.required_documents && ruleResults.required_documents.length > 0) {
      yield '→ Checking required documents...'
      const docCheck = await this.validateDocuments(state, ruleResults.required_documents)

      if (!docCheck.complete) {
        errors.push({
          message: `Missing required documents: ${docCheck.missingTypes.join(', ')}`,
          code: 'MISSING_DOCUMENTS',
          severity: 'error',
        })
        yield ' ❌\n\n'
        yield `**Missing Documents:**\n`
        for (const type of docCheck.missingTypes) {
          yield `- ${type}\n`
        }
        yield '\n'

        // Go back to documents stage
        await this.stateManager.transition(state.sessionId, 'documents')
        yield 'Please upload the required documents to continue.'
        return
      }
      yield ' ✓\n'
    }

    // 4. Policy limits validation
    yield '→ Checking policy limits...'
    const limitsCheck = await this.validatePolicyLimits(state)

    if (!limitsCheck.valid) {
      yield ' ⚠️\n\n'
      yield `**Policy Limit Warning:** ${limitsCheck.message}\n\n`
      yield 'Your claim exceeds the remaining policy limit, but we will process it for review.\n\n'
    } else {
      yield ' ✓\n'
    }

    // All validations passed!
    yield '\n✅ All validations passed!\n\n'

    // Save validation results to state
    await this.stateManager.update(state.sessionId, {
      validationResults: ruleResults,
      validationPassed: true,
      validationErrors: errors,
      policyLimitCheck: limitsCheck,
    })

    // Transition to finalization
    await this.stateManager.transition(state.sessionId, 'finalization')

    yield 'Ready to create your claim...\n\n'
  }

  /**
   * Validate rules engine
   */
  private async validateRules(state: FlowState) {
    const answers = await this.questionService.getAnswersBySessionId(state.sessionId)

    return await this.ruleEvaluator.evaluate({
      coverage_type_ids: state.coverageTypeIds!,
      answers: answers.map(a => ({
        question_id: a.questionId,
        answer_value: a.answerValue,
      })),
    })
  }

  /**
   * Check required fields completeness
   */
  private async checkRequiredFields(state: FlowState): Promise<string[]> {
    const { COVERAGE_REQUIREMENTS } = await import('@/lib/ai/prompts')

    const extractedData = state.extractedData || {}
    const allRequiredFields: string[] = []

    state.coverageTypeIds?.forEach(ctId => {
      const requirements = COVERAGE_REQUIREMENTS[ctId]
      if (requirements) {
        requirements.required_fields
          .filter((f: any) => f.required)
          .forEach((f: any) => {
            if (!allRequiredFields.includes(f.field)) {
              allRequiredFields.push(f.field)
            }
          })
      }
    })

    return allRequiredFields.filter(
      field => !extractedData[field] || !extractedData[field].value
    )
  }

  /**
   * Validate document completeness
   */
  private async validateDocuments(
    state: FlowState,
    requiredDocTypes: string[]
  ): Promise<{ complete: boolean; missingTypes: string[] }> {
    const documentIds = state.uploadedDocumentIds || []

    if (documentIds.length === 0) {
      return { complete: false, missingTypes: requiredDocTypes }
    }

    return await this.documentService.checkRequiredDocuments(
      documentIds,
      requiredDocTypes
    )
  }

  /**
   * Validate policy limits
   */
  private async validatePolicyLimits(state: FlowState) {
    const extractedData = state.extractedData || {}
    const claimedAmount =
      extractedData.total_claimed_amount?.value ||
      extractedData.ticket_cost?.value ||
      extractedData.claimed_amount?.value ||
      0

    return await this.claimService.checkPolicyLimits(
      state.userId,
      state.coverageTypeIds!,
      claimedAmount
    )
  }
}
