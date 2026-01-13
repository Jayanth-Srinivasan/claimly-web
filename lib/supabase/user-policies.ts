import { createClient } from './server'
import type {
  UserPolicy,
  UserPolicyInsert,
  UserPolicyUpdate,
  UserPolicyWithPolicy,
  CoverageItem,
} from '@/types/user-policies'

/**
 * Get all policies for a specific user
 */
export async function getUserPolicies(userId: string): Promise<UserPolicy[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_policies')
    .select('*')
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch user policies: ${error.message}`)
  return (data || []) as UserPolicy[]
}

/**
 * Get active policies for a user
 */
export async function getActiveUserPolicies(userId: string): Promise<UserPolicy[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch active user policies: ${error.message}`)
  return (data || []) as UserPolicy[]
}

/**
 * Get user policies with policy details
 */
export async function getUserPoliciesWithDetails(
  userId: string
): Promise<UserPolicyWithPolicy[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_policies')
    .select(`
      *,
      policy:policies (
        id,
        name,
        description,
        deductible,
        premium,
        exclusions
      )
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch user policies with details: ${error.message}`)
  return (data || []) as UserPolicyWithPolicy[]
}

/**
 * Enroll user in a policy
 */
export async function enrollUserInPolicy(data: UserPolicyInsert): Promise<UserPolicy> {
  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('user_policies')
    .insert({
      user_id: data.user_id,
      policy_id: data.policy_id,
      policy_name: data.policy_name,
      enrolled_at: data.enrolled_at || new Date().toISOString(),
      expires_at: data.expires_at || null,
      coverage_items: data.coverage_items,
      total_premium: data.total_premium || null,
      currency: data.currency || 'USD',
      is_active: data.is_active ?? true,
      status: data.status || 'active',
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to enroll user in policy: ${error.message}`)
  return result as UserPolicy
}

/**
 * Update user policy (e.g., update used limits)
 */
export async function updateUserPolicy(
  id: string,
  updates: UserPolicyUpdate
): Promise<UserPolicy> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_policies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update user policy: ${error.message}`)
  return data as UserPolicy
}

/**
 * Update coverage item usage (increment used_limit)
 */
export async function updateCoverageUsage(
  userPolicyId: string,
  coverageName: string,
  usedAmount: number
): Promise<UserPolicy> {
  const supabase = await createClient()

  // Fetch current policy
  const { data: currentPolicy, error: fetchError } = await supabase
    .from('user_policies')
    .select('coverage_items')
    .eq('id', userPolicyId)
    .single()

  if (fetchError) throw new Error(`Failed to fetch policy: ${fetchError.message}`)

  // Update the specific coverage item
  const coverageItems = currentPolicy.coverage_items as CoverageItem[]
  const updatedItems = coverageItems.map((item) => {
    if (item.name === coverageName) {
      return {
        ...item,
        used_limit: item.used_limit + usedAmount,
      }
    }
    return item
  })

  // Save updated coverage items
  return updateUserPolicy(userPolicyId, { coverage_items: updatedItems })
}

/**
 * Cancel/deactivate a user policy
 */
export async function cancelUserPolicy(id: string): Promise<UserPolicy> {
  return updateUserPolicy(id, {
    is_active: false,
    status: 'cancelled',
  })
}

/**
 * Get single user policy
 */
export async function getUserPolicy(id: string): Promise<UserPolicy | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_policies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as UserPolicy
}

/**
 * Get user policies with their coverage types
 * Returns active policies with all coverage types they cover
 */
export async function getUserPoliciesWithCoverageTypes(
  userId: string
): Promise<
  Array<
    UserPolicy & {
      coverage_types: Array<{
        coverage_type_id: string
        coverage_type_name: string
        coverage_limit: number | null
        deductible: number | null
      }>
    }
  >
> {
  const supabase = await createClient()

  // Get active user policies
  const { data: policies, error: policiesError } = await supabase
    .from('user_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  if (policiesError) {
    throw new Error(`Failed to fetch user policies: ${policiesError.message}`)
  }

  if (!policies || policies.length === 0) {
    return []
  }

  // Get all coverage types for name matching (for legacy coverage_items)
  const { getCoverageTypes } = await import('@/lib/supabase/coverage-types')
  const allCoverageTypes = await getCoverageTypes()

  // For each policy, get its coverage types
  const policiesWithCoverageTypes = await Promise.all(
    (policies as UserPolicy[]).map(async (policy) => {
      const coverage_types: Array<{
        coverage_type_id: string
        coverage_type_name: string
        coverage_limit: number | null
        deductible: number | null
      }> = []

      // Method 1: Check policy_coverage_types table (new structure)
      // This table links policies to coverage_types with specific limits
      const { data: coverageTypesData, error: coverageError } = await supabase
        .from('policy_coverage_types')
        .select(
          `
          coverage_type_id,
          coverage_limit,
          deductible,
          coverage_type:coverage_types (
            id,
            name
          )
        `
        )
        .eq('policy_id', policy.policy_id)

      if (!coverageError && coverageTypesData && coverageTypesData.length > 0) {
        for (const ct of coverageTypesData) {
          const coverageType = ct as {
            coverage_type_id: string
            coverage_limit: number | null
            deductible: number | null
            coverage_type: { id: string; name: string } | null
          }
          coverage_types.push({
            coverage_type_id: coverageType.coverage_type_id,
            coverage_type_name: coverageType.coverage_type?.name || 'Unknown',
            coverage_limit: coverageType.coverage_limit,
            deductible: coverageType.deductible,
          })
        }
      }

      // Method 2: Check coverage_items (legacy structure) - used when policy_coverage_types is empty
      // coverage_items is a JSONB array: [{"name":"Baggage Loss","total_limit":4000,"used_limit":0,"currency":"USD"}]
      if (coverage_types.length === 0 && policy.coverage_items && Array.isArray(policy.coverage_items) && policy.coverage_items.length > 0) {
        const coverageItems = policy.coverage_items as Array<{
          name: string
          total_limit?: number
          used_limit?: number
          currency?: string
        }>
        
        for (const item of coverageItems) {
          // Try to find matching coverage type by name (case-insensitive)
          const normalizedItemName = item.name.toLowerCase().trim()
          
          const matchingCoverageType = allCoverageTypes.find((ct) => {
            const normalizedCtName = ct.name.toLowerCase().trim()
            // Exact match (preferred) or contains match
            return normalizedCtName === normalizedItemName || 
                   normalizedCtName.includes(normalizedItemName) ||
                   normalizedItemName.includes(normalizedCtName)
          })

          if (matchingCoverageType) {
            // Check if we already added this coverage type
            const alreadyAdded = coverage_types.some(
              (ct) => ct.coverage_type_id === matchingCoverageType.id
            )
            
            if (!alreadyAdded) {
              coverage_types.push({
                coverage_type_id: matchingCoverageType.id,
                coverage_type_name: matchingCoverageType.name,
                coverage_limit: item.total_limit || null,
                deductible: null, // Legacy coverage_items don't have deductible
              })
            }
          }
        }
      }

      return {
        ...policy,
        coverage_types,
      }
    })
  )

  return policiesWithCoverageTypes as Array<
    UserPolicy & {
      coverage_types: Array<{
        coverage_type_id: string
        coverage_type_name: string
        coverage_limit: number | null
        deductible: number | null
      }>
    }
  >
}