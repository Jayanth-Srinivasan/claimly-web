'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { updateUserPolicy, cancelUserPolicy } from '@/lib/supabase/user-policies'
import type { UserPolicyUpdate } from '@/types/user-policies'

/**
 * Update user policy
 */
export async function updatePolicy(policyId: string, updates: UserPolicyUpdate) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  try {
    await updateUserPolicy(policyId, updates)
    revalidatePath('/profile')
    return { success: true }
  } catch (error) {
    console.error('Error updating policy:', error)
    return { error: 'Failed to update policy' }
  }
}

/**
 * Cancel user policy
 */
export async function cancelPolicy(policyId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  try {
    await cancelUserPolicy(policyId)
    revalidatePath('/profile')
    return { success: true }
  } catch (error) {
    console.error('Error cancelling policy:', error)
    return { error: 'Failed to cancel policy' }
  }
}
