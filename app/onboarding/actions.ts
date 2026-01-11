"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { updateOne } from "@/lib/supabase/helpers"
import { enrollUserInPolicy } from "@/lib/supabase/user-policies"
import { getPolicy } from "@/lib/supabase/policies"
import type { AuthResult } from "@/types/auth"
import type { Database } from "@/types/database"
import type { CoverageItem } from "@/types/user-policies"

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export async function completeOnboarding({
  dateOfBirth,
  gender,
  phoneNumber,
  country,
  addressLine1,
  addressLine2,
  city,
  state,
  zipCode,
  occupation,
}: {
  dateOfBirth: string
  gender: string
  phoneNumber: string
  country: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zipCode: string
  occupation?: string
}): Promise<AuthResult> {
  const supabase = await createClient()

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        error: "You must be logged in to complete onboarding",
      }
    }

    // Update profile with demographic data
    const updateData: ProfileUpdate = {
      date_of_birth: dateOfBirth,
      gender: gender as 'male' | 'female' | 'other' | 'prefer-not-to-say',
      phone_number: phoneNumber,
      country,
      address_line1: addressLine1,
      address_line2: addressLine2 || null,
      city,
      state,
      zip_code: zipCode,
      occupation: occupation || null,
      onboarding_completed_at: new Date().toISOString(),
    }

    try {
      await updateOne(supabase, 'profiles', user.id, updateData)
    } catch (updateError) {
      console.error("Error updating profile:", updateError)
      return {
        error: "Failed to save your information. Please try again.",
      }
    }

    // Return success (don't redirect, let wizard continue)
    return { success: true }

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "An error occurred while completing onboarding",
    }
  }
}

/**
 * Enroll user in selected policies during onboarding
 */
export async function enrollPolicies(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Get selected policy IDs from form
  const selectedPolicyIds = formData.getAll('policy_ids') as string[]

  if (selectedPolicyIds.length === 0) {
    return { error: 'Please select at least one policy' }
  }

  try {
    // Enroll user in each selected policy
    for (const policyId of selectedPolicyIds) {
      const policy = await getPolicy(policyId)
      if (!policy) continue

      // Convert policy coverage_items to user policy format
      const coverageItems: CoverageItem[] = (policy.coverage_items as any[]).map((item) => ({
        name: item.name,
        total_limit: item.limit,
        used_limit: 0,
        currency: policy.currency || 'USD',
      }))

      // Calculate expiry date (1 year from now for annual policies)
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + (policy.policy_term_months || 12))

      await enrollUserInPolicy({
        user_id: user.id,
        policy_id: policy.id,
        policy_name: policy.name,
        coverage_items: coverageItems,
        total_premium: policy.premium || null,
        currency: policy.currency || 'USD',
        expires_at: expiresAt.toISOString(),
        is_active: true,
        status: 'active',
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/profile')
    return { success: true }
  } catch (error) {
    console.error('Error enrolling in policies:', error)
    return { error: 'Failed to enroll in policies. Please try again.' }
  }
}
