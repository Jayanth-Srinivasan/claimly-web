'use client'

import { useState } from 'react'
import { Plus, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { CoverageType } from '@/types/policies'

export interface SelectedCoverage {
  coverage_type_id: string
  coverage_limit: number
  deductible: number
  is_optional: boolean
  additional_premium: number
}

interface CoverageTypeSelectorProps {
  coverageTypes: CoverageType[]
  selectedCoverages: SelectedCoverage[]
  onChange: (coverages: SelectedCoverage[]) => void
  error?: string
}

const categoryColors: Record<string, string> = {
  medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  travel: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  flight: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  business: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  property: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  liability: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export function CoverageTypeSelector({
  coverageTypes,
  selectedCoverages,
  onChange,
  error,
}: CoverageTypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Get active coverage types only
  const activeCoverageTypes = coverageTypes.filter((ct) => ct.is_active)

  // Filter available coverage types
  const availableCoverageTypes = activeCoverageTypes.filter((ct) => {
    const matchesSearch =
      ct.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ct.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' || ct.category === selectedCategory

    const notSelected = !selectedCoverages.some((sc) => sc.coverage_type_id === ct.id)

    return matchesSearch && matchesCategory && notSelected
  })

  // Get unique categories
  const categories = ['all', ...new Set(activeCoverageTypes.map((ct) => ct.category).filter(Boolean))]

  const addCoverage = (coverageType: CoverageType) => {
    const newCoverage: SelectedCoverage = {
      coverage_type_id: coverageType.id,
      coverage_limit: 0,
      deductible: 0,
      is_optional: false,
      additional_premium: 0,
    }
    onChange([...selectedCoverages, newCoverage])
    setSearchQuery('')
  }

  const removeCoverage = (coverageTypeId: string) => {
    onChange(selectedCoverages.filter((sc) => sc.coverage_type_id !== coverageTypeId))
  }

  const updateCoverage = (coverageTypeId: string, updates: Partial<SelectedCoverage>) => {
    onChange(
      selectedCoverages.map((sc) =>
        sc.coverage_type_id === coverageTypeId ? { ...sc, ...updates } : sc
      )
    )
  }

  const getCoverageType = (id: string): CoverageType | undefined => {
    return activeCoverageTypes.find((ct) => ct.id === id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">
          Coverage Types <span className="text-red-500">*</span>
        </Label>
        <span className="text-xs text-black/60 dark:text-white/60">
          {selectedCoverages.length} selected
        </span>
      </div>

      {/* Selected Coverages */}
      {selectedCoverages.length > 0 && (
        <div className="space-y-3 p-4 border border-black/10 dark:border-white/10 rounded-lg bg-black/5 dark:bg-white/5">
          {selectedCoverages.map((coverage) => {
            const coverageType = getCoverageType(coverage.coverage_type_id)
            if (!coverageType) return null

            return (
              <div
                key={coverage.coverage_type_id}
                className="p-4 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-black dark:text-white">
                        {coverageType.name}
                      </h4>
                      {coverageType.category && (
                        <Badge className={categoryColors[coverageType.category]}>
                          {coverageType.category}
                        </Badge>
                      )}
                    </div>
                    {coverageType.description && (
                      <p className="text-xs text-black/60 dark:text-white/60">
                        {coverageType.description}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCoverage(coverage.coverage_type_id)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Coverage Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Coverage Limit ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={coverage.coverage_limit || ''}
                      onChange={(e) =>
                        updateCoverage(coverage.coverage_type_id, {
                          coverage_limit: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Deductible ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={coverage.deductible || ''}
                      onChange={(e) =>
                        updateCoverage(coverage.coverage_type_id, {
                          deductible: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Additional Premium ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={coverage.additional_premium || ''}
                      onChange={(e) =>
                        updateCoverage(coverage.coverage_type_id, {
                          additional_premium: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1 flex items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`optional-${coverage.coverage_type_id}`}
                        checked={coverage.is_optional}
                        onChange={(e) =>
                          updateCoverage(coverage.coverage_type_id, {
                            is_optional: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-black/20 dark:border-white/20"
                      />
                      <Label
                        htmlFor={`optional-${coverage.coverage_type_id}`}
                        className="text-xs cursor-pointer"
                      >
                        Optional Coverage
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Add Coverage */}
      <div className="border border-dashed border-black/10 dark:border-white/10 rounded-lg p-4">
        <Label className="text-sm font-medium mb-3 block">Add Coverage Types</Label>

        {/* Search and Filter */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
            <Input
              placeholder="Search coverage types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black text-sm"
          >
            {categories.map((category) => (
              <option key={category || 'none'} value={category || ''}>
                {category === 'all' ? 'All Categories' : (category || 'Uncategorized')}
              </option>
            ))}
          </select>
        </div>

        {/* Available Coverage Types */}
        {availableCoverageTypes.length === 0 ? (
          <div className="text-center py-6 text-sm text-black/60 dark:text-white/60">
            {searchQuery || selectedCategory !== 'all'
              ? 'No coverage types match your filters'
              : 'All available coverage types have been added'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
            {availableCoverageTypes.map((coverageType) => (
              <button
                key={coverageType.id}
                type="button"
                onClick={() => addCoverage(coverageType)}
                className="flex items-start gap-3 p-3 text-left border border-black/10 dark:border-white/10 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Plus className="h-4 w-4 mt-0.5 text-black/60 dark:text-white/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-black dark:text-white">
                      {coverageType.name}
                    </span>
                    {coverageType.category && (
                      <Badge variant="outline" className="text-xs">
                        {coverageType.category}
                      </Badge>
                    )}
                  </div>
                  {coverageType.description && (
                    <p className="text-xs text-black/60 dark:text-white/60 line-clamp-1">
                      {coverageType.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
