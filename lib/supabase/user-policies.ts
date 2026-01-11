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
