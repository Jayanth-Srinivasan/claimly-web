import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatDashboard } from "@/components/chat/ChatDashboard"
import type { Profile } from "@/types/auth"

export default async function CustomerDashboard() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (profileError || !profile) {
    console.error("Error fetching profile:", profileError)
    redirect('/auth')
  }

  // Check if onboarding is completed
  if (!profile.onboarding_completed_at) {
    redirect('/onboarding')
  }

  return <ChatDashboard profile={profile} />
}
