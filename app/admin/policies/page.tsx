import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PoliciesPage } from '@/components/admin/policies/PoliciesPage'
import { getPolicies } from '@/lib/supabase/policies'
import { getCoverageTypes } from '@/lib/supabase/coverage-types'
import { getPolicyCoverageTypesWithDetails } from '@/lib/supabase/policy-coverage-types'
import type { Profile } from '@/types/auth'
import type { SelectedCoverage } from '@/components/admin/policies/CoverageTypeSelector'

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

  // Fetch policies and coverage types from database
  const policies = await getPolicies()
  const coverageTypes = await getCoverageTypes()

  // Fetch policy coverages for all policies
  const policyCoveragesMap = new Map<string, SelectedCoverage[]>()
  for (const policy of policies) {
    const coverages = await getPolicyCoverageTypesWithDetails(policy.id)
    policyCoveragesMap.set(
      policy.id,
      coverages.map((c) => ({
        coverage_type_id: c.coverage_type_id,
        is_optional: c.is_optional,
        coverage_limit: c.coverage_limit ?? 0,
        deductible: c.deductible ?? 0,
        additional_premium: c.additional_premium,
      }))
    )
  }

  return (
    <PoliciesPage
      profile={profile}
      initialPolicies={policies}
      coverageTypes={coverageTypes}
      policyCoveragesMap={policyCoveragesMap}
    />
  )
}
