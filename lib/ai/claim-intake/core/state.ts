import { SupabaseClient } from '@supabase/supabase-js'
import type {
  FlowState,
  FlowStage,
} from './types'

const VALID_TRANSITIONS_MAP: Record<FlowStage, FlowStage[]> = {
  categorization: ['questioning'],
  questioning: ['documents', 'validation'],
  documents: ['validation'],
  validation: ['finalization', 'questioning', 'documents'],
  finalization: ['completed'],
  completed: [],
}

/**
 * Manages flow state persistence and transitions
 */
export class StateManager {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Load existing state or initialize new state
   */
  async loadOrInitialize(sessionId: string, userId: string): Promise<FlowState> {
    const existing = await this.load(sessionId)
    if (existing) {
      return existing
    }

    return this.initialize(sessionId, userId)
  }

  /**
   * Load existing state from database
   */
  async load(sessionId: string): Promise<FlowState | null> {
    const { data, error } = await this.supabase
      .from('claim_intake_state')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error || !data) {
      return null
    }

    return this.dbRowToState(data)
  }

  /**
   * Initialize new state
   */
  async initialize(sessionId: string, userId: string): Promise<FlowState> {
    const state: FlowState = {
      sessionId,
      userId,
      currentStage: 'categorization',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('claim_intake_state')
      .insert({
        session_id: sessionId,
        user_id: userId,
        current_stage: 'categorization',
        questioning_state: {},
        extracted_data: {},
        database_questions_asked: [],
        uploaded_document_ids: [],
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to initialize state: ${error.message}`)
    }

    return { ...state, id: data.id }
  }

  /**
   * Save state to database
   */
  async save(state: FlowState): Promise<void> {
    const dbRow = this.stateToDbRow(state)

    const { error } = await this.supabase
      .from('claim_intake_state')
      .update(dbRow)
      .eq('session_id', state.sessionId)

    if (error) {
      throw new Error(`Failed to save state: ${error.message}`)
    }
  }

  /**
   * Update specific fields without replacing entire state
   */
  async update(
    sessionId: string,
    updates: Partial<Omit<FlowState, 'sessionId' | 'userId' | 'id'>>
  ): Promise<void> {
    const dbUpdates: Record<string, any> = {}

    if (updates.currentStage) dbUpdates.current_stage = updates.currentStage
    if (updates.coverageTypeIds) dbUpdates.coverage_type_ids = updates.coverageTypeIds
    if (updates.incidentDescription) dbUpdates.incident_description = updates.incidentDescription
    if (updates.categorizationConfidence) dbUpdates.categorization_confidence = updates.categorizationConfidence
    if (updates.questioningState) dbUpdates.questioning_state = updates.questioningState
    if (updates.databaseQuestionsAsked) dbUpdates.database_questions_asked = updates.databaseQuestionsAsked
    if (updates.uploadedDocumentIds) dbUpdates.uploaded_document_ids = updates.uploadedDocumentIds
    if (updates.extractedData) dbUpdates.extracted_data = updates.extractedData
    if (updates.validationResults) dbUpdates.validation_results = updates.validationResults
    if (updates.validationPassed !== undefined) dbUpdates.validation_passed = updates.validationPassed
    if (updates.validationErrors) dbUpdates.validation_errors = updates.validationErrors
    if (updates.claimId) dbUpdates.claim_id = updates.claimId
    if (updates.claimNumber) dbUpdates.claim_number = updates.claimNumber

    const { error } = await this.supabase
      .from('claim_intake_state')
      .update(dbUpdates)
      .eq('session_id', sessionId)

    if (error) {
      throw new Error(`Failed to update state: ${error.message}`)
    }
  }

  /**
   * Transition to a new stage with validation
   */
  async transition(sessionId: string, toStage: FlowStage): Promise<void> {
    const state = await this.load(sessionId)
    if (!state) {
      throw new Error(`State not found for session ${sessionId}`)
    }

    if (!this.canTransition(state.currentStage, toStage)) {
      throw new InvalidStageTransitionError(state.currentStage, toStage)
    }

    await this.update(sessionId, { currentStage: toStage })
  }

  /**
   * Check if transition is valid
   */
  canTransition(from: FlowStage, to: FlowStage): boolean {
    const validNextStages = VALID_TRANSITIONS_MAP[from] || []
    return validNextStages.includes(to)
  }

  /**
   * Get valid next stages from current stage
   */
  getValidNextStages(currentStage: FlowStage): FlowStage[] {
    return VALID_TRANSITIONS_MAP[currentStage] || []
  }

  /**
   * Mark state as completed
   */
  async markCompleted(sessionId: string, claimId: string, claimNumber: string): Promise<void> {
    await this.update(sessionId, {
      currentStage: 'completed',
      claimId,
      claimNumber,
      completedAt: new Date().toISOString(),
    })
  }

  /**
   * Reset state to beginning (useful for testing or retrying)
   */
  async reset(sessionId: string): Promise<void> {
    await this.update(sessionId, {
      currentStage: 'categorization',
      coverageTypeIds: undefined,
      incidentDescription: undefined,
      questioningState: undefined,
      databaseQuestionsAsked: [],
      uploadedDocumentIds: [],
      extractedData: {},
      validationResults: undefined,
      validationPassed: undefined,
      validationErrors: undefined,
      claimId: undefined,
      claimNumber: undefined,
    })
  }

  /**
   * Delete state (cleanup)
   */
  async delete(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('claim_intake_state')
      .delete()
      .eq('session_id', sessionId)

    if (error) {
      throw new Error(`Failed to delete state: ${error.message}`)
    }
  }

  /**
   * Convert database row to FlowState
   */
  private dbRowToState(row: any): FlowState {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      currentStage: row.current_stage,
      coverageTypeIds: row.coverage_type_ids || undefined,
      incidentDescription: row.incident_description || undefined,
      categorizationConfidence: row.categorization_confidence || undefined,
      questioningState: row.questioning_state || undefined,
      databaseQuestionsAsked: row.database_questions_asked || [],
      uploadedDocumentIds: row.uploaded_document_ids || [],
      extractedData: row.extracted_data || {},
      validationResults: row.validation_results || undefined,
      validationPassed: row.validation_passed || undefined,
      validationErrors: row.validation_errors || undefined,
      claimId: row.claim_id || undefined,
      claimNumber: row.claim_number || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
    }
  }

  /**
   * Convert FlowState to database row
   */
  private stateToDbRow(state: FlowState): Record<string, any> {
    return {
      session_id: state.sessionId,
      user_id: state.userId,
      current_stage: state.currentStage,
      coverage_type_ids: state.coverageTypeIds || null,
      incident_description: state.incidentDescription || null,
      categorization_confidence: state.categorizationConfidence || null,
      questioning_state: state.questioningState || {},
      database_questions_asked: state.databaseQuestionsAsked || [],
      uploaded_document_ids: state.uploadedDocumentIds || [],
      extracted_data: state.extractedData || {},
      validation_results: state.validationResults || null,
      validation_passed: state.validationPassed || null,
      validation_errors: state.validationErrors || null,
      claim_id: state.claimId || null,
      claim_number: state.claimNumber || null,
    }
  }
}

/**
 * Custom error class for invalid stage transitions
 */
class InvalidStageTransitionError extends Error {
  constructor(from: FlowStage, to: FlowStage) {
    super(`Invalid stage transition from '${from}' to '${to}'`)
    this.name = 'InvalidStageTransitionError'
  }
}
