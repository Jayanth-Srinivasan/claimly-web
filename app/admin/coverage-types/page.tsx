import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CoverageTypesPage } from '@/components/admin/coverage-types/CoverageTypesPage'
import { fetchCoverageTypes } from './actions'
import { getRules } from '@/lib/supabase/rules'
import { getAllQuestions } from '@/lib/supabase/questions'
import type { Profile } from '@/types/auth'

export const metadata = {
  title: 'Coverage Types | Admin',
  description: 'Manage insurance coverage types',
}

export default async function CoverageTypesAdminPage() {
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

  // Fetch coverage types, rules, and questions from database
  const coverageTypes = await fetchCoverageTypes()
  const rules = await getRules()
  const questions = await getAllQuestions()

  return (
    <CoverageTypesPage
      profile={profile}
      initialCoverageTypes={coverageTypes}
      initialRules={rules}
      initialQuestions={questions}
    />
  )
}
