import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Rule, RuleInsert, RuleUpdate } from '@/types/policies'

/**
 * Get all rules for a questionnaire
 */
export async function getRulesByQuestionnaire(questionnaireId: string): Promise<Rule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('questionnaire_id', questionnaireId)
    .order('priority', { ascending: false }) // Higher priority first

  if (error) {
    throw new Error(`Failed to fetch rules for questionnaire: ${error.message}`)
  }

  return (data as unknown as Rule[]) || []
}

/**
 * Get all rules for a specific question
 */
export async function getRulesByQuestion(questionId: string): Promise<Rule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('question_id', questionId)
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch rules for question: ${error.message}`)
  }

  return (data as unknown as Rule[]) || []
}

/**
 * Get all active rules for a questionnaire
 */
export async function getActiveRulesByQuestionnaire(questionnaireId: string): Promise<Rule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('questionnaire_id', questionnaireId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch active rules: ${error.message}`)
  }

  return (data as unknown as Rule[]) || []
}

/**
 * Get rules by type
 */
export async function getRulesByType(ruleType: Rule['rule_type']): Promise<Rule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('rule_type', ruleType)
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch rules by type: ${error.message}`)
  }

  return (data as unknown as Rule[]) || []
}

/**
 * Get a single rule by ID
 */
export async function getRule(id: string): Promise<Rule | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from('rules').select('*').eq('id', id).single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch rule: ${error.message}`)
  }

  return data as unknown as Rule
}

/**
 * Create a new rule
 */
export async function createRule(rule: RuleInsert): Promise<Rule> {
  const supabase = await createClient()

  const insertData: typeof supabase.from<'rules'>['insert']['arguments'] = {
    questionnaire_id: rule.questionnaire_id ?? null,
    question_id: rule.question_id ?? null,
    rule_type: rule.rule_type,
    name: rule.name,
    description: rule.description ?? null,
    conditions: rule.conditions ?? [],
    actions: rule.actions ?? [],
    priority: rule.priority ?? 0,
    is_active: rule.is_active ?? true,
    error_message: rule.error_message ?? null,
  }

  const data = await insertOne(supabase, 'rules', insertData)
  return data as unknown as Rule
}

/**
 * Update a rule
 */
export async function updateRule(id: string, updates: RuleUpdate): Promise<Rule> {
  const supabase = await createClient()

  const updateData: typeof supabase.from<'rules'>['update']['arguments'] = {}

  if (updates.questionnaire_id !== undefined) updateData.questionnaire_id = updates.questionnaire_id
  if (updates.question_id !== undefined) updateData.question_id = updates.question_id
  if (updates.rule_type !== undefined) updateData.rule_type = updates.rule_type
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.conditions !== undefined) updateData.conditions = updates.conditions
  if (updates.actions !== undefined) updateData.actions = updates.actions
  if (updates.priority !== undefined) updateData.priority = updates.priority
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active
  if (updates.error_message !== undefined) updateData.error_message = updates.error_message

  const data = await updateOne(supabase, 'rules', id, updateData)
  return data as unknown as Rule
}

/**
 * Delete a rule
 */
export async function deleteRule(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('rules').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete rule: ${error.message}`)
  }
}

/**
 * Toggle rule active status
 */
export async function toggleRuleActive(id: string, isActive: boolean): Promise<Rule> {
  return updateRule(id, { is_active: isActive })
}

/**
 * Reorder rules by updating priority
 */
export async function reorderRules(
  rules: Array<{ id: string; priority: number }>
): Promise<void> {
  const supabase = await createClient()

  await Promise.all(
    rules.map(({ id, priority }) =>
      supabase.from('rules').update({ priority }).eq('id', id)
    )
  )
}

/**
 * Duplicate a rule (useful for creating templates)
 */
export async function duplicateRule(id: string): Promise<Rule> {
  const originalRule = await getRule(id)

  if (!originalRule) {
    throw new Error('Rule not found')
  }

  const newRule: RuleInsert = {
    questionnaire_id: originalRule.questionnaire_id,
    question_id: originalRule.question_id,
    rule_type: originalRule.rule_type,
    name: `${originalRule.name} (Copy)`,
    description: originalRule.description,
    conditions: originalRule.conditions,
    actions: originalRule.actions,
    priority: originalRule.priority,
    is_active: false, // Duplicates are inactive by default
    error_message: originalRule.error_message,
  }

  return createRule(newRule)
}

/**
 * Get questionnaire-level rules (not tied to a specific question)
 */
export async function getQuestionnaireLevelRules(questionnaireId: string): Promise<Rule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('questionnaire_id', questionnaireId)
    .is('question_id', null)
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch questionnaire-level rules: ${error.message}`)
  }

  return (data as unknown as Rule[]) || []
}

/**
 * Get rule statistics for a questionnaire
 */
export async function getRuleStats(questionnaireId: string): Promise<{
  total: number
  active: number
  inactive: number
  byType: Record<string, number>
  highestPriority: number
  lowestPriority: number
}> {
  const rules = await getRulesByQuestionnaire(questionnaireId)

  const byType = rules.reduce(
    (acc, rule) => {
      acc[rule.rule_type] = (acc[rule.rule_type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const priorities = rules.map((r) => r.priority)

  return {
    total: rules.length,
    active: rules.filter((r) => r.is_active).length,
    inactive: rules.filter((r) => !r.is_active).length,
    byType,
    highestPriority: priorities.length > 0 ? Math.max(...priorities) : 0,
    lowestPriority: priorities.length > 0 ? Math.min(...priorities) : 0,
  }
}

/**
 * Search rules by name or description
 */
export async function searchRules(query: string): Promise<Rule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to search rules: ${error.message}`)
  }

  return (data as unknown as Rule[]) || []
}

/**
 * Bulk update rule priorities (useful for drag-and-drop reordering)
 */
export async function bulkUpdateRulePriorities(
  updates: Array<{ id: string; priority: number }>
): Promise<void> {
  const supabase = await createClient()

  const results = await Promise.allSettled(
    updates.map(({ id, priority }) =>
      supabase.from('rules').update({ priority }).eq('id', id)
    )
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error('Failed rule priority updates:', failed)
    throw new Error(`Failed to update ${failed.length} of ${updates.length} rule priorities`)
  }
}
