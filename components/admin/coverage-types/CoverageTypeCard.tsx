'use client'

import { Edit2, Trash2, Eye, EyeOff, ArrowRight } from 'lucide-react'
import type { CoverageType } from '@/types/policies'

interface CoverageTypeCardProps {
  coverageType: CoverageType
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onToggle: (isActive: boolean) => void
}

export function CoverageTypeCard({
  coverageType,
  onView,
  onEdit,
  onDelete,
  onToggle,
}: CoverageTypeCardProps) {
  const categoryColors: Record<string, string> = {
    medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    travel: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    flight: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    business: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    property: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    liability: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const categoryColor = categoryColors[coverageType.category || 'other'] || categoryColors.other

  return (
    <div
      className={`border rounded-lg p-4 bg-card hover:shadow-md transition-shadow ${
        !coverageType.is_active ? 'opacity-60' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{coverageType.name}</h3>
            {!coverageType.is_active && (
              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                Inactive
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{coverageType.slug}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => onToggle(!coverageType.is_active)}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            title={coverageType.is_active ? 'Deactivate' : 'Activate'}
          >
            {coverageType.is_active ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {coverageType.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {coverageType.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        {/* Category Badge */}
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${categoryColor}`}
        >
          {coverageType.category || 'other'}
        </span>

        {/* Display Order */}
        <span className="text-xs text-muted-foreground">Order: {coverageType.display_order}</span>
      </div>

      {/* View Button */}
      <button
        onClick={onView}
        className="w-full mt-3 py-2 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        View Details & Rules
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Icon Display (if present) */}
      {coverageType.icon && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-1">Icon:</div>
          <div className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
            {coverageType.icon}
          </div>
        </div>
      )}
    </div>
  )
}
