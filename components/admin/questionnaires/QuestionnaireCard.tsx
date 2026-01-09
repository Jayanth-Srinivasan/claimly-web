'use client'

import { Edit, Trash2, ToggleLeft, ToggleRight, ClipboardList, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Questionnaire, ClaimType } from '@/types/policies'

interface QuestionnaireCardProps {
  questionnaire: Questionnaire
  questionCount: number
  onView: () => void
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}

const claimTypeLabels: Record<ClaimType, string> = {
  travel: 'Travel',
  medical: 'Medical',
  baggage: 'Baggage',
  flight: 'Flight',
}

const claimTypeColors: Record<ClaimType, string> = {
  travel: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  baggage: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  flight: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

export function QuestionnaireCard({
  questionnaire,
  questionCount,
  onView,
  onEdit,
  onToggleActive,
  onDelete,
}: QuestionnaireCardProps) {
  return (
    <div className="border border-black/10 dark:border-white/10 rounded-lg p-4 hover:border-black/20 dark:hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-black/5 dark:bg-white/5">
              <ClipboardList className="h-5 w-5 text-black dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-black dark:text-white truncate">
                  {questionnaire.name}
                </h3>
                <Badge className={claimTypeColors[questionnaire.claim_type]}>
                  {claimTypeLabels[questionnaire.claim_type]}
                </Badge>
                <Badge
                  variant={questionnaire.is_active ? 'default' : 'secondary'}
                  className={
                    questionnaire.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60'
                  }
                >
                  {questionnaire.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {questionnaire.description && (
                <p className="text-sm text-black/60 dark:text-white/60 mt-1 line-clamp-2">
                  {questionnaire.description}
                </p>
              )}
            </div>
          </div>

          {/* Question Count */}
          <div className="flex items-center gap-4 mt-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
              {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-3 text-xs text-black/40 dark:text-white/40">
            <span>
              Created {new Date(questionnaire.created_at).toLocaleDateString()}
            </span>
            {questionnaire.updated_at !== questionnaire.created_at && (
              <span>
                Updated {new Date(questionnaire.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onView}
            title="View Questions"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleActive}
            title={questionnaire.is_active ? 'Deactivate' : 'Activate'}
          >
            {questionnaire.is_active ? (
              <ToggleRight className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title="Delete"
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
