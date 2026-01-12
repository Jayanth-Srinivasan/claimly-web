import { SupabaseClient } from '@supabase/supabase-js'
import { createOpenAI } from '@ai-sdk/openai'
import type { IntakeInput } from './types'
import { StateManager } from './state'
import { CategorizationStage } from '../stages/1-categorization'
import { QuestioningStage } from '../stages/2-questioning'
import { DocumentStage } from '../stages/3-documents'
import { ValidationStage } from '../stages/4-validation'
import { FinalizationStage } from '../stages/5-finalization'

/**
 * Main orchestrator for claim intake flow
 * Routes requests to appropriate stage and manages state transitions
 */
export class ClaimIntakeOrchestrator {
  private supabase: SupabaseClient
  private userId: string
  private stateManager: StateManager
  private model: any

  // Stages
  private categorizationStage: CategorizationStage
  private questioningStage: QuestioningStage
  private documentStage: DocumentStage
  private validationStage: ValidationStage
  private finalizationStage: FinalizationStage

  constructor(supabase: SupabaseClient, userId: string) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    this.supabase = supabase
    this.userId = userId
    this.stateManager = new StateManager(supabase)

    // Initialize AI model
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    this.model = openai('gpt-4o')

    // Initialize stages
    this.categorizationStage = new CategorizationStage(
      supabase,
      this.model,
      this.stateManager
    )
    this.questioningStage = new QuestioningStage(
      supabase,
      this.model,
      this.stateManager
    )
    this.documentStage = new DocumentStage(supabase, this.stateManager)
    this.validationStage = new ValidationStage(supabase, this.stateManager)
    this.finalizationStage = new FinalizationStage(supabase, this.stateManager)
  }

  /**
   * Main streaming entry point
   * Routes to appropriate stage based on current state
   */
  async* stream(input: IntakeInput): AsyncGenerator<string> {
    try {
      console.log('[Orchestrator] Starting stream for session:', input.sessionId)

      // Load or initialize state
      const state = await this.stateManager.loadOrInitialize(
        input.sessionId,
        this.userId
      )

      console.log('[Orchestrator] Current stage:', state.currentStage)

      // Handle completed state
      if (state.currentStage === 'completed') {
        yield 'Your claim has already been submitted!\n\n'
        yield `Claim Number: ${state.claimNumber}\n`
        yield `Claim ID: ${state.claimId}\n\n`
        yield 'You can track its status in your dashboard.'
        return
      }

      // Route to appropriate stage
      switch (state.currentStage) {
        case 'categorization':
          console.log('[Orchestrator] Running categorization stage')
          if (!input.message) {
            yield 'Please describe your incident to start the claim process.'
            return
          }
          yield* this.categorizationStage.run(state, input.message)
          // After categorization, continue to questioning
          const updatedState = await this.stateManager.load(input.sessionId)
          console.log('[Orchestrator] After categorization, stage is:', updatedState?.currentStage)
          if (updatedState && updatedState.currentStage === 'questioning') {
            console.log('[Orchestrator] Continuing to questioning stage')
            yield* this.questioningStage.run(updatedState, { ...input, message: undefined })
          }
          break

        case 'questioning':
          yield* this.questioningStage.run(state, input)
          break

        case 'documents':
          yield* this.documentStage.run(state, input)
          // After documents, if transitioned to validation, continue
          const docState = await this.stateManager.load(input.sessionId)
          if (docState && docState.currentStage === 'validation') {
            yield* this.validationStage.run(docState)
          }
          break

        case 'validation':
          yield* this.validationStage.run(state)
          // After validation, if transitioned to finalization, continue
          const valState = await this.stateManager.load(input.sessionId)
          if (valState && valState.currentStage === 'finalization') {
            yield* this.finalizationStage.run(valState)
          }
          break

        case 'finalization':
          yield* this.finalizationStage.run(state)
          break

        default:
          yield `Unknown stage: ${state.currentStage}. Please contact support.`
      }
    } catch (error: any) {
      console.error('Orchestrator error:', error)
      yield `\n\nError: ${error.message}\n\n`
      yield 'Please try again or contact support if the issue persists.'
    }
  }

  /**
   * Get current state for inspection
   */
  async getState(sessionId: string) {
    return await this.stateManager.load(sessionId)
  }

  /**
   * Reset state (useful for testing or retrying)
   */
  async resetState(sessionId: string) {
    await this.stateManager.reset(sessionId)
  }
}
