import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminDashboard } from "@/components/admin/AdminDashboard"
import { getAllClaims } from "@/lib/supabase/claims"
import type { Profile } from "@/types/auth"

export default async function AdminPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  console.log('[Admin Page] User:', user?.id, user?.email)
  console.log('[Admin Page] User Error:', userError)

  if (userError || !user) {
    console.log('[Admin Page] No user found, redirecting to /auth')
    redirect('/auth')
  }

  // Get user profile and check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  console.log('[Admin Page] Profile:', profile?.email, 'is_admin:', profile?.is_admin)
  console.log('[Admin Page] Profile Error:', profileError)

  if (profileError || !profile) {
    console.log('[Admin Page] Profile error or not found, redirecting to /auth')
    redirect('/auth')
  }

  if (!profile.is_admin) {
    console.log('[Admin Page] User is not admin, redirecting to /dashboard')
    redirect('/dashboard')
  }

  // Fetch all claims
  const claims = await getAllClaims()

  console.log('[Admin Page] Admin access granted!')
  return <AdminDashboard profile={profile} claims={claims} />
}
