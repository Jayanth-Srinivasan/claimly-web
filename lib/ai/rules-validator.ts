import { RulesEngine } from '@/lib/rules/engine'
import { getActiveRulesByCoverageType } from '@/lib/supabase/rules'
import type { RuleEvaluationContext, RuleEvaluationResult } from '@/types/rules'

/**
 * Validate answers against rules for a coverage type
 */
export async function validateAnswers(
  coverageTypeId: string,
  answers: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<RuleEvaluationResult> {
  // Get active rules for the coverage type
  const rules = await getActiveRulesByCoverageType(coverageTypeId)

  if (rules.length === 0) {
    // No rules configured, return passed
    return {
      passed: true,
      errors: [],
      warnings: [],
      visibleQuestions: new Set<string>(),
      hiddenQuestions: new Set<string>(),
      requiredDocuments: [],
      blockedSubmission: false,
      fieldValues: {},
    }
  }

  // Create rules engine
  const engine = new RulesEngine(rules)

  // Create evaluation context
  const context: RuleEvaluationContext = {
    answers,
    metadata: metadata || {},
  }

  // Evaluate rules
  return engine.evaluate(context)
}

/**
 * Get validation errors as a simple array of strings
 */
export function getValidationErrors(result: RuleEvaluationResult): string[] {
  return result.errors
}

/**
 * Get validation warnings as a simple array of strings
 */
export function getValidationWarnings(result: RuleEvaluationResult): string[] {
  return result.warnings
}

/**
 * Check if submission is blocked
 */
export function isSubmissionBlocked(result: RuleEvaluationResult): boolean {
  return result.blockedSubmission
}
