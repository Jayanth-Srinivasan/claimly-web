'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Rule } from '@/types/policies'
import type { RuleType, RuleCondition, RuleAction } from '@/types/rules'

interface RulesTabProps {
  coverageTypeId: string
  rules: Rule[]
  onAddRule: () => void
  onEditRule: (rule: Rule) => void
  onDeleteRule: (id: string) => void
  onToggleRule: (id: string, isActive: boolean) => void
}

const ruleTypeColors: Record<RuleType, string> = {
  conditional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  validation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  document: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  eligibility: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  calculation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const ruleTypeLabels: Record<RuleType, string> = {
  conditional: 'Conditional',
  validation: 'Validation',
  document: 'Document',
  eligibility: 'Eligibility',
  calculation: 'Calculation',
}

export function RulesTab({
  coverageTypeId: _coverageTypeId,
  rules,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onToggleRule,
}: RulesTabProps) {
  const [filterType, setFilterType] = useState<RuleType | 'all'>('all')
  const [showInactive, setShowInactive] = useState(true)

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesType = filterType === 'all' || rule.rule_type === filterType
    const matchesActive = showInactive || rule.is_active
    return matchesType && matchesActive
  })

  // Group rules by type
  const rulesByType = filteredRules.reduce(
    (acc, rule) => {
      if (!acc[rule.rule_type]) {
        acc[rule.rule_type] = []
      }
      acc[rule.rule_type].push(rule)
      return acc
    },
    {} as Record<RuleType, Rule[]>
  )

  // Calculate stats
  const stats = {
    total: rules.length,
    active: rules.filter((r) => r.is_active).length,
    inactive: rules.filter((r) => !r.is_active).length,
    byType: rules.reduce(
      (acc, r) => {
        acc[r.rule_type] = (acc[r.rule_type] || 0) + 1
        return acc
      },
      {} as Record<RuleType, number>
    ),
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the rule "${name}"?`)) {
      onDeleteRule(id)
    }
  }

  const formatConditionSummary = (rule: Rule): string => {
    const conditions = (rule.conditions as RuleCondition[]) || []
    if (conditions.length === 0) return 'No conditions'
    const first = conditions[0]
    const more = conditions.length > 1 ? ` +${conditions.length - 1} more` : ''
    return `${first.field} ${first.operator} ${JSON.stringify(first.value)}${more}`
  }

  const formatActionSummary = (rule: Rule): string => {
    const actions = (rule.actions as RuleAction[]) || []
    if (actions.length === 0) return 'No actions'
    const first = actions[0]
    const more = actions.length > 1 ? ` +${actions.length - 1} more` : ''
    return `${first.type}${more}`
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border border-black/10 dark:border-white/10 rounded-lg">
          <div className="text-sm text-black/60 dark:text-white/60">Total Rules</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="p-4 border border-black/10 dark:border-white/10 rounded-lg">
          <div className="text-sm text-black/60 dark:text-white/60">Active</div>
          <div className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
            {stats.active}
          </div>
        </div>
        <div className="p-4 border border-black/10 dark:border-white/10 rounded-lg">
          <div className="text-sm text-black/60 dark:text-white/60">Inactive</div>
          <div className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
            {stats.inactive}
          </div>
        </div>
        <div className="p-4 border border-black/10 dark:border-white/10 rounded-lg">
          <div className="text-sm text-black/60 dark:text-white/60">By Type</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <Badge
                key={type}
                className={ruleTypeColors[type as RuleType]}
              >
                {type}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as RuleType | 'all')}
            className="px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black text-sm"
          >
            <option value="all">All Types</option>
            <option value="conditional">Conditional</option>
            <option value="validation">Validation</option>
            <option value="document">Document</option>
            <option value="eligibility">Eligibility</option>
            <option value="calculation">Calculation</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-black/20 dark:border-white/20"
            />
            Show Inactive
          </label>
        </div>

        <Button onClick={onAddRule} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-black/10 dark:border-white/10 rounded-lg">
          <p className="text-black/60 dark:text-white/60 mb-4">
            {filterType !== 'all' || !showInactive
              ? 'No rules match your filters'
              : 'No rules yet'}
          </p>
          {filterType === 'all' && showInactive && (
            <Button onClick={onAddRule} variant="outline">
              Add your first rule
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(rulesByType).map(([type, typeRules]) => {
            const rules = typeRules as Rule[]
            return (
            <div key={type}>
              <h3 className="text-sm font-semibold text-black/70 dark:text-white/70 mb-3 flex items-center gap-2">
                <Badge className={ruleTypeColors[type as RuleType]}>
                  {ruleTypeLabels[type as RuleType]}
                </Badge>
                <span>({rules.length})</span>
              </h3>
              <div className="space-y-3">
                {rules
                  .sort((a: Rule, b: Rule) => (b.priority || 0) - (a.priority || 0))
                  .map((rule: Rule) => (
                    <div
                      key={rule.id}
                      className={`group p-4 border border-black/10 dark:border-white/10 rounded-lg hover:border-black/20 dark:hover:border-white/20 transition-colors bg-white dark:bg-black ${
                        !rule.is_active ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-black dark:text-white">
                              {rule.name}
                            </h4>
                            {!rule.is_active && (
                              <Badge
                                variant="outline"
                                className="text-xs text-red-600 dark:text-red-400"
                              >
                                Inactive
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              Priority: {rule.priority || 0}
                            </Badge>
                          </div>

                          {rule.description && (
                            <p className="text-sm text-black/60 dark:text-white/60 mb-3">
                              {rule.description}
                            </p>
                          )}

                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-black/60 dark:text-white/60">
                                Conditions:{' '}
                              </span>
                              <span className="text-black dark:text-white font-mono text-xs">
                                {formatConditionSummary(rule)}
                              </span>
                            </div>
                            <div>
                              <span className="text-black/60 dark:text-white/60">
                                Actions:{' '}
                              </span>
                              <span className="text-black dark:text-white font-mono text-xs">
                                {formatActionSummary(rule)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleRule(rule.id, !rule.is_active)}
                            title={rule.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {rule.is_active ? (
                              <Power className="h-4 w-4" />
                            ) : (
                              <PowerOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rule.id, rule.name)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
