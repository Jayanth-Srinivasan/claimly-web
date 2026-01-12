import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import type { Policy } from '@/types/policies'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth')
  }

  // If onboarding already completed, redirect to dashboard
  if (profile.onboarding_completed_at) {
    redirect('/dashboard')
  }

  // Fetch active policies
  let policies: Policy[] = []
  try {
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('is_active', true)
      .order('premium', { ascending: true })

    if (error) {
      console.error('Error fetching policies:', error)
    } else {
      // Cast database rows to Policy type
      policies = (data || []).map((policy: any) => ({
        ...policy,
        coverage_items: policy.coverage_items as any,
        exclusions: policy.exclusions || [],
      })) as Policy[]
    }
  } catch (error) {
    console.error('Error fetching policies:', error)
  }

  return <OnboardingWizard profile={profile as any} policies={policies} />
}
