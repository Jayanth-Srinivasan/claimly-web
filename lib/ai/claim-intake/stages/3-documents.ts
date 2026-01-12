import { SupabaseClient } from '@supabase/supabase-js'
import type { FlowState, IntakeInput } from '../core/types'
import { StateManager } from '../core/state'
import { RuleEvaluator } from '@/lib/rules/evaluator'
import { DocumentService } from '@/lib/services/document-service'
import { QuestionService } from '@/lib/services/question-service'

/**
 * Stage 3: Documents
 *
 * Collects required documents and validates completeness.
 * Document parsing and OCR happens via existing upload flow.
 * Transitions to validation when all documents collected.
 */
export class DocumentStage {
  private supabase: SupabaseClient
  private stateManager: StateManager
  private ruleEvaluator: RuleEvaluator
  private documentService: DocumentService
  private questionService: QuestionService

  constructor(supabase: SupabaseClient, stateManager: StateManager) {
    this.supabase = supabase
    this.stateManager = stateManager
    this.ruleEvaluator = new RuleEvaluator(supabase)
    this.documentService = new DocumentService(supabase)
    this.questionService = new QuestionService(supabase)
  }

  /**
   * Run document collection stage
   */
  async* run(state: FlowState, input: IntakeInput): AsyncGenerator<string> {
    // Get required documents from rules
    const ruleResults = await this.evaluateRules(state)
    const requiredDocTypes = ruleResults.required_documents || []

    if (requiredDocTypes.length === 0) {
      // No documents required, skip to validation
      await this.stateManager.transition(state.sessionId, 'validation')
      yield 'No documents required for this claim. Proceeding to validation...\n\n'
      return
    }

    // Get uploaded documents
    const uploadedDocs = await this.documentService.getDocumentsBySessionId(state.sessionId)

    // Update state with document IDs
    const documentIds = uploadedDocs.map(d => d.id)
    await this.stateManager.update(state.sessionId, {
      uploadedDocumentIds: documentIds,
    })

    // If new document was uploaded, acknowledge it
    if (input.documentId) {
      const doc = uploadedDocs.find(d => d.id === input.documentId)
      if (doc) {
        yield `✓ Document received: ${doc.fileName}\n\n`

        // Extract data from OCR if available
        if (doc.ocrData) {
          yield 'Processing document...'
          await this.extractDataFromDocument(state, doc)
          yield ' ✓\n\n'
        }
      }
    }

    // Check which documents are still missing
    const docCheck = await this.documentService.checkRequiredDocuments(
      documentIds,
      requiredDocTypes
    )

    if (!docCheck.complete) {
      // Still need more documents
      yield 'I need the following documents to process your claim:\n\n'

      for (const type of docCheck.missingTypes) {
        yield `- ${this.formatDocumentType(type)}\n`
      }

      yield '\nPlease upload these documents using the paperclip icon. 📎'
      return
    }

    // All documents collected!
    yield '✓ All required documents received!\n\n'

    // Transition to validation
    await this.stateManager.transition(state.sessionId, 'validation')
    yield 'Proceeding to validation...\n\n'
  }

  /**
   * Evaluate rules to get required documents
   */
  private async evaluateRules(state: FlowState) {
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
   * Extract data from document OCR and save to state
   */
  private async extractDataFromDocument(state: FlowState, doc: any): Promise<void> {
    if (!doc.ocrData || !doc.ocrData.extracted_data) {
      return
    }

    const extractedData = state.extractedData || {}

    // Extract amounts
    if (doc.ocrData.extracted_data.amounts) {
      doc.ocrData.extracted_data.amounts.forEach((amount: any) => {
        const fieldName = `document_${amount.label?.toLowerCase().replace(/\s+/g, '_')}_amount`
        if (amount.value) {
          extractedData[fieldName] = {
            value: amount.value,
            confidence: 'high',
            source: 'document',
            extracted_at: new Date().toISOString(),
          }
        }
      })
    }

    // Extract dates
    if (doc.ocrData.extracted_data.dates) {
      doc.ocrData.extracted_data.dates.forEach((date: any) => {
        const fieldName = `document_${date.label?.toLowerCase().replace(/\s+/g, '_')}_date`
        if (date.value) {
          extractedData[fieldName] = {
            value: date.value,
            confidence: 'high',
            source: 'document',
            extracted_at: new Date().toISOString(),
          }
        }
      })
    }

    // Extract summary fields
    if (doc.ocrData.extracted_data.summary_fields) {
      Object.entries(doc.ocrData.extracted_data.summary_fields).forEach(([key, value]) => {
        if (value) {
          extractedData[key] = {
            value,
            confidence: 'high',
            source: 'document',
            extracted_at: new Date().toISOString(),
          }
        }
      })
    }

    // Save extracted data
    await this.stateManager.update(state.sessionId, {
      extractedData,
    })
  }

  /**
   * Format document type for display
   */
  private formatDocumentType(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}
