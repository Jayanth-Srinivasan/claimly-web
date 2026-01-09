// Rules Engine Type Definitions

export type RuleType = 'conditional' | 'validation' | 'document' | 'eligibility' | 'calculation'

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'between'
  | 'regex'
  | 'is_empty'
  | 'is_not_empty'
  | 'date_before'
  | 'date_after'
  | 'date_between'

export type LogicalOperator = 'AND' | 'OR'

export type ActionType =
  | 'show_question'
  | 'hide_question'
  | 'validate'
  | 'require_document'
  | 'block_submission'
  | 'set_value'
  | 'show_warning'

/**
 * Rule Condition - defines when a rule should be triggered
 */
export interface RuleCondition {
  field: string // question ID or field name
  operator: RuleOperator
  value: unknown
  logicalOperator?: LogicalOperator // For chaining multiple conditions (default: 'AND')
}

/**
 * Rule Action - defines what happens when conditions are met
 */
export interface RuleAction {
  type: ActionType
  targetQuestionId?: string // For show_question, hide_question, set_value
  errorMessage?: string // For validate, block_submission, show_warning
  warningMessage?: string // For show_warning
  documentTypes?: string[] // For require_document
  minFiles?: number // For require_document
  maxFiles?: number // For require_document
  allowedFormats?: string[] // For require_document (e.g., ['pdf', 'jpg', 'png'])
  maxFileSize?: number // For require_document (in bytes)
  value?: unknown // For set_value action
}

/**
 * Rule Evaluation Context - the data available when evaluating rules
 */
export interface RuleEvaluationContext {
  answers: Record<string, unknown> // question_id -> answer
  metadata?: {
    userId?: string
    policyId?: string
    coverageTypeId?: string
    submissionDate?: string
    [key: string]: unknown
  }
}

/**
 * Document Requirement - specifies required documents based on rules
 */
export interface DocumentRequirement {
  questionId: string
  documentTypes: string[]
  minFiles: number
  maxFiles: number
  allowedFormats: string[]
  maxFileSize?: number
  message?: string
}

/**
 * Rule Evaluation Result - the outcome of evaluating all rules
 */
export interface RuleEvaluationResult {
  passed: boolean // Overall validation status
  errors: string[] // Error messages
  warnings: string[] // Warning messages
  visibleQuestions: Set<string> // Question IDs that should be visible
  hiddenQuestions: Set<string> // Question IDs that should be hidden
  requiredDocuments: DocumentRequirement[] // Document requirements
  blockedSubmission: boolean // Whether submission should be blocked
  blockReason?: string // Reason for blocking submission
  fieldValues?: Record<string, unknown> // Auto-populated field values
}

/**
 * Rule Validation Error - error during rule evaluation
 */
export interface RuleValidationError {
  ruleId: string
  ruleName: string
  questionId?: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Relative Date Value - for date-based rules
 */
export interface RelativeDateValue {
  type: 'relative'
  days?: number
  months?: number
  years?: number
  from?: 'now' | 'submission_date' | 'policy_start_date'
}

/**
 * Rule Test Case - for testing rules
 */
export interface RuleTestCase {
  name: string
  description?: string
  answers: Record<string, unknown>
  metadata?: Record<string, unknown>
  expectedResult: {
    passed: boolean
    visibleQuestions?: string[]
    hiddenQuestions?: string[]
    errors?: string[]
    warnings?: string[]
    blockedSubmission?: boolean
  }
}

/**
 * Rule Template - predefined rule templates for common scenarios
 */
export interface RuleTemplate {
  id: string
  name: string
  description: string
  category: 'conditional' | 'validation' | 'document' | 'eligibility'
  ruleType: RuleType
  conditions: Partial<RuleCondition>[]
  actions: Partial<RuleAction>[]
  placeholders?: string[] // Fields that need to be filled by user
}

/**
 * Rule Execution Log - for debugging and auditing
 */
export interface RuleExecutionLog {
  ruleId: string
  ruleName: string
  executedAt: string
  conditionsMet: boolean
  actionsApplied: string[]
  executionTimeMs: number
  context: RuleEvaluationContext
}

/**
 * Rule Priority Levels - predefined priority levels for rules
 */
export enum RulePriority {
  CRITICAL = 100,
  HIGH = 75,
  MEDIUM = 50,
  LOW = 25,
  DEFAULT = 0,
}

/**
 * Rule Categories - for organizing rules
 */
export type RuleCategory =
  | 'eligibility'
  | 'validation'
  | 'conditional_display'
  | 'document_requirements'
  | 'calculation'
  | 'custom'

/**
 * Rule Configuration - extended rule configuration options
 */
export interface RuleConfiguration {
  enabled: boolean
  priority: number
  category: RuleCategory
  tags?: string[]
  effectiveFrom?: string
  effectiveUntil?: string
  appliesTo?: {
    coverageTypes?: string[]
    questionIds?: string[]
    userTypes?: string[]
  }
}
