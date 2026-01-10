import type { Json } from '@/types/database'
import type {
  RuleCondition,
  RuleAction,
  RuleOperator,
  ActionType,
  LogicalOperator,
  RuleTemplate,
} from '@/types/rules'

/**
 * Serialize rule conditions for JSONB storage
 */
export function serializeRuleConditions(conditions: RuleCondition[]): Json {
  return JSON.parse(JSON.stringify(conditions))
}

/**
 * Deserialize rule conditions from JSONB
 */
export function deserializeRuleConditions(json: Json): RuleCondition[] {
  if (!Array.isArray(json)) return []

  return json.filter(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'field' in item &&
      'operator' in item &&
      'value' in item
  ) as unknown as RuleCondition[]
}

/**
 * Serialize rule actions for JSONB storage
 */
export function serializeRuleActions(actions: RuleAction[]): Json {
  return JSON.parse(JSON.stringify(actions))
}

/**
 * Deserialize rule actions from JSONB
 */
export function deserializeRuleActions(json: Json): RuleAction[] {
  if (!Array.isArray(json)) return []

  return json.filter(
    (item) => typeof item === 'object' && item !== null && 'type' in item
  ) as unknown as RuleAction[]
}

/**
 * Validate rule condition structure
 */
export function validateRuleCondition(condition: unknown): condition is RuleCondition {
  if (typeof condition !== 'object' || condition === null) return false

  const c = condition as Record<string, unknown>

  return (
    typeof c.field === 'string' &&
    typeof c.operator === 'string' &&
    'value' in c &&
    (!('logicalOperator' in c) ||
      c.logicalOperator === 'AND' ||
      c.logicalOperator === 'OR')
  )
}

/**
 * Validate rule action structure
 */
export function validateRuleAction(action: unknown): action is RuleAction {
  if (typeof action !== 'object' || action === null) return false

  const a = action as Record<string, unknown>

  return typeof a.type === 'string'
}

/**
 * Create a condition object
 */
export function createCondition(
  field: string,
  operator: RuleOperator,
  value: unknown,
  logicalOperator?: LogicalOperator
): RuleCondition {
  return {
    field,
    operator,
    value,
    ...(logicalOperator && { logicalOperator }),
  }
}

/**
 * Create an action object
 */
export function createAction(
  type: ActionType,
  options?: Partial<Omit<RuleAction, 'type'>>
): RuleAction {
  return {
    type,
    ...options,
  }
}

/**
 * Get operator display name
 */
export function getOperatorDisplayName(operator: RuleOperator): string {
  const displayNames: Record<RuleOperator, string> = {
    equals: 'Equals',
    not_equals: 'Not Equals',
    contains: 'Contains',
    not_contains: 'Does Not Contain',
    greater_than: 'Greater Than',
    greater_than_or_equal: 'Greater Than or Equal',
    less_than: 'Less Than',
    less_than_or_equal: 'Less Than or Equal',
    in: 'Is One Of',
    not_in: 'Is Not One Of',
    between: 'Between',
    regex: 'Matches Pattern',
    is_empty: 'Is Empty',
    is_not_empty: 'Is Not Empty',
    date_before: 'Date Before',
    date_after: 'Date After',
    date_between: 'Date Between',
  }

  return displayNames[operator] || operator
}

/**
 * Get action type display name
 */
export function getActionTypeDisplayName(type: ActionType): string {
  const displayNames: Record<ActionType, string> = {
    show_question: 'Show Question',
    hide_question: 'Hide Question',
    validate: 'Validate',
    require_document: 'Require Document',
    block_submission: 'Block Submission',
    set_value: 'Set Value',
    show_warning: 'Show Warning',
    calculate_value: 'Calculate Value',
  }

  return displayNames[type] || type
}

/**
 * Get operators applicable to a field type
 */
export function getOperatorsForFieldType(fieldType: string): RuleOperator[] {
  const operatorsByFieldType: Record<string, RuleOperator[]> = {
    text: [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'is_empty',
      'is_not_empty',
      'regex',
    ],
    number: [
      'equals',
      'not_equals',
      'greater_than',
      'greater_than_or_equal',
      'less_than',
      'less_than_or_equal',
      'between',
      'is_empty',
      'is_not_empty',
    ],
    date: [
      'equals',
      'not_equals',
      'date_before',
      'date_after',
      'date_between',
      'is_empty',
      'is_not_empty',
    ],
    select: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
    file: ['is_empty', 'is_not_empty'],
  }

  return operatorsByFieldType[fieldType] || []
}

/**
 * Check if operator requires an array value
 */
export function operatorRequiresArray(operator: RuleOperator): boolean {
  return ['in', 'not_in', 'between', 'date_between'].includes(operator)
}

/**
 * Check if operator requires a date value
 */
export function operatorRequiresDate(operator: RuleOperator): boolean {
  return ['date_before', 'date_after', 'date_between'].includes(operator)
}

/**
 * Check if operator requires no value
 */
export function operatorRequiresNoValue(operator: RuleOperator): boolean {
  return ['is_empty', 'is_not_empty'].includes(operator)
}

/**
 * Format condition for display
 */
export function formatConditionForDisplay(condition: RuleCondition): string {
  const operator = getOperatorDisplayName(condition.operator)

  if (operatorRequiresNoValue(condition.operator)) {
    return `${condition.field} ${operator}`
  }

  if (Array.isArray(condition.value)) {
    return `${condition.field} ${operator} [${condition.value.join(', ')}]`
  }

  return `${condition.field} ${operator} ${condition.value}`
}

/**
 * Format action for display
 */
export function formatActionForDisplay(action: RuleAction): string {
  const type = getActionTypeDisplayName(action.type)

  switch (action.type) {
    case 'show_question':
    case 'hide_question':
      return `${type}: ${action.targetQuestionId}`

    case 'validate':
      return `${type}: ${action.errorMessage || 'Validation failed'}`

    case 'require_document':
      return `${type}: ${action.documentTypes?.join(', ') || 'Documents'}`

    case 'block_submission':
      return `${type}: ${action.errorMessage || 'Submission blocked'}`

    case 'set_value':
      return `${type}: ${action.targetQuestionId} = ${action.value}`

    case 'show_warning':
      return `${type}: ${action.warningMessage || action.errorMessage || 'Warning'}`

    default:
      return type
  }
}

/**
 * Predefined rule templates
 */
export const ruleTemplates: RuleTemplate[] = [
  // Conditional Templates
  {
    id: 'show_question_on_value',
    name: 'Show Question When Value Equals',
    description: 'Show a question when another question has a specific value',
    category: 'conditional',
    ruleType: 'conditional',
    conditions: [
      {
        field: '{source_field}',
        operator: 'equals',
        value: '{expected_value}',
      },
    ],
    actions: [
      {
        type: 'show_question',
        targetQuestionId: '{target_question}',
      },
    ],
    placeholders: ['source_field', 'expected_value', 'target_question'],
  },
  {
    id: 'show_on_amount_threshold',
    name: 'Show Question When Amount Exceeds Threshold',
    description: 'Show additional questions when claim amount exceeds a threshold',
    category: 'conditional',
    ruleType: 'conditional',
    conditions: [
      {
        field: 'claim_amount',
        operator: 'greater_than',
        value: 1000,
      },
    ],
    actions: [
      {
        type: 'show_question',
        targetQuestionId: '{target_question}',
      },
    ],
    placeholders: ['target_question'],
  },

  // Validation Templates
  {
    id: 'validate_amount_range',
    name: 'Validate Amount Range',
    description: 'Ensure claim amount is within acceptable range',
    category: 'validation',
    ruleType: 'validation',
    conditions: [
      {
        field: 'claim_amount',
        operator: 'between',
        value: [100, 50000],
      },
    ],
    actions: [
      {
        type: 'validate',
        errorMessage: 'Amount must be between $100 and $50,000',
      },
    ],
    placeholders: [],
  },
  {
    id: 'validate_future_date',
    name: 'Validate Future Date',
    description: 'Ensure date is not in the past',
    category: 'validation',
    ruleType: 'validation',
    conditions: [
      {
        field: '{date_field}',
        operator: 'date_after',
        value: { type: 'relative', days: 0 },
      },
    ],
    actions: [
      {
        type: 'validate',
        errorMessage: 'Date must be in the future',
      },
    ],
    placeholders: ['date_field'],
  },

  // Document Templates
  {
    id: 'require_receipts_high_amount',
    name: 'Require Receipts for High Amounts',
    description: 'Require receipt upload when claim exceeds threshold',
    category: 'document',
    ruleType: 'document',
    conditions: [
      {
        field: 'claim_amount',
        operator: 'greater_than',
        value: 1000,
      },
    ],
    actions: [
      {
        type: 'require_document',
        targetQuestionId: 'receipts',
        documentTypes: ['receipt', 'invoice'],
        minFiles: 1,
        maxFiles: 10,
        allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
        errorMessage: 'Please upload receipts for amounts over $1,000',
      },
    ],
    placeholders: [],
  },

  // Eligibility Templates
  {
    id: 'filing_deadline_90_days',
    name: '90-Day Filing Deadline',
    description: 'Block claims filed more than 90 days after incident',
    category: 'eligibility',
    ruleType: 'eligibility',
    conditions: [
      {
        field: 'incident_date',
        operator: 'date_after',
        value: { type: 'relative', days: -90, from: 'now' },
      },
    ],
    actions: [
      {
        type: 'block_submission',
        errorMessage: 'Claims must be filed within 90 days of the incident',
      },
    ],
    placeholders: [],
  },
  {
    id: 'minimum_delay_duration',
    name: 'Minimum Delay Duration',
    description: 'Require minimum delay duration for eligibility',
    category: 'eligibility',
    ruleType: 'eligibility',
    conditions: [
      {
        field: 'delay_duration',
        operator: 'greater_than_or_equal',
        value: 180,
      },
    ],
    actions: [
      {
        type: 'block_submission',
        errorMessage: 'Delay must be at least 3 hours (180 minutes) to be eligible',
      },
    ],
    placeholders: [],
  },
]

/**
 * Get template by ID
 */
export function getTemplateById(id: string): RuleTemplate | undefined {
  return ruleTemplates.find((t) => t.id === id)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: RuleTemplate['category']): RuleTemplate[] {
  return ruleTemplates.filter((t) => t.category === category)
}

/**
 * Apply template with values
 */
export function applyTemplate(
  template: RuleTemplate,
  values: Record<string, unknown>
): {
  conditions: RuleCondition[]
  actions: RuleAction[]
} {
  // Deep clone template
  const conditions = JSON.parse(JSON.stringify(template.conditions)) as RuleCondition[]
  const actions = JSON.parse(JSON.stringify(template.actions)) as RuleAction[]

  // Replace placeholders in conditions
  for (const condition of conditions) {
    if (typeof condition.field === 'string') {
      condition.field = replacePlaceholders(condition.field, values)
    }
    if (typeof condition.value === 'string') {
      condition.value = replacePlaceholders(condition.value, values)
    }
  }

  // Replace placeholders in actions
  for (const action of actions) {
    if (action.targetQuestionId && typeof action.targetQuestionId === 'string') {
      action.targetQuestionId = replacePlaceholders(action.targetQuestionId, values)
    }
    if (action.errorMessage && typeof action.errorMessage === 'string') {
      action.errorMessage = replacePlaceholders(action.errorMessage, values)
    }
  }

  return { conditions, actions }
}

/**
 * Replace placeholders in a string
 */
function replacePlaceholders(text: string, values: Record<string, unknown>): string {
  let result = text

  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{${key}}`
    result = result.replace(new RegExp(placeholder, 'g'), String(value))
  }

  return result
}

/**
 * Clone a rule condition
 */
export function cloneCondition(condition: RuleCondition): RuleCondition {
  return JSON.parse(JSON.stringify(condition))
}

/**
 * Clone a rule action
 */
export function cloneAction(action: RuleAction): RuleAction {
  return JSON.parse(JSON.stringify(action))
}

/**
 * Merge multiple rule evaluation results
 */
export function mergeRuleResults(
  results: Array<{
    passed: boolean
    errors: string[]
    warnings: string[]
    visibleQuestions: Set<string>
    hiddenQuestions: Set<string>
  }>
): {
  passed: boolean
  errors: string[]
  warnings: string[]
  visibleQuestions: Set<string>
  hiddenQuestions: Set<string>
} {
  const merged = {
    passed: true,
    errors: [] as string[],
    warnings: [] as string[],
    visibleQuestions: new Set<string>(),
    hiddenQuestions: new Set<string>(),
  }

  for (const result of results) {
    if (!result.passed) merged.passed = false
    merged.errors.push(...result.errors)
    merged.warnings.push(...result.warnings)

    result.visibleQuestions.forEach((q) => merged.visibleQuestions.add(q))
    result.hiddenQuestions.forEach((q) => merged.hiddenQuestions.add(q))
  }

  // Remove duplicates
  merged.errors = [...new Set(merged.errors)]
  merged.warnings = [...new Set(merged.warnings)]

  return merged
}

/**
 * Convert rule priority to display label
 */
export function getPriorityLabel(priority: number): string {
  if (priority >= 100) return 'Critical'
  if (priority >= 75) return 'High'
  if (priority >= 50) return 'Medium'
  if (priority >= 25) return 'Low'
  return 'Normal'
}

/**
 * Suggest priority based on rule type
 */
export function suggestPriority(ruleType: string): number {
  const priorityMap: Record<string, number> = {
    eligibility: 100, // Highest priority
    validation: 75,
    document: 50,
    conditional: 25,
    calculation: 10,
  }

  return priorityMap[ruleType] || 0
}
