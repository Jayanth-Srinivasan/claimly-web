'use server'

import {
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  togglePolicyActive,
} from '@/lib/supabase/policies'
import {
  bulkSetPolicyCoverageTypes,
  getPolicyCoverageTypesWithDetails,
} from '@/lib/supabase/policy-coverage-types'
import type { PolicyInsert, PolicyUpdate } from '@/types/policies'
import { revalidatePath } from 'next/cache'

export async function fetchPolicies() {
  return await getPolicies()
}

export async function addPolicy(policy: PolicyInsert) {
  const newPolicy = await createPolicy(policy)
  revalidatePath('/admin/policies')
  return newPolicy
}

export async function editPolicy(id: string, updates: PolicyUpdate) {
  const updated = await updatePolicy(id, updates)
  revalidatePath('/admin/policies')
  return updated
}

export async function removePolicy(id: string) {
  await deletePolicy(id)
  revalidatePath('/admin/policies')
}

export async function togglePolicy(id: string, isActive: boolean) {
  const updated = await togglePolicyActive(id, isActive)
  revalidatePath('/admin/policies')
  return updated
}

/**
 * Add coverage types to a policy
 */
export async function addPolicyCoverages(
  policyId: string,
  coverages: Array<{
    coverage_type_id: string
    coverage_limit: number
    deductible: number
    is_optional: boolean
    additional_premium: number
  }>
) {
  await bulkSetPolicyCoverageTypes(policyId, coverages)
  revalidatePath('/admin/policies')
}

/**
 * Update coverage types for a policy
 */
export async function updatePolicyCoverages(
  policyId: string,
  coverages: Array<{
    coverage_type_id: string
    coverage_limit: number
    deductible: number
    is_optional: boolean
    additional_premium: number
  }>
) {
  await bulkSetPolicyCoverageTypes(policyId, coverages)
  revalidatePath('/admin/policies')
}

/**
 * Fetch policy coverages with details
 */
export async function fetchPolicyCoverages(policyId: string) {
  return await getPolicyCoverageTypesWithDetails(policyId)
}
