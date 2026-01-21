'use server'

import { updateClaimStatus } from '@/lib/supabase/claims'
import { revalidatePath } from 'next/cache'

/**
 * Update claim status (server action)
 */
export async function updateClaimStatusAction(
  claimId: string,
  status: 'pending' | 'approved' | 'rejected' | 'under-review',
  approvedAmount?: number
) {
  try {
    await updateClaimStatus(claimId, status, approvedAmount)
    revalidatePath(`/admin/claims/${claimId}`)
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update claim status',
    }
  }
}
