import { SupabaseClient } from '@supabase/supabase-js'

export async function getClaimExtractedInformation(
  supabase: SupabaseClient,
  claimId: string
) {
  const { data, error } = await supabase
    .from('claim_extracted_information')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function saveExtractedInformation(
  supabase: SupabaseClient,
  claimId: string,
  fieldName: string,
  fieldValue: any,
  confidence: 'high' | 'medium' | 'low',
  source: 'user_message' | 'database_question' | 'ai_inference'
) {
  const { data, error } = await supabase
    .from('claim_extracted_information')
    .insert({
      claim_id: claimId,
      field_name: fieldName,
      field_value: fieldValue,
      confidence,
      source
    })
    .select()
    .single()

  if (error) throw error
  return data
}
