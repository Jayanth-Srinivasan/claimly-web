import { SupabaseClient } from '@supabase/supabase-js'
import { LanguageModel, generateObject } from 'ai'
import { z } from 'zod'
import type { FlowState, IntakeInput } from '../core/types'
import { StateManager } from '../core/state'
import { QuestionService } from '@/lib/services/question-service'
import { RuleEvaluator } from '@/lib/rules/evaluator'
import { QuestioningAgent } from '../agents/questioning-agent'

/**
 * Stage 2: Questioning
 *
 * Priority order:
 * 1. Database questions (excluding hidden by rules)
 * 2. Check if documents needed → transition to documents stage
 * 3. Adaptive AI questions for missing fields
 * 4. When complete → transition to validation or documents
 */
export class QuestioningStage {
  private supabase: SupabaseClient
  private model: LanguageModel
  private stateManager: StateManager
  private questionService: QuestionService
  private ruleEvaluator: RuleEvaluator
  private questioningAgent: QuestioningAgent

  constructor(
    supabase: SupabaseClient,
    model: LanguageModel,
    stateManager: StateManager
  ) {
    this.supabase = supabase
    this.model = model
    this.stateManager = stateManager
    this.questionService = new QuestionService(supabase)
    this.ruleEvaluator = new RuleEvaluator(supabase)
    this.questioningAgent = new QuestioningAgent(model, supabase)
  }

  /**
   * Run questioning stage
   */
  async* run(state: FlowState, input: IntakeInput): AsyncGenerator<string> {
    console.log('[Questioning] Starting questioning stage')
    console.log('[Questioning] Input:', { hasMessage: !!input.message, questionId: input.questionId })

    if (!state.coverageTypeIds || state.coverageTypeIds.length === 0) {
      yield 'Error: Coverage types not set. Please restart claim intake.'
      return
    }

    // Extract information from user message if provided
    if (input.message) {
      console.log('[Questioning] Extracting information from message')
      yield* this.extractAndAcknowledge(state, input.message)
    }

    // Save database question answer if provided
    if (input.questionId && input.answerValue !== undefined) {
      await this.saveAnswer(state, input.questionId, input.answerValue)
      yield `Got it, thank you!\n\n`
    }

    // Evaluate rules after new information
    const ruleResults = await this.evaluateRules(state)

    // Check if user is ineligible
    if (ruleResults.eligibility_status === 'ineligible') {
      yield `Unfortunately, based on the information provided, this claim does not meet the eligibility requirements.\n\n`
      yield ruleResults.validation_errors[0]?.message || 'Please contact support for more information.'
      return
    }

    // PRIORITY 1: Database questions (excluding hidden by rules)
    const nextDbQuestion = await this.getNextDatabaseQuestion(state, ruleResults.hidden_questions || [])

    if (nextDbQuestion) {
      yield `**${nextDbQuestion.questionText}**\n\n`
      if (nextDbQuestion.helpText) {
        yield `_${nextDbQuestion.helpText}_\n\n`
      }
      return
    }

    // All database questions answered!
    // PRIORITY 2: Check if documents are required
    if (ruleResults.required_documents && ruleResults.required_documents.length > 0) {
      yield 'Great! Now I need some documents to continue processing your claim.\n\n'
      await this.stateManager.transition(state.sessionId, 'documents')
      return
    }

    // PRIORITY 3: Adaptive questions for missing fields
    const { COVERAGE_REQUIREMENTS } = await import('@/lib/ai/prompts')
    const missingFields = this.getMissingRequiredFields(state, COVERAGE_REQUIREMENTS)

    if (missingFields.length > 0) {
      // Use adaptive questioning agent
      const conversationHistory = this.buildConversationHistory(state, input)
      yield* this.questioningAgent.generateNextQuestion(state, conversationHistory)
      return
    }

    // All information collected!
    // Transition to validation or documents (if documents weren't required earlier but are needed)
    if (ruleResults.required_documents && ruleResults.required_documents.length > 0) {
      await this.stateManager.transition(state.sessionId, 'documents')
      yield 'Perfect! Now I need some documents from you.\n\n'
    } else {
      await this.stateManager.transition(state.sessionId, 'validation')
      yield 'Thank you for providing all the information. Let me validate your claim details...\n\n'
    }
  }

  /**
   * Extract information from user message and acknowledge
   */
  private async* extractAndAcknowledge(state: FlowState, message: string): AsyncGenerator<string> {
    // Use generateObject to extract structured data
    const { COVERAGE_REQUIREMENTS } = await import('@/lib/ai/prompts')

    // Build schema from coverage requirements
    const schemaFields: Record<string, any> = {}
    state.coverageTypeIds?.forEach(ctId => {
      const requirements = COVERAGE_REQUIREMENTS[ctId]
      if (requirements) {
        requirements.required_fields.forEach(field => {
          if (!schemaFields[field.field]) {
            let zodType
            switch (field.type) {
              case 'number':
                zodType = z.number().optional()
                break
              case 'date':
                zodType = z.string().optional()
                break
              case 'boolean':
                zodType = z.boolean().optional()
                break
              default:
                zodType = z.string().optional()
            }
            schemaFields[field.field] = zodType
          }
        })
      }
    })

    if (Object.keys(schemaFields).length === 0) {
      return
    }

    try {
      const { object } = await generateObject({
        model: this.model,
        mode: 'json',
        schema: z.object(schemaFields),
        messages: [
          {
            role: 'system',
            content: 'Extract any relevant claim information from the user message. Only extract information that is explicitly stated.',
          },
          { role: 'user', content: message },
        ],
      })

      // Save extracted data
      const extracted = Object.entries(object).filter(([_, value]) => value !== undefined && value !== null)

      if (extracted.length > 0) {
        const currentExtractedData = state.extractedData || {}
        extracted.forEach(([key, value]) => {
          currentExtractedData[key] = {
            value,
            confidence: 'high',
            source: 'user_message',
            extracted_at: new Date().toISOString(),
          }
        })

        await this.stateManager.update(state.sessionId, {
          extractedData: currentExtractedData,
        })
      }
    } catch (error) {
      // Extraction failed, continue without it
      console.error('Failed to extract information:', error)
    }
  }

  /**
   * Save answer to database question
   */
  private async saveAnswer(state: FlowState, questionId: string, answerValue: any): Promise<void> {
    await this.questionService.saveAnswer(state.sessionId, questionId, answerValue)

    // Update database_questions_asked
    const askedQuestions = state.databaseQuestionsAsked || []
    if (!askedQuestions.includes(questionId)) {
      askedQuestions.push(questionId)
      await this.stateManager.update(state.sessionId, {
        databaseQuestionsAsked: askedQuestions,
      })
    }
  }

  /**
   * Evaluate rules engine
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
   * Get next database question (excluding hidden)
   */
  private async getNextDatabaseQuestion(state: FlowState, hiddenQuestionIds: string[]) {
    const askedQuestionIds = state.databaseQuestionsAsked || []

    return await this.questionService.getNextQuestion(
      state.coverageTypeIds!,
      askedQuestionIds,
      hiddenQuestionIds
    )
  }

  /**
   * Get missing required fields
   */
  private getMissingRequiredFields(state: FlowState, COVERAGE_REQUIREMENTS: any): string[] {
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
   * Build conversation history for agent
   */
  private buildConversationHistory(
    state: FlowState,
    input: IntakeInput
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Add incident description
    if (state.incidentDescription) {
      history.push({
        role: 'user',
        content: state.incidentDescription,
      })
    }

    // Add current message
    if (input.message) {
      history.push({
        role: 'user',
        content: input.message,
      })
    }

    return history
  }
}
