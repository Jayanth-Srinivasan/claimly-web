import type { Rule } from '@/types/policies'
import type {
  RuleCondition,
  RuleAction,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RelativeDateValue,
} from '@/types/rules'

/**
 * RulesEngine - Core class for evaluating questionnaire rules
 *
 * Supports:
 * - 17+ operators for conditions
 * - AND/OR logical operators
 * - Multiple action types (show/hide, validate, require documents, block submission)
 * - Priority-based rule evaluation
 */
export class RulesEngine {
  private rules: Rule[]

  constructor(rules: Rule[]) {
    // Sort by priority (higher priority = evaluated first)
    this.rules = [...rules].sort((a, b) => b.priority - a.priority)
  }

  /**
   * Main evaluation method - evaluates all rules against the provided context
   */
  evaluate(context: RuleEvaluationContext): RuleEvaluationResult {
    const result: RuleEvaluationResult = {
      passed: true,
      errors: [],
      warnings: [],
      visibleQuestions: new Set<string>(),
      hiddenQuestions: new Set<string>(),
      requiredDocuments: [],
      blockedSubmission: false,
      fieldValues: {},
    }

    // Filter active rules
    const activeRules = this.rules.filter((rule) => rule.is_active)

    // Evaluate each rule
    for (const rule of activeRules) {
      try {
        const conditions = this.parseConditions(rule.conditions)
        const conditionsMet = this.evaluateConditions(conditions, context)

        if (conditionsMet) {
          const actions = this.parseActions(rule.actions)
          this.applyActions(rule, actions, result, context)
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error)
        // Continue with other rules even if one fails
      }
    }

    return result
  }

  /**
   * Parse conditions from JSONB storage
   */
  private parseConditions(conditionsJson: unknown): RuleCondition[] {
    if (Array.isArray(conditionsJson)) {
      return conditionsJson as RuleCondition[]
    }
    return []
  }

  /**
   * Parse actions from JSONB storage
   */
  private parseActions(actionsJson: unknown): RuleAction[] {
    if (Array.isArray(actionsJson)) {
      return actionsJson as RuleAction[]
    }
    return []
  }

  /**
   * Evaluate multiple conditions with AND/OR logic
   */
  private evaluateConditions(
    conditions: RuleCondition[],
    context: RuleEvaluationContext
  ): boolean {
    if (conditions.length === 0) return true

    let result = this.evaluateSingleCondition(conditions[0], context)

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i]
      const conditionResult = this.evaluateSingleCondition(condition, context)

      const operator = conditions[i - 1].logicalOperator || 'AND'

      if (operator === 'AND') {
        result = result && conditionResult
      } else {
        result = result || conditionResult
      }
    }

    return result
  }

  /**
   * Evaluate a single condition
   */
  private evaluateSingleCondition(
    condition: RuleCondition,
    context: RuleEvaluationContext
  ): boolean {
    const fieldValue = context.answers[condition.field]

    switch (condition.operator) {
      case 'equals':
        return this.operatorEquals(fieldValue, condition.value)

      case 'not_equals':
        return !this.operatorEquals(fieldValue, condition.value)

      case 'contains':
        return this.operatorContains(fieldValue, condition.value)

      case 'not_contains':
        return !this.operatorContains(fieldValue, condition.value)

      case 'greater_than':
        return this.operatorGreaterThan(fieldValue, condition.value)

      case 'greater_than_or_equal':
        return this.operatorGreaterThanOrEqual(fieldValue, condition.value)

      case 'less_than':
        return this.operatorLessThan(fieldValue, condition.value)

      case 'less_than_or_equal':
        return this.operatorLessThanOrEqual(fieldValue, condition.value)

      case 'in':
        return this.operatorIn(fieldValue, condition.value)

      case 'not_in':
        return !this.operatorIn(fieldValue, condition.value)

      case 'between':
        return this.operatorBetween(fieldValue, condition.value)

      case 'regex':
        return this.operatorRegex(fieldValue, condition.value)

      case 'is_empty':
        return this.operatorIsEmpty(fieldValue)

      case 'is_not_empty':
        return !this.operatorIsEmpty(fieldValue)

      case 'date_before':
        return this.operatorDateBefore(fieldValue, condition.value, context)

      case 'date_after':
        return this.operatorDateAfter(fieldValue, condition.value, context)

      case 'date_between':
        return this.operatorDateBetween(fieldValue, condition.value)

      default:
        console.warn(`Unknown operator: ${condition.operator}`)
        return false
    }
  }

  /**
   * Apply rule actions to the result
   */
  private applyActions(
    rule: Rule,
    actions: RuleAction[],
    result: RuleEvaluationResult,
    _context: RuleEvaluationContext
  ): void {
    for (const action of actions) {
      switch (action.type) {
        case 'show_question':
          if (action.targetQuestionId) {
            result.visibleQuestions.add(action.targetQuestionId)
            result.hiddenQuestions.delete(action.targetQuestionId)
          }
          break

        case 'hide_question':
          if (action.targetQuestionId) {
            result.hiddenQuestions.add(action.targetQuestionId)
            result.visibleQuestions.delete(action.targetQuestionId)
          }
          break

        case 'validate':
          // Validation failed - add error
          result.passed = false
          const errorMsg = action.errorMessage || rule.error_message || 'Validation failed'
          result.errors.push(errorMsg)
          break

        case 'require_document':
          if (action.targetQuestionId) {
            result.requiredDocuments.push({
              questionId: action.targetQuestionId,
              documentTypes: action.documentTypes || [],
              minFiles: action.minFiles || 1,
              maxFiles: action.maxFiles || 10,
              allowedFormats: action.allowedFormats || ['pdf', 'jpg', 'jpeg', 'png'],
              maxFileSize: action.maxFileSize,
              message: action.errorMessage,
            })
          }
          break

        case 'block_submission':
          result.blockedSubmission = true
          result.blockReason = action.errorMessage || rule.error_message || 'Submission blocked'
          result.errors.push(result.blockReason)
          break

        case 'set_value':
          if (action.targetQuestionId && action.value !== undefined) {
            result.fieldValues![action.targetQuestionId] = action.value
          }
          break

        case 'show_warning':
          const warningMsg = action.warningMessage || action.errorMessage || 'Warning'
          result.warnings.push(warningMsg)
          break
      }
    }
  }

  // ========================================
  // OPERATOR IMPLEMENTATIONS
  // ========================================

  private operatorEquals(fieldValue: unknown, conditionValue: unknown): boolean {
    // Handle null/undefined
    if (fieldValue == null && conditionValue == null) return true
    if (fieldValue == null || conditionValue == null) return false

    // Strict equality
    return fieldValue === conditionValue
  }

  private operatorContains(fieldValue: unknown, conditionValue: unknown): boolean {
    if (fieldValue == null || conditionValue == null) return false

    const fieldStr = String(fieldValue).toLowerCase()
    const conditionStr = String(conditionValue).toLowerCase()

    return fieldStr.includes(conditionStr)
  }

  private operatorGreaterThan(fieldValue: unknown, conditionValue: unknown): boolean {
    const fieldNum = Number(fieldValue)
    const conditionNum = Number(conditionValue)

    if (isNaN(fieldNum) || isNaN(conditionNum)) return false

    return fieldNum > conditionNum
  }

  private operatorGreaterThanOrEqual(fieldValue: unknown, conditionValue: unknown): boolean {
    const fieldNum = Number(fieldValue)
    const conditionNum = Number(conditionValue)

    if (isNaN(fieldNum) || isNaN(conditionNum)) return false

    return fieldNum >= conditionNum
  }

  private operatorLessThan(fieldValue: unknown, conditionValue: unknown): boolean {
    const fieldNum = Number(fieldValue)
    const conditionNum = Number(conditionValue)

    if (isNaN(fieldNum) || isNaN(conditionNum)) return false

    return fieldNum < conditionNum
  }

  private operatorLessThanOrEqual(fieldValue: unknown, conditionValue: unknown): boolean {
    const fieldNum = Number(fieldValue)
    const conditionNum = Number(conditionValue)

    if (isNaN(fieldNum) || isNaN(conditionNum)) return false

    return fieldNum <= conditionNum
  }

  private operatorIn(fieldValue: unknown, conditionValue: unknown): boolean {
    if (!Array.isArray(conditionValue)) return false
    if (fieldValue == null) return false

    return conditionValue.includes(fieldValue)
  }

  private operatorBetween(fieldValue: unknown, conditionValue: unknown): boolean {
    if (!Array.isArray(conditionValue) || conditionValue.length !== 2) return false

    const fieldNum = Number(fieldValue)
    const min = Number(conditionValue[0])
    const max = Number(conditionValue[1])

    if (isNaN(fieldNum) || isNaN(min) || isNaN(max)) return false

    return fieldNum >= min && fieldNum <= max
  }

  private operatorRegex(fieldValue: unknown, conditionValue: unknown): boolean {
    if (fieldValue == null || typeof conditionValue !== 'string') return false

    try {
      const regex = new RegExp(conditionValue)
      return regex.test(String(fieldValue))
    } catch {
      console.error('Invalid regex pattern:', conditionValue)
      return false
    }
  }

  private operatorIsEmpty(fieldValue: unknown): boolean {
    if (fieldValue == null) return true
    if (fieldValue === '') return true
    if (Array.isArray(fieldValue) && fieldValue.length === 0) return true
    if (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0) return true

    return false
  }

  private operatorDateBefore(
    fieldValue: unknown,
    conditionValue: unknown,
    context: RuleEvaluationContext
  ): boolean {
    const fieldDate = this.parseDate(fieldValue)
    if (!fieldDate) return false

    const conditionDate = this.parseRelativeOrAbsoluteDate(conditionValue, context)
    if (!conditionDate) return false

    return fieldDate < conditionDate
  }

  private operatorDateAfter(
    fieldValue: unknown,
    conditionValue: unknown,
    context: RuleEvaluationContext
  ): boolean {
    const fieldDate = this.parseDate(fieldValue)
    if (!fieldDate) return false

    const conditionDate = this.parseRelativeOrAbsoluteDate(conditionValue, context)
    if (!conditionDate) return false

    return fieldDate > conditionDate
  }

  private operatorDateBetween(fieldValue: unknown, conditionValue: unknown): boolean {
    if (!Array.isArray(conditionValue) || conditionValue.length !== 2) return false

    const fieldDate = this.parseDate(fieldValue)
    if (!fieldDate) return false

    const startDate = this.parseDate(conditionValue[0])
    const endDate = this.parseDate(conditionValue[1])

    if (!startDate || !endDate) return false

    return fieldDate >= startDate && fieldDate <= endDate
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private parseDate(value: unknown): Date | null {
    if (value == null) return null
    if (value instanceof Date) return value

    const dateStr = String(value)
    const date = new Date(dateStr)

    return isNaN(date.getTime()) ? null : date
  }

  private parseRelativeOrAbsoluteDate(
    value: unknown,
    context: RuleEvaluationContext
  ): Date | null {
    // Check if it's a relative date value
    if (typeof value === 'object' && value !== null && 'type' in value) {
      const relativeDate = value as RelativeDateValue

      if (relativeDate.type === 'relative') {
        const baseDate = this.getBaseDate(relativeDate.from, context)
        return this.addRelativeDateOffset(baseDate, relativeDate)
      }
    }

    // Otherwise, parse as absolute date
    return this.parseDate(value)
  }

  private getBaseDate(from: string | undefined, context: RuleEvaluationContext): Date {
    switch (from) {
      case 'submission_date':
        if (context.metadata?.submissionDate) {
          return new Date(context.metadata.submissionDate)
        }
        return new Date()

      case 'policy_start_date':
        if (context.metadata?.policyStartDate) {
          return new Date(context.metadata.policyStartDate as string)
        }
        return new Date()

      case 'now':
      default:
        return new Date()
    }
  }

  private addRelativeDateOffset(baseDate: Date, offset: RelativeDateValue): Date {
    const result = new Date(baseDate)

    if (offset.days) {
      result.setDate(result.getDate() + offset.days)
    }

    if (offset.months) {
      result.setMonth(result.getMonth() + offset.months)
    }

    if (offset.years) {
      result.setFullYear(result.getFullYear() + offset.years)
    }

    return result
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get all rules applicable to a specific coverage type
   * TODO: Update when integrating with AI triage system
   */
  getRulesForCoverageType(coverageTypeId: string): Rule[] {
    return this.rules.filter((r) => r.coverage_type_id === coverageTypeId)
  }

  /**
   * Get all rules of a specific type
   */
  getRulesByType(type: Rule['rule_type']): Rule[] {
    return this.rules.filter((r) => r.rule_type === type)
  }

  /**
   * Get active rules only
   */
  getActiveRules(): Rule[] {
    return this.rules.filter((r) => r.is_active)
  }

  /**
   * Evaluate a single rule
   */
  evaluateSingleRule(rule: Rule, context: RuleEvaluationContext): boolean {
    const conditions = this.parseConditions(rule.conditions)
    return this.evaluateConditions(conditions, context)
  }

  /**
   * Test if a rule would be triggered with given context
   */
  testRule(rule: Rule, context: RuleEvaluationContext): {
    triggered: boolean
    actions: RuleAction[]
  } {
    const conditions = this.parseConditions(rule.conditions)
    const triggered = this.evaluateConditions(conditions, context)
    const actions = triggered ? this.parseActions(rule.actions) : []

    return { triggered, actions }
  }
}

/**
 * Factory function to create a RulesEngine instance
 */
export function createRulesEngine(rules: Rule[]): RulesEngine {
  return new RulesEngine(rules)
}

/**
 * Evaluate rules for a questionnaire
 */
export function evaluateQuestionnaireRules(
  rules: Rule[],
  context: RuleEvaluationContext
): RuleEvaluationResult {
  const engine = new RulesEngine(rules)
  return engine.evaluate(context)
}
