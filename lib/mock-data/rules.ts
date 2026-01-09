import { Rule } from '@/types/policies'
import { RuleCondition, RuleAction } from '@/types/rules'

// Mock Rules Data - Examples of different rule types
export const mockRules: Rule[] = [
  // ============================================
  // CONDITIONAL RULES (Show/Hide Questions)
  // ============================================
  {
    id: 'r1',
    questionnaire_id: 'q1', // Medical Emergency questionnaire
    question_id: null,
    rule_type: 'conditional',
    name: 'Show Medical Details for High Amounts',
    description: 'Show additional medical questions when claim amount exceeds $1000',
    conditions: [
      {
        field: 'claim_amount',
        operator: 'greater_than',
        value: 1000,
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'show_question',
        targetQuestionId: 'q1_medical_details',
      },
      {
        type: 'show_question',
        targetQuestionId: 'q1_hospital_name',
      },
    ] as RuleAction[],
    priority: 10,
    is_active: true,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'r2',
    questionnaire_id: 'q2', // Trip Cancellation questionnaire
    question_id: null,
    rule_type: 'conditional',
    name: 'Show Weather-Related Questions',
    description: 'Show weather-related questions when cancellation reason is weather',
    conditions: [
      {
        field: 'cancellation_reason',
        operator: 'equals',
        value: 'weather',
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'show_question',
        targetQuestionId: 'q2_weather_details',
      },
    ] as RuleAction[],
    priority: 8,
    is_active: true,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ============================================
  // VALIDATION RULES
  // ============================================
  {
    id: 'r3',
    questionnaire_id: 'q1', // Medical Emergency questionnaire
    question_id: 'q1_claim_amount',
    rule_type: 'validation',
    name: 'Validate Claim Amount Range',
    description: 'Claim amount must be between $100 and $50,000',
    conditions: [
      {
        field: 'claim_amount',
        operator: 'between',
        value: [100, 50000],
        logicalOperator: 'AND',
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'validate',
        errorMessage: 'Claim amount must be between $100 and $50,000',
      },
    ] as RuleAction[],
    priority: 15,
    is_active: true,
    error_message: 'Claim amount must be between $100 and $50,000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'r4',
    questionnaire_id: 'q2', // Trip Cancellation questionnaire
    question_id: 'q2_trip_start_date',
    rule_type: 'validation',
    name: 'Validate Trip Start Date',
    description: 'Trip start date must be in the future or within last 30 days',
    conditions: [
      {
        field: 'trip_start_date',
        operator: 'date_after',
        value: { type: 'relative', days: -30 },
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'validate',
        errorMessage: 'Trip start date must be within the last 30 days or in the future',
      },
    ] as RuleAction[],
    priority: 12,
    is_active: true,
    error_message: 'Trip start date must be within the last 30 days or in the future',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'r5',
    questionnaire_id: 'q3', // Baggage Loss questionnaire
    question_id: 'q3_baggage_tag',
    rule_type: 'validation',
    name: 'Validate Baggage Tag Format',
    description: 'Baggage tag must be in format ABC123456',
    conditions: [
      {
        field: 'baggage_tag',
        operator: 'regex',
        value: '^[A-Z]{3}[0-9]{6}$',
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'validate',
        errorMessage: 'Baggage tag must be in format ABC123456 (3 uppercase letters followed by 6 digits)',
      },
    ] as RuleAction[],
    priority: 10,
    is_active: true,
    error_message: 'Invalid baggage tag format',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ============================================
  // DOCUMENT REQUIREMENT RULES
  // ============================================
  {
    id: 'r6',
    questionnaire_id: 'q1', // Medical Emergency questionnaire
    question_id: null,
    rule_type: 'document',
    name: 'Require Medical Bills for High Claims',
    description: 'Medical bills required for claims over $1,000',
    conditions: [
      {
        field: 'claim_amount',
        operator: 'greater_than',
        value: 1000,
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'require_document',
        targetQuestionId: 'q1_medical_bills',
        documentTypes: ['medical_bill', 'receipt', 'invoice'],
        minFiles: 1,
        maxFiles: 10,
        allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSize: 5242880, // 5MB
        errorMessage: 'Please upload at least one medical bill (PDF or image, max 5MB each)',
      },
    ] as RuleAction[],
    priority: 20,
    is_active: true,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'r7',
    questionnaire_id: 'q1', // Medical Emergency questionnaire
    question_id: null,
    rule_type: 'document',
    name: 'Require Hospital Report for Very High Claims',
    description: 'Hospital discharge report required for claims over $5,000',
    conditions: [
      {
        field: 'claim_amount',
        operator: 'greater_than',
        value: 5000,
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'require_document',
        targetQuestionId: 'q1_hospital_report',
        documentTypes: ['hospital_report', 'discharge_summary', 'diagnosis'],
        minFiles: 1,
        maxFiles: 5,
        allowedFormats: ['pdf'],
        maxFileSize: 10485760, // 10MB
        errorMessage: 'Please upload hospital discharge report (PDF, max 10MB)',
      },
    ] as RuleAction[],
    priority: 25,
    is_active: true,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'r8',
    questionnaire_id: 'q3', // Baggage Loss questionnaire
    question_id: null,
    rule_type: 'document',
    name: 'Require Airline Report',
    description: 'Airline baggage claim report required for all baggage loss claims',
    conditions: [] as RuleCondition[], // Always required
    actions: [
      {
        type: 'require_document',
        targetQuestionId: 'q3_airline_report',
        documentTypes: ['airline_report', 'pir', 'property_irregularity_report'],
        minFiles: 1,
        maxFiles: 1,
        allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSize: 5242880, // 5MB
        errorMessage: 'Airline Property Irregularity Report (PIR) is required',
      },
    ] as RuleAction[],
    priority: 30,
    is_active: true,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ============================================
  // ELIGIBILITY RULES
  // ============================================
  {
    id: 'r9',
    questionnaire_id: 'q1', // Medical Emergency questionnaire
    question_id: null,
    rule_type: 'eligibility',
    name: 'Claims Must Be Filed Within 90 Days',
    description: 'Medical emergency claims must be filed within 90 days of incident',
    conditions: [
      {
        field: 'incident_date',
        operator: 'date_after',
        value: { type: 'relative', days: -90, from: 'now' },
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'block_submission',
        errorMessage:
          'Claims must be filed within 90 days of the incident. Your incident date exceeds this timeframe.',
      },
    ] as RuleAction[],
    priority: 50,
    is_active: true,
    error_message: 'Claim filing deadline exceeded',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'r10',
    questionnaire_id: 'q2', // Trip Cancellation questionnaire
    question_id: null,
    rule_type: 'eligibility',
    name: 'Trip Must Be Cancelled 48+ Hours Before',
    description: 'Trip cancellation must occur at least 48 hours before departure',
    conditions: [
      {
        field: 'cancellation_date',
        operator: 'date_before',
        value: { type: 'relative', days: -2, from: 'trip_start_date' },
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'block_submission',
        errorMessage:
          'Trip cancellation claims require cancellation at least 48 hours before departure',
      },
    ] as RuleAction[],
    priority: 45,
    is_active: true,
    error_message: 'Insufficient notice for trip cancellation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'r11',
    questionnaire_id: 'q4', // Flight Delay questionnaire
    question_id: 'q4_delay_duration',
    rule_type: 'eligibility',
    name: 'Minimum Delay Duration',
    description: 'Flight delay must be at least 3 hours to be eligible for compensation',
    conditions: [
      {
        field: 'delay_duration',
        operator: 'greater_than_or_equal',
        value: 180, // minutes
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'block_submission',
        errorMessage: 'Flight delay compensation requires a delay of at least 3 hours',
      },
    ] as RuleAction[],
    priority: 40,
    is_active: true,
    error_message: 'Delay duration below minimum threshold',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ============================================
  // COMPLEX MULTI-CONDITION RULES
  // ============================================
  {
    id: 'r12',
    questionnaire_id: 'q1', // Medical Emergency questionnaire
    question_id: null,
    rule_type: 'conditional',
    name: 'Show International Travel Questions',
    description: 'Show additional questions for international incidents with high amounts',
    conditions: [
      {
        field: 'is_international',
        operator: 'equals',
        value: true,
        logicalOperator: 'AND',
      },
      {
        field: 'claim_amount',
        operator: 'greater_than',
        value: 2000,
      },
    ] as RuleCondition[],
    actions: [
      {
        type: 'show_question',
        targetQuestionId: 'q1_country',
      },
      {
        type: 'show_question',
        targetQuestionId: 'q1_exchange_rate',
      },
      {
        type: 'show_question',
        targetQuestionId: 'q1_original_currency',
      },
    ] as RuleAction[],
    priority: 18,
    is_active: true,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// Helper functions

export function getRulesByQuestionnaire(questionnaireId: string): Rule[] {
  return mockRules.filter((rule) => rule.questionnaire_id === questionnaireId)
}

export function getRulesByType(ruleType: Rule['rule_type']): Rule[] {
  return mockRules.filter((rule) => rule.rule_type === ruleType)
}

export function getActiveRules(): Rule[] {
  return mockRules.filter((rule) => rule.is_active)
}

export function getRulesByQuestion(questionId: string): Rule[] {
  return mockRules.filter((rule) => rule.question_id === questionId)
}

// Get rules sorted by priority (highest first)
export function getRulesByPriority(): Rule[] {
  return [...mockRules].sort((a, b) => b.priority - a.priority)
}

// Get rules statistics
export function getRulesStatistics() {
  const total = mockRules.length
  const active = mockRules.filter((r) => r.is_active).length
  const byType = mockRules.reduce(
    (acc, rule) => {
      acc[rule.rule_type] = (acc[rule.rule_type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    total,
    active,
    inactive: total - active,
    byType,
  }
}
