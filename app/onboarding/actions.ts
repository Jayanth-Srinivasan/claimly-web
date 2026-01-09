"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { updateOne } from "@/lib/supabase/helpers"
import type { AuthResult } from "@/types/auth"
import type { Database } from "@/types/database"

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

    // Redirect to dashboard
    redirect("/dashboard")

  } catch (error) {
    // Check if error is from redirect
    if (error && typeof error === "object" && "digest" in error) {
      throw error
    }

    return {
      error: error instanceof Error ? error.message : "An error occurred while completing onboarding",
    }
  }
}
