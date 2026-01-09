import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClaimDetailPage } from "@/components/admin/ClaimDetailPage"
import type { Profile } from "@/types/auth"

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  // Await params as per Next.js 15+ requirements
  const { id } = await params
  console.log('Claim page route - ID from params:', id)

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

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

  // In a real app, fetch claim from database
  // For now, we'll pass the claim ID and let the client component handle mock data
  console.log('Passing claimId to ClaimDetailPage:', id)

  return <ClaimDetailPage claimId={id} profile={profile} />
}
