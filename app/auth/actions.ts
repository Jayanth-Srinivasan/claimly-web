"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { insertOne } from "@/lib/supabase/helpers"
import type { Database } from "@/lib/supabase/database.types"
import type { AuthResult } from "@/types/auth"

export async function signIn({
  email,
  password
}: {
  email: string
  password: string
}): Promise<AuthResult> {
  const supabase = await createClient()

  try {
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        error: error.message,
      }
    }

    if (!data.user) {
      return {
        error: "Authentication failed. Please try again.",
      }
    }

    // Check if user has completed onboarding
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('id', data.user.id)
      .single<{ onboarding_completed_at: string | null }>()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      // Continue anyway, redirect to onboarding
    }

    // Redirect based on onboarding status
    if (profile?.onboarding_completed_at) {
      redirect("/dashboard")
    } else {
      redirect("/onboarding")
    }

  } catch (error) {
    // Check if error is from redirect
    if (error && typeof error === "object" && "digest" in error) {
      throw error
    }

    return {
      error: error instanceof Error ? error.message : "An error occurred during sign in",
    }
  }
}

export async function signUp({
  email,
  password,
  fullName,
}: {
  email: string
  password: string
  fullName: string
}): Promise<AuthResult> {
  const supabase = await createClient()

  try {
    console.log('[SignUp] Starting signup for:', email)
    console.log('[SignUp] Full name:', fullName)

    // Sign up with Supabase Auth
    // The trigger will automatically create a profile
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        // No email confirmation required
        emailRedirectTo: undefined,
      },
    })

    if (error) {
      console.error('[SignUp] Supabase auth error:', error)
      return {
        error: error.message,
      }
    }

    if (!data.user) {
      console.error('[SignUp] No user returned from Supabase')
      return {
        error: "Sign up failed. Please try again.",
      }
    }

    console.log('[SignUp] User created successfully:', data.user.id)
    console.log('[SignUp] User metadata:', data.user.user_metadata)

    // Check if profile was auto-created by trigger
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, custom_id')
      .eq('id', data.user.id)
      .single<{ id: string; custom_id: string }>()

    if (profileError || !profile) {
      console.warn('[SignUp] Profile not auto-created by trigger')
      console.warn('[SignUp] Profile error:', profileError)
      console.warn('[SignUp] Creating profile manually as fallback...')

      // Manual fallback: create profile directly
      if (!data.user.email) {
        console.error('[SignUp] User email is missing from auth data')
        return {
          error: "Email is required but was not provided by authentication. Please try again.",
        }
      }

      const profileData: Database['public']['Tables']['profiles']['Insert'] = {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        custom_id: 'CLM' + Math.random().toString(36).substring(2, 15).toUpperCase(),
      }

      try {
        const profile = await insertOne(supabase, 'profiles', profileData)
        console.log('[SignUp] Profile created manually successfully:', profile.id)
      } catch (insertError) {
        console.error('[SignUp] Manual profile creation failed:', insertError)
        return {
          error: `Profile creation failed: ${insertError instanceof Error ? insertError.message : 'Unknown error'}. Please contact support.`,
        }
      }
    } else {
      console.log('[SignUp] Profile auto-created by trigger:', profile.custom_id)
    }

    // Profile is auto-created by trigger or manually, redirect to onboarding
    redirect("/onboarding")

  } catch (error) {
    // Check if error is from redirect
    if (error && typeof error === "object" && "digest" in error) {
      throw error
    }

    console.error('[SignUp] Unexpected error:', error)
    return {
      error: error instanceof Error ? error.message : "An error occurred during sign up",
    }
  }
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        error: error.message,
      }
    }

    redirect("/auth")

  } catch (error) {
    // Check if error is from redirect
    if (error && typeof error === "object" && "digest" in error) {
      throw error
    }

    return {
      error: error instanceof Error ? error.message : "An error occurred during sign out",
    }
  }
}
