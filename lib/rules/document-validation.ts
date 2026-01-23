/**
 * Rules-Based Document Validation
 *
 * This module provides rules-based validation logic for documents.
 * Rules can be loaded from the database and applied to validate documents
 * against coverage-type-specific requirements.
 */

import { createClient } from '@/lib/supabase/server'
import { semanticLocationMatch } from '@/lib/ai/document-processor'

// ============================================================
// TYPES
// ============================================================

export interface ValidationRuleCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: string | number | string[]
}

export interface ValidationRuleAction {
  type: 'validate_field' | 'require_field' | 'warn_field'
  field: string
  against?: string // Field to compare against
  operator?: 'equals' | 'within_days' | 'location_match' | 'amount_match' | 'contains'
  value?: string | number
  errorMessage?: string
  warningMessage?: string
}

export interface ValidationRule {
  id: string
  name: string
  rule_type: 'validation' | 'document'
  coverage_type_id: string
  conditions: ValidationRuleCondition[]
  actions: ValidationRuleAction[]
  priority: number
  is_active: boolean
}

export interface DocumentValidationInput {
  documentType: string
  extractedData: Record<string, unknown>
  ocrData?: string
}

export interface ClaimContextInput {
  coverageType: string
  coverageTypeId: string
  incidentDate?: string
  incidentLocation?: string
  claimedAmount?: number
  incidentDescription?: string
}

export interface ValidationRuleResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  appliedRules: string[]
}

// ============================================================
// VALIDATION OPERATORS
// ============================================================

/**
 * Check if a condition is met
 */
function evaluateCondition(
  condition: ValidationRuleCondition,
  data: Record<string, unknown>
): boolean {
  const fieldValue = data[condition.field]

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value

    case 'not_equals':
      return fieldValue !== condition.value

    case 'contains':
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        return fieldValue.toLowerCase().includes(condition.value.toLowerCase())
      }
      return false

    case 'not_contains':
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        return !fieldValue.toLowerCase().includes(condition.value.toLowerCase())
      }
      return true

    case 'greater_than':
      if (typeof fieldValue === 'number' && typeof condition.value === 'number') {
        return fieldValue > condition.value
      }
      return false

    case 'less_than':
      if (typeof fieldValue === 'number' && typeof condition.value === 'number') {
        return fieldValue < condition.value
      }
      return false

    case 'in':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(fieldValue as string)
      }
      return false

    case 'not_in':
      if (Array.isArray(condition.value)) {
        return !condition.value.includes(fieldValue as string)
      }
      return true

    default:
      return false
  }
}

/**
 * Execute a validation action
 */
function executeValidationAction(
  action: ValidationRuleAction,
  documentData: Record<string, unknown>,
  claimContext: Record<string, unknown>
): { valid: boolean; error?: string; warning?: string } {
  const documentValue = documentData[action.field]
  const contextValue = action.against ? claimContext[action.against] : undefined

  switch (action.type) {
    case 'validate_field':
      return validateField(action, documentValue, contextValue)

    case 'require_field':
      if (documentValue === undefined || documentValue === null || documentValue === '') {
        return {
          valid: false,
          error: action.errorMessage || `Required field "${action.field}" is missing`
        }
      }
      return { valid: true }

    case 'warn_field':
      if (documentValue === undefined || documentValue === null || documentValue === '') {
        return {
          valid: true,
          warning: action.warningMessage || `Optional field "${action.field}" is missing`
        }
      }
      return { valid: true }

    default:
      return { valid: true }
  }
}

/**
 * Validate a field against a context value using the specified operator
 */
function validateField(
  action: ValidationRuleAction,
  documentValue: unknown,
  contextValue: unknown
): { valid: boolean; error?: string; warning?: string } {
  if (documentValue === undefined || documentValue === null) {
    return { valid: true } // Missing fields are handled by require_field
  }

  switch (action.operator) {
    case 'equals':
      if (documentValue !== contextValue) {
        return {
          valid: false,
          error: action.errorMessage || `Field "${action.field}" (${documentValue}) does not match expected value (${contextValue})`
        }
      }
      break

    case 'within_days':
      if (typeof documentValue === 'string' && typeof contextValue === 'string') {
        try {
          const docDate = new Date(documentValue)
          const ctxDate = new Date(contextValue)
          const daysDiff = Math.abs((docDate.getTime() - ctxDate.getTime()) / (1000 * 60 * 60 * 24))
          const allowedDays = typeof action.value === 'number' ? action.value : 1

          if (daysDiff > allowedDays) {
            return {
              valid: false,
              error: action.errorMessage || `Date "${action.field}" is ${Math.round(daysDiff)} days from expected date (allowed: ${allowedDays} days)`
            }
          }
        } catch {
          return {
            valid: false,
            error: `Invalid date format in field "${action.field}"`
          }
        }
      }
      break

    case 'location_match':
      if (typeof documentValue === 'string' && typeof contextValue === 'string') {
        const match = semanticLocationMatch(documentValue, contextValue)
        if (!match.matches) {
          return {
            valid: false,
            error: action.errorMessage || `Location "${documentValue}" does not match expected location "${contextValue}"`
          }
        }
      }
      break

    case 'amount_match':
      if (typeof documentValue === 'number' && typeof contextValue === 'number') {
        const tolerance = typeof action.value === 'number' ? action.value : 0.1
        const upperBound = contextValue * (1 + tolerance)

        if (documentValue > upperBound) {
          return {
            valid: false,
            error: action.errorMessage || `Amount ${documentValue} exceeds expected amount ${contextValue} (tolerance: ${tolerance * 100}%)`
          }
        }
      }
      break

    case 'contains':
      if (typeof documentValue === 'string' && typeof action.value === 'string') {
        if (!documentValue.toLowerCase().includes(action.value.toLowerCase())) {
          return {
            valid: false,
            error: action.errorMessage || `Field "${action.field}" does not contain expected value "${action.value}"`
          }
        }
      }
      break
  }

  return { valid: true }
}

// ============================================================
// MAIN VALIDATION FUNCTION
// ============================================================

/**
 * Load and apply validation rules for a coverage type
 */
export async function applyValidationRules(
  coverageTypeId: string,
  documentData: DocumentValidationInput,
  claimContext: ClaimContextInput
): Promise<ValidationRuleResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const appliedRules: string[] = []

  try {
    const supabase = await createClient()

    // Load validation rules for this coverage type
    const { data: rules, error: rulesError } = await supabase
      .from('rules')
      .select('*')
      .eq('coverage_type_id', coverageTypeId)
      .eq('rule_type', 'validation')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (rulesError) {
      console.error('[applyValidationRules] Error loading rules:', rulesError)
      return {
        isValid: true, // Don't block on rule loading errors
        errors: [],
        warnings: ['Could not load validation rules'],
        appliedRules: []
      }
    }

    if (!rules || rules.length === 0) {
      console.log(`[applyValidationRules] No validation rules found for coverage type ${coverageTypeId}`)
      return {
        isValid: true,
        errors: [],
        warnings: [],
        appliedRules: []
      }
    }

    console.log(`[applyValidationRules] Applying ${rules.length} validation rules`)

    // Prepare data for validation
    const docData: Record<string, unknown> = {
      ...documentData.extractedData,
      documentType: documentData.documentType,
      hasOcrData: !!documentData.ocrData,
    }

    const ctxData: Record<string, unknown> = {
      coverageType: claimContext.coverageType,
      incidentDate: claimContext.incidentDate,
      incidentLocation: claimContext.incidentLocation,
      claimedAmount: claimContext.claimedAmount,
      incidentDescription: claimContext.incidentDescription,
    }

    // Apply each rule
    for (const rule of rules) {
      try {
        // Parse conditions/actions from database JSON (may be string or array)
        let conditionsData = rule.conditions
        if (typeof conditionsData === 'string') {
          try { conditionsData = JSON.parse(conditionsData) } catch { conditionsData = [] }
        }
        const conditions: ValidationRuleCondition[] = Array.isArray(conditionsData) ? conditionsData : []

        let actionsData = rule.actions
        if (typeof actionsData === 'string') {
          try { actionsData = JSON.parse(actionsData) } catch { actionsData = [] }
        }
        const actions: ValidationRuleAction[] = Array.isArray(actionsData) ? actionsData : []

        // Check if all conditions are met
        const conditionsMet = conditions.length === 0 ||
          conditions.every(condition => evaluateCondition(condition, docData))

        if (!conditionsMet) {
          console.log(`[applyValidationRules] Skipping rule "${rule.name}" - conditions not met`)
          continue
        }

        appliedRules.push(rule.name)

        // Execute all actions
        for (const action of actions) {
          const result = executeValidationAction(action, docData, ctxData)

          if (!result.valid && result.error) {
            errors.push(result.error)
          }
          if (result.warning) {
            warnings.push(result.warning)
          }
        }
      } catch (ruleError) {
        console.error(`[applyValidationRules] Error applying rule "${rule.name}":`, ruleError)
        warnings.push(`Could not apply rule "${rule.name}"`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      appliedRules,
    }
  } catch (error) {
    console.error('[applyValidationRules] Error:', error)
    return {
      isValid: true, // Don't block on errors
      errors: [],
      warnings: ['Validation rules could not be applied'],
      appliedRules: [],
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get all active validation rules for a coverage type
 */
export async function getValidationRules(coverageTypeId: string): Promise<ValidationRule[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('coverage_type_id', coverageTypeId)
      .eq('rule_type', 'validation')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) {
      console.error('[getValidationRules] Error:', error)
      return []
    }

    return (data || []).map(rule => ({
      id: rule.id,
      name: rule.name,
      rule_type: rule.rule_type as 'validation' | 'document',
      coverage_type_id: rule.coverage_type_id,
      conditions: (rule.conditions as unknown as ValidationRuleCondition[]) || [],
      actions: (rule.actions as unknown as ValidationRuleAction[]) || [],
      priority: rule.priority || 0,
      is_active: rule.is_active,
    }))
  } catch (error) {
    console.error('[getValidationRules] Error:', error)
    return []
  }
}

/**
 * Create default validation rules for a coverage type
 * This can be used to seed the database with standard rules
 */
export function getDefaultValidationRules(coverageType: string): Omit<ValidationRule, 'id' | 'coverage_type_id'>[] {
  switch (coverageType.toLowerCase()) {
    case 'baggage_loss':
    case 'baggage loss':
      return [
        {
          name: 'Baggage Claim Date Validation',
          rule_type: 'validation',
          conditions: [],
          actions: [
            {
              type: 'validate_field',
              field: 'date',
              against: 'incidentDate',
              operator: 'within_days',
              value: 1,
              errorMessage: 'Document date must be within 1 day of incident date for baggage claims'
            },
            {
              type: 'validate_field',
              field: 'from',
              against: 'incidentLocation',
              operator: 'location_match',
              errorMessage: 'Document departure location must match incident location'
            }
          ],
          priority: 100,
          is_active: true,
        },
        {
          name: 'Baggage Tag Required',
          rule_type: 'validation',
          conditions: [
            { field: 'documentType', operator: 'contains', value: 'pir' }
          ],
          actions: [
            {
              type: 'require_field',
              field: 'baggageTag',
              errorMessage: 'Baggage tag number is required for PIR documents'
            }
          ],
          priority: 90,
          is_active: true,
        }
      ]

    case 'flight_cancellation':
    case 'flight cancellation':
      return [
        {
          name: 'Flight Cancellation Date Validation',
          rule_type: 'validation',
          conditions: [],
          actions: [
            {
              type: 'validate_field',
              field: 'date',
              against: 'incidentDate',
              operator: 'within_days',
              value: 7,
              errorMessage: 'Document date must be within 7 days of flight cancellation date'
            },
            {
              type: 'require_field',
              field: 'flightNumber',
              errorMessage: 'Flight number is required for flight cancellation claims'
            }
          ],
          priority: 100,
          is_active: true,
        }
      ]

    case 'medical':
    case 'medical_expense':
      return [
        {
          name: 'Medical Document Date Validation',
          rule_type: 'validation',
          conditions: [],
          actions: [
            {
              type: 'validate_field',
              field: 'date',
              against: 'incidentDate',
              operator: 'within_days',
              value: 7,
              errorMessage: 'Medical document date must be within 7 days of incident date'
            },
            {
              type: 'validate_field',
              field: 'amount',
              against: 'claimedAmount',
              operator: 'amount_match',
              value: 0.1,
              errorMessage: 'Document amount exceeds claimed amount by more than 10%'
            }
          ],
          priority: 100,
          is_active: true,
        }
      ]

    default:
      return []
  }
}
