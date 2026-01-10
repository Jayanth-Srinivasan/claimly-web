'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { CoverageType, CoverageTypeInsert } from '@/types/policies'

interface CoverageTypeDialogProps {
  coverageType: CoverageType | null
  onClose: () => void
  onSave: (coverageType: CoverageType) => void
}

export function CoverageTypeDialog({
  coverageType,
  onClose,
  onSave,
}: CoverageTypeDialogProps) {
  const isEdit = !!coverageType

  const [formData, setFormData] = useState<CoverageTypeInsert>({
    name: '',
    slug: '',
    description: '',
    category: 'other',
    icon: '',
    is_active: true,
    display_order: 0,
    metadata: {},
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (coverageType) {
      setFormData({
        name: coverageType.name,
        slug: coverageType.slug,
        description: coverageType.description || '',
        category: coverageType.category || 'other',
        icon: coverageType.icon || '',
        is_active: coverageType.is_active,
        display_order: coverageType.display_order,
        metadata: coverageType.metadata,
      })
    }
  }, [coverageType])

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      // Only auto-generate slug if not editing or if slug is empty
      if (!isEdit || !prev.slug) {
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        return { ...prev, name, slug }
      }
      return { ...prev, name }
    })
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required'
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // TODO: Call server action
      const savedCoverageType: CoverageType = {
        id: coverageType?.id || `ct-${Date.now()}`,
        ...formData,
        description: formData.description || null,
        category: formData.category || null,
        icon: formData.icon || null,
        metadata: formData.metadata || {},
        is_active: formData.is_active ?? true,
        display_order: formData.display_order ?? 0,
        created_at: coverageType?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onSave(savedCoverageType)
    } catch (error) {
      console.error('Error saving coverage type:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-background">
          <h2 className="text-xl font-semibold">
            {isEdit ? 'Edit Coverage Type' : 'New Coverage Type'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Medical Emergency"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Slug <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., medical-emergency"
            />
            {errors.slug && (
              <p className="text-sm text-destructive mt-1">{errors.slug}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Unique identifier (lowercase letters, numbers, and hyphens only)
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Describe this coverage type..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <select
              value={formData.category || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="medical">Medical</option>
              <option value="travel">Travel</option>
              <option value="flight">Flight</option>
              <option value="business">Business</option>
              <option value="property">Property</option>
              <option value="liability">Liability</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Icon</label>
            <input
              type="text"
              value={formData.icon || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, icon: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., medical-bag, plane, briefcase"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Icon identifier for UI display
            </p>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  display_order: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower numbers appear first
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
              Active
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
