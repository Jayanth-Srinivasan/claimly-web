import type { RuleEvaluationResult } from '@/types/rules'
import type { QuestioningState } from '@/types/adaptive-questions'

/**
 * Flow stages for claim intake
 */
export type FlowStage =
  | 'categorization'
  | 'questioning'
  | 'documents'
  | 'validation'
  | 'finalization'
  | 'completed'

/**
 * Confidence levels for AI operations
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * Complete flow state persisted across all stages
 */
export interface FlowState {
  id?: string
  sessionId: string
  userId: string
  currentStage: FlowStage

  // Stage 1: Categorization
  coverageTypeIds?: string[]
  incidentDescription?: string
  categorizationConfidence?: ConfidenceLevel
  categorizationReasoning?: string

  // Stage 2: Questioning
  questioningState?: QuestioningState
  databaseQuestionsAsked?: string[]
  answersCollected?: Record<string, any>

  // Stage 3: Documents
  uploadedDocumentIds?: string[]
  extractedData?: Record<string, any>
  documentValidationIssues?: DocumentValidationIssue[]

  // Stage 4: Validation
  validationResults?: any
  validationPassed?: boolean
  validationErrors?: ValidationError[]
  policyLimitCheck?: PolicyLimitCheckResult

  // Stage 5: Finalization
  claimId?: string
  claimNumber?: string

  // Metadata
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

/**
 * Input for stream operations
 */
export interface IntakeInput {
  sessionId: string
  message?: string
  questionId?: string
  answerValue?: any
  documentId?: string
  questioningState?: Partial<QuestioningState>
}

/**
 * Categorization result from Stage 1
 */
export interface CategorizationResult {
  coverageTypeIds: string[]
  confidence: ConfidenceLevel
  reasoning: string
  extractedDetails?: {
    incidentDate?: string
    incidentLocation?: string
    incidentType?: string
    estimatedAmount?: number
  }
}

/**
 * Document validation issue from Stage 3
 */
export interface DocumentValidationIssue {
  documentId: string
  issueType: 'missing' | 'mismatch' | 'fraud_risk' | 'low_quality' | 'incomplete'
  message: string
  severity: 'error' | 'warning'
  requiresReupload: boolean
}

/**
 * Validation error from Stage 4
 */
export interface ValidationError {
  field?: string
  message: string
  code: string
  severity: 'error' | 'warning'
}

/**
 * Policy limit check result
 */
export interface PolicyLimitCheckResult {
  valid: boolean
  totalClaimedAmount: number
  policyLimit: number
  remainingLimit: number
  deductible: number
  message?: string
}

/**
 * Extracted information from documents or conversations
 */
export interface ExtractedInformation {
  fieldName: string
  fieldValue: any
  confidence: ConfidenceLevel
  source: 'user_message' | 'database_question' | 'ai_inference' | 'document'
  extractedAt: string
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  id: string
  fileName: string
  filePath: string
  fileType: string
  documentType?: string
  uploadedAt: string
  processed: boolean
  ocrData?: any
}

/**
 * Coverage type information
 */
export interface CoverageTypeInfo {
  id: string
  name: string
  description?: string
  category?: string
}

/**
 * Question information from database
 */
export interface DatabaseQuestion {
  id: string
  questionText: string
  fieldType: 'text' | 'number' | 'date' | 'file' | 'select' | 'boolean'
  isRequired: boolean
  options?: string[]
  orderIndex: number
  placeholder?: string
  helpText?: string
}

/**
 * Answer to a database question
 */
export interface QuestionAnswer {
  questionId: string
  answerValue: any
  answeredAt: string
}

/**
 * Valid stage transitions
 */
export const VALID_TRANSITIONS: Record<FlowStage, FlowStage[]> = {
  categorization: ['questioning'],
  questioning: ['documents', 'validation'],
  documents: ['validation'],
  validation: ['finalization', 'questioning', 'documents'], // Can go back to fix issues
  finalization: ['completed'],
  completed: [], // Terminal state
}

/**
 * Stage transition error
 */
export class InvalidStageTransitionError extends Error {
  constructor(from: FlowStage, to: FlowStage) {
    super(`Invalid stage transition from '${from}' to '${to}'`)
    this.name = 'InvalidStageTransitionError'
  }
}

/**
 * Stream chunk types
 */
export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'stage_transition'; stage: FlowStage }
  | { type: 'question'; question: DatabaseQuestion }
  | { type: 'validation_error'; error: ValidationError }
  | { type: 'document_request'; documentTypes: string[] }
  | { type: 'completion'; claimId: string; claimNumber: string }
  | { type: 'error'; message: string }

/**
 * Claim creation data for Stage 5
 */
export interface ClaimCreationData {
  userId: string
  chatSessionId: string
  claimNumber: string
  coverageTypeIds: string[]
  incidentDescription: string
  incidentDate?: string
  incidentLocation?: string
  incidentType?: string
  totalClaimedAmount?: number
  currency?: string
  status?: string
}
