import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { updateCoverageUsage } from '@/lib/supabase/user-policies'

const RequestSchema = z.object({
  sessionId: z.string().uuid(), // kept for parity with client payload
  claimId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    const input = RequestSchema.parse(body)

    // Fetch claim and ensure ownership
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', input.claimId)
      .eq('user_id', user.id)
      .single()

    if (claimError || !claim) {
      return new Response(JSON.stringify({ error: 'Claim not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const coverageTypeIds: string[] = claim.coverage_type_ids || []
    if (coverageTypeIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Claim has no coverage types associated' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Determine claimed amount
    let claimAmount =
      typeof claim.total_claimed_amount === 'number' ? claim.total_claimed_amount : 0

    if (!claimAmount) {
      // Try to derive from extracted information (best-effort)
      const { data: extractedInfo } = await supabase
        .from('claim_extracted_information')
        .select('field_name, field_value')
        .eq('claim_id', input.claimId)

      const amountEntry = (extractedInfo || []).find(
        (row) =>
          row.field_name === 'total_claimed_amount' ||
          row.field_name === 'ticket_cost' ||
          row.field_name === 'medical_costs'
      )

      if (amountEntry && typeof amountEntry.field_value === 'number') {
        claimAmount = amountEntry.field_value
      }
    }

    if (!claimAmount || claimAmount < 0) {
      claimAmount = 0
    }

    // Fetch user's active policies with coverage info
    const { data: userPolicies, error: policyError } = await supabase
      .from('user_policies')
      .select(`
        id,
        coverage_items,
        policy:policies(
          policy_coverage_types(
            coverage_limit,
            deductible,
            coverage_type:coverage_types(*)
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (policyError) {
      return new Response(JSON.stringify({ error: 'Failed to load policies' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate limits
    const limitIssues: string[] = []
    const updates: Array<{ policyId: string; coverageName: string }> = []

    for (const coverageTypeId of coverageTypeIds) {
      const match = userPolicies
        ?.flatMap((up) => up.policy?.policy_coverage_types || [])
        .find((pct: any) => pct.coverage_type?.id === coverageTypeId)

      if (!match) continue

      const coverageName = match.coverage_type?.name || 'coverage'
      const coverageLimit =
        typeof match.coverage_limit === 'number' ? match.coverage_limit : null

      const parentPolicy = userPolicies?.find((up) =>
        (up.policy?.policy_coverage_types || []).some(
          (pct: any) => pct.coverage_type?.id === coverageTypeId
        )
      )
      const coverageItems = (parentPolicy?.coverage_items as any[]) || []
      const matchingItem = coverageItems.find((ci) => ci?.name === coverageName)
      const remaining =
        typeof matchingItem?.total_limit === 'number' &&
        typeof matchingItem?.used_limit === 'number'
          ? matchingItem.total_limit - matchingItem.used_limit
          : coverageLimit

      if (remaining !== null && claimAmount > remaining) {
        limitIssues.push(
          `${coverageName}: claimed $${claimAmount.toLocaleString()} exceeds remaining limit${
            remaining !== null ? ` of $${remaining.toLocaleString()}` : ''
          }`
        )
      }

      if (parentPolicy) {
        updates.push({ policyId: parentPolicy.id, coverageName })
      }
    }

    if (limitIssues.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Claim amount exceeds coverage limits',
          details: limitIssues,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update claim status
    const { data: updatedClaim, error: updateError } = await supabase
      .from('claims')
      .update({
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', input.claimId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError || !updatedClaim) {
      return new Response(JSON.stringify({ error: 'Failed to submit claim' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update coverage usage (best-effort; failures are logged but not blocking)
    for (const update of updates) {
      try {
        if (claimAmount > 0) {
          await updateCoverageUsage(update.policyId, update.coverageName, claimAmount)
        }
      } catch (err) {
        console.error('[Claim Submit] Failed to update coverage usage', err)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        claim: updatedClaim,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Submit claim error:', error)
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Failed to submit claim' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
