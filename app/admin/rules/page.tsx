import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuestionnairesPage } from '@/components/admin/questionnaires/QuestionnairesPage'
import { getQuestionnaires } from '@/lib/supabase/questionnaires'
import type { Profile } from '@/types/auth'

export default async function AdminRulesPage() {
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

  // Fetch questionnaires from database
  const questionnaires = await getQuestionnaires()

  // Fetch all questions at once
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .order('order_index', { ascending: true })

  return <QuestionnairesPage profile={profile} initialQuestionnaires={questionnaires} initialQuestions={questions || []} />
}
