import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClaimDetailPage } from "@/components/admin/ClaimDetailPage"
import { getClaimWithDetails } from "@/lib/supabase/claims"
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

  // Fetch claim with all related data
  const claimData = await getClaimWithDetails(id)

  if (!claimData) {
    redirect('/admin')
  }

  // Serialize the data to ensure it's JSON-serializable and doesn't carry server-side type references
  const serializedClaimData = {
    claim: {
      id: claimData.claim.id,
      claim_number: claimData.claim.claim_number,
      status: claimData.claim.status,
      total_claimed_amount: claimData.claim.total_claimed_amount,
      currency: claimData.claim.currency,
      submitted_at: claimData.claim.submitted_at,
      created_at: claimData.claim.created_at,
      incident_type: claimData.claim.incident_type,
      incident_description: claimData.claim.incident_description,
      profile: claimData.claim.profile,
    },
    documents: claimData.documents,
    messages: claimData.messages,
  }

  return <ClaimDetailPage claimData={serializedClaimData} profile={profile} />
}
