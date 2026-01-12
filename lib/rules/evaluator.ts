import { SupabaseClient } from '@supabase/supabase-js'

interface RuleCondition {
  field: string
  operator: string
  value: any
}

interface RuleAction {
  type: 'hide_question' | 'require_document' | 'block_submission' | 'show_error' | 'calculate'
  question_id?: string
  documents?: string[]
  error_message?: string
  calculation?: string
}

interface Rule {
  id: string
  name: string
  conditions: RuleCondition[]
  actions: RuleAction[]
  priority: number
}

interface EvaluationResult {
  rules_triggered: string[]
  hidden_questions: string[]
  validation_errors: Array<{ message: string; field?: string }>
  required_documents: string[]
  eligibility_status: 'eligible' | 'ineligible'
}

export class RuleEvaluator {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async evaluate(input: { coverage_type_ids: string[]; answers: any[] }): Promise<EvaluationResult> {
    const { data: rules } = await this.supabase
      .from('rules')
      .select('*')
      .in('coverage_type_id', input.coverage_type_ids)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    const results: EvaluationResult = {
      rules_triggered: [],
      hidden_questions: [],
      validation_errors: [],
      required_documents: [],
      eligibility_status: 'eligible',
    }

    if (!rules || rules.length === 0) return results

    // Build answer map for quick lookup
    const answerMap = input.answers.reduce((acc, ans) => {
      acc[ans.question_id] = ans.answer_text || ans.answer_number || ans.answer_date
      return acc
    }, {} as Record<string, any>)

    // Evaluate each rule
    for (const rule of rules) {
      const conditionsMet = this.evaluateConditions(rule.conditions, answerMap)

      if (conditionsMet) {
        results.rules_triggered.push(rule.id)
        this.executeActions(rule, results)
      }
    }

    return results
  }

  private evaluateConditions(conditions: RuleCondition[], answerMap: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true

    return conditions.every((cond) => {
      const value = answerMap[cond.field]
      return this.evaluateOperator(value, cond.operator, cond.value)
    })
  }

  private evaluateOperator(fieldValue: any, operator: string, compareValue: any): boolean {
    const toNumber = (v: any) => {
      const n = Number(v)
      return isNaN(n) ? null : n
    }

    const toDate = (v: any) => {
      if (!v) return null
      const d = new Date(v)
      return isNaN(d.getTime()) ? null : d
    }

    switch (operator) {
      case 'equals':
        return fieldValue === compareValue

      case 'not_equals':
        return fieldValue !== compareValue

      case 'greater_than':
        return (toNumber(fieldValue) ?? -Infinity) > (toNumber(compareValue) ?? Infinity)

      case 'less_than':
        return (toNumber(fieldValue) ?? Infinity) < (toNumber(compareValue) ?? -Infinity)

      case 'greater_than_or_equal':
        return (toNumber(fieldValue) ?? -Infinity) >= (toNumber(compareValue) ?? Infinity)

      case 'less_than_or_equal':
        return (toNumber(fieldValue) ?? Infinity) <= (toNumber(compareValue) ?? -Infinity)

      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase())

      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase())

      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue)

      case 'not_in':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue)

      case 'is_empty':
        return !fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined

      case 'is_not_empty':
        return (
          fieldValue !== '' &&
          fieldValue !== null &&
          fieldValue !== undefined &&
          (typeof fieldValue !== 'string' || fieldValue.trim() !== '')
        )

      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(compareValue).toLowerCase())

      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(compareValue).toLowerCase())

      case 'regex':
        try {
          const regex = new RegExp(compareValue)
          return regex.test(String(fieldValue))
        } catch {
          return false
        }

      case 'between':
        if (!Array.isArray(compareValue) || compareValue.length !== 2) return false
        const numValue = toNumber(fieldValue)
        const min = toNumber(compareValue[0])
        const max = toNumber(compareValue[1])
        if (numValue == null || min == null || max == null) return false
        return numValue >= min && numValue <= max

      case 'not_between':
        if (!Array.isArray(compareValue) || compareValue.length !== 2) return false
        const numVal = toNumber(fieldValue)
        const minVal = toNumber(compareValue[0])
        const maxVal = toNumber(compareValue[1])
        if (numVal == null || minVal == null || maxVal == null) return false
        return numVal < minVal || numVal > maxVal

      case 'date_before': {
        const fv = toDate(fieldValue)
        const cv = toDate(compareValue)
        if (!fv || !cv) return false
        return fv < cv
      }

      case 'date_after': {
        const fv = toDate(fieldValue)
        const cv = toDate(compareValue)
        if (!fv || !cv) return false
        return fv > cv
      }

      case 'date_between': {
        if (!Array.isArray(compareValue) || compareValue.length !== 2) return false
        const fv = toDate(fieldValue)
        const start = toDate(compareValue[0])
        const end = toDate(compareValue[1])
        if (!fv || !start || !end) return false
        return fv >= start && fv <= end
      }

      default:
        console.warn(`Unknown operator: ${operator}`)
        return false
    }
  }

  private executeActions(rule: Rule, results: EvaluationResult) {
    rule.actions?.forEach((action) => {
      switch (action.type) {
        case 'hide_question':
          if (action.question_id && !results.hidden_questions.includes(action.question_id)) {
            results.hidden_questions.push(action.question_id)
          }
          break

        case 'require_document':
          if (action.documents) {
            results.required_documents.push(...action.documents)
          }
          break

        case 'block_submission':
          results.eligibility_status = 'ineligible'
          if (action.error_message) {
            results.validation_errors.push({
              message: action.error_message,
            })
          }
          break

        case 'show_error':
          if (action.error_message) {
            results.validation_errors.push({
              message: action.error_message,
              field: action.question_id,
            })
          }
          break

        case 'calculate':
          // Placeholder for calculation logic
          // This would involve evaluating mathematical expressions
          break
      }
    })
  }
}
