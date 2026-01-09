// @deprecated - Use coverage_type_id instead. Kept for backward compatibility during migration
export type ClaimType = 'travel' | 'medical' | 'baggage' | 'flight'

export type FieldType = 'text' | 'number' | 'date' | 'file' | 'select'
export type PremiumFrequency = 'monthly' | 'quarterly' | 'annually'

// @deprecated - Use PolicyCoverageType instead. Kept for backward compatibility during migration
export interface CoverageItem {
  name: string
  limit: number
}

// ============================================
// NEW: Coverage Types
// ============================================

export interface CoverageType {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null // 'travel' | 'medical' | 'property' | 'liability' | 'business' | 'other'
  icon: string | null
  is_active: boolean
  display_order: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CoverageTypeInsert {
  name: string
  slug: string
  description?: string | null
  category?: string | null
  icon?: string | null
  is_active?: boolean
  display_order?: number
  metadata?: Record<string, unknown>
}

export interface CoverageTypeUpdate {
  name?: string
  slug?: string
  description?: string | null
  category?: string | null
  icon?: string | null
  is_active?: boolean
  display_order?: number
  metadata?: Record<string, unknown>
}

// ============================================
// NEW: Policy Coverage Types (Junction Table)
// ============================================

export interface PolicyCoverageType {
  id: string
  policy_id: string
  coverage_type_id: string
  coverage_limit: number | null
  deductible: number | null
  is_optional: boolean
  additional_premium: number
  created_at: string
  updated_at: string
}

export interface PolicyCoverageTypeInsert {
  policy_id: string
  coverage_type_id: string
  coverage_limit?: number | null
  deductible?: number | null
  is_optional?: boolean
  additional_premium?: number
}

export interface PolicyCoverageTypeUpdate {
  coverage_limit?: number | null
  deductible?: number | null
  is_optional?: boolean
  additional_premium?: number
}

// ============================================
// NEW: Rules
// ============================================

export interface Rule {
  id: string
  questionnaire_id: string | null
  question_id: string | null
  rule_type: 'conditional' | 'validation' | 'document' | 'eligibility' | 'calculation'
  name: string
  description: string | null
  conditions: unknown // JSONB - array of RuleCondition objects
  actions: unknown // JSONB - array of RuleAction objects
  priority: number
  is_active: boolean
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface RuleInsert {
  questionnaire_id?: string | null
  question_id?: string | null
  rule_type: 'conditional' | 'validation' | 'document' | 'eligibility' | 'calculation'
  name: string
  description?: string | null
  conditions?: unknown
  actions?: unknown
  priority?: number
  is_active?: boolean
  error_message?: string | null
}

export interface RuleUpdate {
  questionnaire_id?: string | null
  question_id?: string | null
  rule_type?: 'conditional' | 'validation' | 'document' | 'eligibility' | 'calculation'
  name?: string
  description?: string | null
  conditions?: unknown
  actions?: unknown
  priority?: number
  is_active?: boolean
  error_message?: string | null
}

// ============================================
// Policies
// ============================================

export interface Policy {
  id: string
  name: string
  description: string | null
  coverage_items: CoverageItem[]
  deductible: number | null
  premium: number | null
  currency: string | null
  premium_frequency: PremiumFrequency | null
  policy_term_months: number | null
  exclusions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PolicyInsert {
  name: string
  description?: string | null
  coverage_items: CoverageItem[]
  deductible?: number | null
  premium?: number | null
  currency?: string | null
  premium_frequency?: PremiumFrequency | null
  policy_term_months?: number | null
  exclusions?: string[]
  is_active?: boolean
}

export interface PolicyUpdate {
  name?: string
  description?: string | null
  coverage_items?: CoverageItem[]
  deductible?: number | null
  premium?: number | null
  currency?: string | null
  premium_frequency?: PremiumFrequency | null
  policy_term_months?: number | null
  exclusions?: string[]
  is_active?: boolean
}

// ============================================
// Questionnaires
// ============================================

export interface Questionnaire {
  id: string
  claim_type: ClaimType | null // @deprecated - use coverage_type_id
  coverage_type_id: string | null
  name: string
  description: string | null
  version: number
  is_published: boolean
  parent_version_id: string | null
  effective_from: string | null
  effective_until: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface QuestionnaireInsert {
  claim_type?: ClaimType | null // @deprecated - use coverage_type_id
  coverage_type_id?: string | null
  name: string
  description?: string | null
  version?: number
  is_published?: boolean
  parent_version_id?: string | null
  effective_from?: string | null
  effective_until?: string | null
  is_active?: boolean
}

export interface QuestionnaireUpdate {
  claim_type?: ClaimType | null // @deprecated - use coverage_type_id
  coverage_type_id?: string | null
  name?: string
  description?: string | null
  version?: number
  is_published?: boolean
  parent_version_id?: string | null
  effective_from?: string | null
  effective_until?: string | null
  is_active?: boolean
}

export interface Question {
  id: string
  questionnaire_id: string
  question_text: string
  field_type: FieldType
  is_required: boolean
  options: string[] | null
  order_index: number
  placeholder: string | null
  help_text: string | null
  created_at: string
  updated_at: string
}

export interface QuestionInsert {
  questionnaire_id: string
  question_text: string
  field_type: FieldType
  is_required?: boolean
  options?: string[] | null
  order_index: number
  placeholder?: string | null
  help_text?: string | null
}

export interface QuestionUpdate {
  question_text?: string
  field_type?: FieldType
  is_required?: boolean
  options?: string[] | null
  order_index?: number
  placeholder?: string | null
  help_text?: string | null
}

// ============================================
// Extended Types (with relationships)
// ============================================

export interface QuestionnaireWithQuestions extends Questionnaire {
  questions: Question[]
}

export interface QuestionnaireWithRules extends Questionnaire {
  questions: Question[]
  rules: Rule[]
}

export interface QuestionnaireWithCoverageType extends Questionnaire {
  coverage_type: CoverageType | null
  questions: Question[]
}

export interface PolicyWithCoverageTypes extends Omit<Policy, 'coverage_items'> {
  policy_coverage_types: Array<PolicyCoverageType & { coverage_type: CoverageType }>
}

export interface CoverageTypeWithQuestionnaire extends CoverageType {
  questionnaire: Questionnaire | null
}

// ============================================
// Question Dependencies
// ============================================

export interface QuestionDependency {
  id: string
  question_id: string
  depends_on_question_id: string
  dependency_type: string // 'requires' | 'excludes' | 'suggests'
  created_at: string
}
