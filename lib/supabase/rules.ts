import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Rule, RuleInsert, RuleUpdate } from '@/types/policies'
import type { Json } from '@/lib/supabase/database.types'

/**
 * Get all rules
 */
export async function getRules(): Promise<Rule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch rules: ${error.message}`)
  }

  return (data as unknown as Rule[]) || []
}

/**
 * Get all rules for a coverage type
 */
export async function getRulesByCoverageType(coverageTypeId: string): Promise<Rule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('coverage_type_id', coverageTypeId)
    .order('priority', { ascending: false }) // Higher priority first

  if (error) {
    throw new Error(`Failed to fetch rules for coverage type: ${error.message}`)
  }

  return (data as unknown as Rule[]) || []
}

/**
 * Get all active rules for a coverage type
 */
export async function getActiveRulesByCoverageType(coverageTypeId: string): Promise<Rule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('coverage_type_id', coverageTypeId)
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

  const insertData = {
    coverage_type_id: rule.coverage_type_id,
    rule_type: rule.rule_type,
    name: rule.name,
    description: rule.description ?? null,
    conditions: (rule.conditions ?? []) as Json,
    actions: (rule.actions ?? []) as Json,
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

  const updateData: Record<string, unknown> = {}

  if (updates.coverage_type_id !== undefined) updateData.coverage_type_id = updates.coverage_type_id
  if (updates.rule_type !== undefined) updateData.rule_type = updates.rule_type
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.conditions !== undefined) updateData.conditions = updates.conditions as Json
  if (updates.actions !== undefined) updateData.actions = updates.actions as Json
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('rules').update as any)({ priority }).eq('id', id)
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
    coverage_type_id: originalRule.coverage_type_id,
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
 * Get rule statistics for a coverage type
 */
export async function getRuleStats(coverageTypeId: string): Promise<{
  total: number
  active: number
  inactive: number
  byType: Record<string, number>
  highestPriority: number
  lowestPriority: number
}> {
  const rules = await getRulesByCoverageType(coverageTypeId)

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('rules').update as any)({ priority }).eq('id', id)
    )
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error('Failed rule priority updates:', failed)
    throw new Error(`Failed to update ${failed.length} of ${updates.length} rule priorities`)
  }
}
