'use client'

import { useState } from 'react'
import { Plus, FileText, Search } from 'lucide-react'
import { TopBar } from '../TopBar'
import { PolicyCard } from './PolicyCard'
import { PolicyDialog } from './PolicyDialog'
import type { SelectedCoverage } from './CoverageTypeSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addPolicy,
  editPolicy,
  removePolicy,
  togglePolicy,
  addPolicyCoverages,
  updatePolicyCoverages,
} from '@/app/admin/policies/actions'
import type { Profile } from '@/types/auth'
import type { Policy, PolicyInsert, CoverageType } from '@/types/policies'

interface PoliciesPageProps {
  profile: Profile
  initialPolicies: Policy[]
  coverageTypes: CoverageType[]
  policyCoveragesMap: Map<string, SelectedCoverage[]>
}

export function PoliciesPage({ profile, initialPolicies, coverageTypes, policyCoveragesMap }: PoliciesPageProps) {
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies)
  const [policyCoverages, setPolicyCoverages] = useState<Map<string, SelectedCoverage[]>>(policyCoveragesMap)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)

  const filteredPolicies = policies.filter(
    (policy) =>
      policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (policy.coverage_items?.some((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) ?? false)
  )

  const handleCreatePolicy = async (data: PolicyInsert, coverages: SelectedCoverage[]) => {
    try {
      const newPolicy = await addPolicy(data)
      if (coverages.length > 0) {
        await addPolicyCoverages(newPolicy.id, coverages)
        setPolicyCoverages(new Map(policyCoverages.set(newPolicy.id, coverages)))
      }
      setPolicies([newPolicy, ...policies])
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Failed to create policy:', error)
      alert('Failed to create policy. Please try again.')
    }
  }

  const handleUpdatePolicy = async (id: string, data: Partial<Policy>, coverages: SelectedCoverage[]) => {
    try {
      const updated = await editPolicy(id, data)
      if (coverages.length > 0) {
        await updatePolicyCoverages(id, coverages)
        setPolicyCoverages(new Map(policyCoverages.set(id, coverages)))
      }
      setPolicies(
        policies.map((policy) =>
          policy.id === id ? updated : policy
        )
      )
      setEditingPolicy(null)
    } catch (error) {
      console.error('Failed to update policy:', error)
      alert('Failed to update policy. Please try again.')
    }
  }

  const handleToggleActive = async (id: string) => {
    const policy = policies.find((p) => p.id === id)
    if (!policy) return

    try {
      const updated = await togglePolicy(id, !policy.is_active)
      setPolicies(
        policies.map((p) =>
          p.id === id ? updated : p
        )
      )
    } catch (error) {
      console.error('Failed to toggle policy:', error)
      alert('Failed to toggle policy status. Please try again.')
    }
  }

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) {
      return
    }

    try {
      await removePolicy(id)
      setPolicies(policies.filter((policy) => policy.id !== id))
    } catch (error) {
      console.error('Failed to delete policy:', error)
      alert('Failed to delete policy. Please try again.')
    }
  }

  const stats = {
    total: policies.length,
    active: policies.filter((p) => p.is_active).length,
    inactive: policies.filter((p) => !p.is_active).length,
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black overflow-hidden">
      <TopBar profile={profile} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-480 mx-auto p-4 md:p-6 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white">
                  Insurance Policies
                </h1>
                <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                  Manage insurance policies and coverage options
                </p>
              </div>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Policy
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="border border-black/10 dark:border-white/10 rounded-xl p-4">
                <p className="text-sm text-black/60 dark:text-white/60">
                  Total Policies
                </p>
                <p className="text-2xl font-bold text-black dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="border border-black/10 dark:border-white/10 rounded-xl p-4">
                <p className="text-sm text-black/60 dark:text-white/60">
                  Active
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="border border-black/10 dark:border-white/10 rounded-xl p-4">
                <p className="text-sm text-black/60 dark:text-white/60">
                  Inactive
                </p>
                <p className="text-2xl font-bold text-black/40 dark:text-white/40 mt-1">
                  {stats.inactive}
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-black">
            <div className="p-6">
              {filteredPolicies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-black/20 dark:text-white/20 mb-3" />
                  <p className="text-black/60 dark:text-white/60">
                    {searchQuery
                      ? 'No policies match your search'
                      : 'No policies yet'}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      variant="outline"
                      className="mt-4"
                    >
                      Add your first policy
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPolicies.map((policy) => (
                    <PolicyCard
                      key={policy.id}
                      policy={policy}
                      coverageTypes={coverageTypes}
                      policyCoverages={policyCoverages.get(policy.id) || []}
                      onEdit={() => setEditingPolicy(policy)}
                      onToggleActive={() => handleToggleActive(policy.id)}
                      onDelete={() => handleDeletePolicy(policy.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PolicyDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        coverageTypes={coverageTypes}
        onSubmit={handleCreatePolicy}
      />

      {editingPolicy && (
        <PolicyDialog
          open={true}
          onOpenChange={(open) => !open && setEditingPolicy(null)}
          policy={editingPolicy}
          coverageTypes={coverageTypes}
          policyCoverages={policyCoverages.get(editingPolicy.id) || []}
          onSubmit={(data, coverages) => handleUpdatePolicy(editingPolicy.id, data, coverages)}
        />
      )}
    </div>
  )
}
