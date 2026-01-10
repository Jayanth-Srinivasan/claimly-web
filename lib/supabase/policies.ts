import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { Database, Json } from '@/types/database'
import type {
  Policy,
  PolicyInsert,
  PolicyUpdate,
  PolicyWithCoverageTypes,
} from '@/types/policies'
import { getPolicyCoverageTypesWithDetails } from './policy-coverage-types'

/**
 * Get all policies
 */
export async function getPolicies(): Promise<Policy[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching policies:', error)
    throw new Error('Failed to fetch policies')
  }

  return (data || []) as Policy[]
}

/**
 * Get a single policy by ID
 */
export async function getPolicy(id: string): Promise<Policy | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching policy:', error)
    return null
  }

  return data as Policy
}

/**
 * Create a new policy
 */
export async function createPolicy(policy: PolicyInsert): Promise<Policy> {
  const supabase = await createClient()

  const insertData: Database['public']['Tables']['policies']['Insert'] = {
    name: policy.name,
    description: policy.description ?? null,
    coverage_items: policy.coverage_items as unknown as Json,
    deductible: policy.deductible ?? null,
    premium: policy.premium ?? null,
    currency: policy.currency ?? null,
    premium_frequency: policy.premium_frequency ?? null,
    policy_term_months: policy.policy_term_months ?? null,
    exclusions: policy.exclusions ?? [],
    is_active: policy.is_active ?? true,
  }

  const data = await insertOne(supabase, 'policies', insertData)
  return data as unknown as Policy
}

/**
 * Update an existing policy
 */
export async function updatePolicy(id: string, updates: PolicyUpdate): Promise<Policy> {
  const supabase = await createClient()

  const updateData: Database['public']['Tables']['policies']['Update'] = {
    name: updates.name,
    description: updates.description,
    coverage_items: updates.coverage_items as unknown as Json | undefined,
    deductible: updates.deductible,
    premium: updates.premium,
    currency: updates.currency,
    premium_frequency: updates.premium_frequency,
    policy_term_months: updates.policy_term_months,
    exclusions: updates.exclusions,
    is_active: updates.is_active,
  }

  const data = await updateOne(supabase, 'policies', id, updateData)
  return data as unknown as Policy
}

/**
 * Delete a policy
 */
export async function deletePolicy(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('policies')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting policy:', error)
    throw new Error('Failed to delete policy')
  }
}

/**
 * Toggle policy active status
 */
export async function togglePolicyActive(id: string, isActive: boolean): Promise<Policy> {
  return updatePolicy(id, { is_active: isActive })
}

// ========== NEW: Policy Coverage Types Integration ==========

/**
 * Get policy with all coverage type details (NEW - uses junction table)
 */
export async function getPolicyWithCoverageTypes(
  id: string
): Promise<PolicyWithCoverageTypes | null> {
  const supabase = await createClient()

  // Get base policy data
  const { data: policyData, error: policyError } = await supabase
    .from('policies')
    .select('*')
    .eq('id', id)
    .single()

  if (policyError) {
    console.error('Error fetching policy:', policyError)
    return null
  }

  // Get coverage types with details
  const policyCoverageTypes = await getPolicyCoverageTypesWithDetails(id)

  // Transform to PolicyWithCoverageTypes format
  const policy = policyData as unknown as Omit<Policy, 'coverage_items'>

  return {
    ...policy,
    policy_coverage_types: policyCoverageTypes,
  } as unknown as PolicyWithCoverageTypes
}

/**
 * Get all policies with coverage types (NEW - uses junction table)
 */
export async function getPoliciesWithCoverageTypes(): Promise<PolicyWithCoverageTypes[]> {
  const supabase = await createClient()

  // Get all policies
  const { data: policiesData, error: policiesError } = await supabase
    .from('policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (policiesError) {
    console.error('Error fetching policies:', policiesError)
    throw new Error('Failed to fetch policies')
  }

  // Get coverage types for each policy
  const policiesWithCoverage = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (policiesData || []).map(async (policy: any) => {
      const policyCoverageTypes = await getPolicyCoverageTypesWithDetails(policy.id)

      return {
        ...policy,
        policy_coverage_types: policyCoverageTypes,
      } as unknown as PolicyWithCoverageTypes
    })
  )

  return policiesWithCoverage
}

/**
 * Get active policies with coverage types
 */
export async function getActivePoliciesWithCoverageTypes(): Promise<PolicyWithCoverageTypes[]> {
  const supabase = await createClient()

  const { data: policiesData, error: policiesError } = await supabase
    .from('policies')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (policiesError) {
    console.error('Error fetching active policies:', policiesError)
    throw new Error('Failed to fetch active policies')
  }

  const policiesWithCoverage = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (policiesData || []).map(async (policy: any) => {
      const policyCoverageTypes = await getPolicyCoverageTypesWithDetails(policy.id)

      return {
        ...policy,
        policy_coverage_types: policyCoverageTypes,
      } as unknown as PolicyWithCoverageTypes
    })
  )

  return policiesWithCoverage
}

/**
 * Get policies that include a specific coverage type
 */
export async function getPoliciesByCoverageType(coverageTypeId: string): Promise<Policy[]> {
  const supabase = await createClient()

  // Get policy IDs that have this coverage type
  const { data: policyIds, error: policyIdsError } = await supabase
    .from('policy_coverage_types')
    .select('policy_id')
    .eq('coverage_type_id', coverageTypeId)

  if (policyIdsError) {
    console.error('Error fetching policy IDs:', policyIdsError)
    throw new Error('Failed to fetch policies by coverage type')
  }

  if (!policyIds || policyIds.length === 0) {
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniquePolicyIds = [...new Set(policyIds.map((p: any) => p.policy_id))]

  // Get the actual policies
  const { data: policies, error: policiesError } = await supabase
    .from('policies')
    .select('*')
    .in('id', uniquePolicyIds)
    .order('created_at', { ascending: false })

  if (policiesError) {
    console.error('Error fetching policies:', policiesError)
    throw new Error('Failed to fetch policies')
  }

  return (policies || []) as Policy[]
}

/**
 * Search policies by name, description, or coverage type
 */
export async function searchPolicies(query: string): Promise<Policy[]> {
  const supabase = await createClient()

  // Search by name or description
  const { data: policies, error } = await supabase
    .from('policies')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error searching policies:', error)
    throw new Error('Failed to search policies')
  }

  // Also search by coverage type name
  const { data: coverageTypes, error: coverageError } = await supabase
    .from('coverage_types')
    .select('id')
    .ilike('name', `%${query}%`)

  if (!coverageError && coverageTypes && coverageTypes.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coverageTypeIds = coverageTypes.map((ct: any) => ct.id)

    const { data: policyCoverages, error: pcError } = await supabase
      .from('policy_coverage_types')
      .select('policy_id')
      .in('coverage_type_id', coverageTypeIds)

    if (!pcError && policyCoverages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const additionalPolicyIds = policyCoverages.map((pc: any) => pc.policy_id)

      const { data: additionalPolicies, error: additionalError } = await supabase
        .from('policies')
        .select('*')
        .in('id', additionalPolicyIds)

      if (!additionalError && additionalPolicies) {
        // Merge and deduplicate
        const allPolicies = [...(policies || []), ...additionalPolicies]
        const uniquePolicies = Array.from(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new Map(allPolicies.map((p: any) => [p.id, p])).values()
        )

        return uniquePolicies as Policy[]
      }
    }
  }

  return (policies || []) as Policy[]
}

/**
 * Get policy statistics
 */
export async function getPolicyStats(): Promise<{
  total: number
  active: number
  inactive: number
  totalCoverageTypes: number
  averageCoveragePerPolicy: number
}> {
  const supabase = await createClient()

  const { data: policies, error } = await supabase.from('policies').select('id, is_active')

  if (error) {
    console.error('Error fetching policy stats:', error)
    throw new Error('Failed to fetch policy statistics')
  }

  const { data: policyCoverages, error: coverageError } = await supabase
    .from('policy_coverage_types')
    .select('*')

  if (coverageError) {
    console.error('Error fetching coverage stats:', coverageError)
  }

  const total = (policies || []).length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = (policies || []).filter((p: any) => p.is_active).length

  return {
    total,
    active,
    inactive: total - active,
    totalCoverageTypes: (policyCoverages || []).length,
    averageCoveragePerPolicy: total > 0 ? (policyCoverages || []).length / total : 0,
  }
}
