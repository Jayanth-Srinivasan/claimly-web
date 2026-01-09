import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PoliciesPage } from '@/components/admin/policies/PoliciesPage'
import { getPolicies } from '@/lib/supabase/policies'
import type { Profile } from '@/types/auth'

export default async function AdminPoliciesPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth')
  }

  // Get user profile and check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (profileError || !profile) {
    redirect('/auth')
  }

  if (!profile.is_admin) {
    redirect('/dashboard')
  }

  // Fetch policies from database
  const policies = await getPolicies()

  return <PoliciesPage profile={profile} initialPolicies={policies} />
}
