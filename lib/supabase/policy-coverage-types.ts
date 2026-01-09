import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type {
  PolicyCoverageType,
  PolicyCoverageTypeInsert,
  PolicyCoverageTypeUpdate,
  CoverageType,
} from '@/types/policies'

/**
 * Get all coverage types for a policy
 */
export async function getPolicyCoverageTypes(policyId: string): Promise<PolicyCoverageType[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('policy_coverage_types')
    .select('*')
    .eq('policy_id', policyId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch policy coverage types: ${error.message}`)
  }

  return (data as unknown as PolicyCoverageType[]) || []
}

/**
 * Get policy coverage types with full coverage type details
 */
export async function getPolicyCoverageTypesWithDetails(policyId: string): Promise<
  Array<
    PolicyCoverageType & {
      coverage_type: CoverageType
    }
  >
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('policy_coverage_types')
    .select(
      `
      *,
      coverage_type:coverage_types (*)
    `
    )
    .eq('policy_id', policyId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch policy coverage types with details: ${error.message}`)
  }

  return data as unknown as Array<PolicyCoverageType & { coverage_type: CoverageType }>
}

/**
 * Get all policies using a specific coverage type
 */
export async function getPoliciesByCoverageType(coverageTypeId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('policy_coverage_types')
    .select('policy_id')
    .eq('coverage_type_id', coverageTypeId)

  if (error) {
    throw new Error(`Failed to fetch policies by coverage type: ${error.message}`)
  }

  return data.map((row) => row.policy_id)
}

/**
 * Get a specific policy-coverage type relationship
 */
export async function getPolicyCoverageType(
  policyId: string,
  coverageTypeId: string
): Promise<PolicyCoverageType | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('policy_coverage_types')
    .select('*')
    .eq('policy_id', policyId)
    .eq('coverage_type_id', coverageTypeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch policy coverage type: ${error.message}`)
  }

  return data as unknown as PolicyCoverageType
}

/**
 * Create a new policy-coverage type relationship
 */
export async function createPolicyCoverageType(
  policyCoverageType: PolicyCoverageTypeInsert
): Promise<PolicyCoverageType> {
  const supabase = await createClient()

  const insertData: typeof supabase.from<'policy_coverage_types'>['insert']['arguments'] = {
    policy_id: policyCoverageType.policy_id,
    coverage_type_id: policyCoverageType.coverage_type_id,
    coverage_limit: policyCoverageType.coverage_limit ?? null,
    deductible: policyCoverageType.deductible ?? null,
    is_optional: policyCoverageType.is_optional ?? false,
    additional_premium: policyCoverageType.additional_premium ?? 0,
  }

  const data = await insertOne(supabase, 'policy_coverage_types', insertData)
  return data as unknown as PolicyCoverageType
}

/**
 * Update a policy-coverage type relationship
 */
export async function updatePolicyCoverageType(
  id: string,
  updates: PolicyCoverageTypeUpdate
): Promise<PolicyCoverageType> {
  const supabase = await createClient()

  const updateData: typeof supabase.from<'policy_coverage_types'>['update']['arguments'] = {}

  if (updates.coverage_limit !== undefined) updateData.coverage_limit = updates.coverage_limit
  if (updates.deductible !== undefined) updateData.deductible = updates.deductible
  if (updates.is_optional !== undefined) updateData.is_optional = updates.is_optional
  if (updates.additional_premium !== undefined)
    updateData.additional_premium = updates.additional_premium

  const data = await updateOne(supabase, 'policy_coverage_types', id, updateData)
  return data as unknown as PolicyCoverageType
}

/**
 * Delete a policy-coverage type relationship
 */
export async function deletePolicyCoverageType(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('policy_coverage_types').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete policy coverage type: ${error.message}`)
  }
}

/**
 * Remove a coverage type from a policy
 */
export async function removeCoverageTypeFromPolicy(
  policyId: string,
  coverageTypeId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('policy_coverage_types')
    .delete()
    .eq('policy_id', policyId)
    .eq('coverage_type_id', coverageTypeId)

  if (error) {
    throw new Error(`Failed to remove coverage type from policy: ${error.message}`)
  }
}

/**
 * Bulk set policy coverage types (replaces all existing coverage types for a policy)
 */
export async function bulkSetPolicyCoverageTypes(
  policyId: string,
  coverageTypes: Array<Omit<PolicyCoverageTypeInsert, 'policy_id'>>
): Promise<void> {
  const supabase = await createClient()

  // Delete all existing coverage types for this policy
  const { error: deleteError } = await supabase
    .from('policy_coverage_types')
    .delete()
    .eq('policy_id', policyId)

  if (deleteError) {
    throw new Error(`Failed to clear existing coverage types: ${deleteError.message}`)
  }

  // Insert new coverage types
  if (coverageTypes.length > 0) {
    const insertData = coverageTypes.map((ct) => ({
      policy_id: policyId,
      coverage_type_id: ct.coverage_type_id,
      coverage_limit: ct.coverage_limit ?? null,
      deductible: ct.deductible ?? null,
      is_optional: ct.is_optional ?? false,
      additional_premium: ct.additional_premium ?? 0,
    }))

    const { error: insertError } = await supabase
      .from('policy_coverage_types')
      .insert(insertData)

    if (insertError) {
      throw new Error(`Failed to insert new coverage types: ${insertError.message}`)
    }
  }
}

/**
 * Add multiple coverage types to a policy
 */
export async function addCoverageTypesToPolicy(
  policyId: string,
  coverageTypes: Array<Omit<PolicyCoverageTypeInsert, 'policy_id'>>
): Promise<PolicyCoverageType[]> {
  const supabase = await createClient()

  const insertData = coverageTypes.map((ct) => ({
    policy_id: policyId,
    coverage_type_id: ct.coverage_type_id,
    coverage_limit: ct.coverage_limit ?? null,
    deductible: ct.deductible ?? null,
    is_optional: ct.is_optional ?? false,
    additional_premium: ct.additional_premium ?? 0,
  }))

  const { data, error } = await supabase
    .from('policy_coverage_types')
    .insert(insertData)
    .select()

  if (error) {
    throw new Error(`Failed to add coverage types to policy: ${error.message}`)
  }

  return (data as unknown as PolicyCoverageType[]) || []
}

/**
 * Get optional coverage types for a policy
 */
export async function getOptionalCoverageTypes(policyId: string): Promise<PolicyCoverageType[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('policy_coverage_types')
    .select('*')
    .eq('policy_id', policyId)
    .eq('is_optional', true)

  if (error) {
    throw new Error(`Failed to fetch optional coverage types: ${error.message}`)
  }

  return (data as unknown as PolicyCoverageType[]) || []
}

/**
 * Get required coverage types for a policy
 */
export async function getRequiredCoverageTypes(policyId: string): Promise<PolicyCoverageType[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('policy_coverage_types')
    .select('*')
    .eq('policy_id', policyId)
    .eq('is_optional', false)

  if (error) {
    throw new Error(`Failed to fetch required coverage types: ${error.message}`)
  }

  return (data as unknown as PolicyCoverageType[]) || []
}

/**
 * Calculate total coverage limits for a policy
 */
export async function calculatePolicyCoverageLimits(policyId: string): Promise<{
  totalLimit: number
  totalAdditionalPremium: number
  coverageCount: number
  requiredCount: number
  optionalCount: number
}> {
  const coverageTypes = await getPolicyCoverageTypes(policyId)

  return {
    totalLimit: coverageTypes.reduce((sum, ct) => sum + (ct.coverage_limit || 0), 0),
    totalAdditionalPremium: coverageTypes.reduce((sum, ct) => sum + ct.additional_premium, 0),
    coverageCount: coverageTypes.length,
    requiredCount: coverageTypes.filter((ct) => !ct.is_optional).length,
    optionalCount: coverageTypes.filter((ct) => ct.is_optional).length,
  }
}

/**
 * Check if a policy has a specific coverage type
 */
export async function policyHasCoverageType(
  policyId: string,
  coverageTypeId: string
): Promise<boolean> {
  const policyCoverageType = await getPolicyCoverageType(policyId, coverageTypeId)
  return policyCoverageType !== null
}

/**
 * Get coverage types not yet added to a policy
 */
export async function getAvailableCoverageTypesForPolicy(
  policyId: string
): Promise<CoverageType[]> {
  const supabase = await createClient()

  // Get all active coverage types
  const { data: allCoverageTypes, error: coverageError } = await supabase
    .from('coverage_types')
    .select('*')
    .eq('is_active', true)

  if (coverageError) {
    throw new Error(`Failed to fetch coverage types: ${coverageError.message}`)
  }

  // Get coverage types already added to this policy
  const existingCoverageTypes = await getPolicyCoverageTypes(policyId)
  const existingIds = new Set(existingCoverageTypes.map((ct) => ct.coverage_type_id))

  // Filter out already added coverage types
  const availableCoverageTypes = (allCoverageTypes || []).filter(
    (ct) => !existingIds.has(ct.id)
  )

  return availableCoverageTypes as unknown as CoverageType[]
}
