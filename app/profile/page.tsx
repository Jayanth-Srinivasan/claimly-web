import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserPoliciesWithDetails } from '@/lib/supabase/user-policies'
import { ProfilePage } from '@/components/profile/ProfilePage'

export const metadata = {
  title: 'Profile | Claimly',
  description: 'View your profile and active policies',
}

export default async function ProfileRoute() {
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

  if (!profile.onboarding_completed_at) {
    redirect('/onboarding')
  }

  // Fetch user policies
  const userPolicies = await getUserPoliciesWithDetails(user.id)

  return <ProfilePage profile={profile} userPolicies={userPolicies} />
}
