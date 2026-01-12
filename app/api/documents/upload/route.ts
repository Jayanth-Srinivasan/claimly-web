import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentValidator } from '@/lib/ocr/document-validator'
import { validateFile } from '@/lib/ocr/validators'

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const claimId = formData.get('claimId') as string
    const expectedDescription = formData.get('expectedDescription') as string | null
    const expectedTypesRaw = formData.get('expectedTypes') as string | null
    const expectedTypes = expectedTypesRaw ? expectedTypesRaw.split(',').map(t => t.trim()).filter(Boolean) : undefined

    const validation = validateFile(file)
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.reason }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // (Optional) use claim context to guide validation
    let claimContext: { incident_type?: string } | null = null
    if (claimId) {
      const { data: claim } = await supabase
        .from('claims')
        .select('incident_type')
        .eq('id', claimId)
        .single()
      claimContext = claim
    }

    // Derive expected types/description from claim incident type if not provided
    let derivedExpectedTypes = expectedTypes
    let derivedExpectedDescription = expectedDescription || claimContext?.incident_type || undefined
    let requireDamage = false

    const incidentType = claimContext?.incident_type?.toLowerCase() || ''
    if (!derivedExpectedTypes) {
      if (incidentType.includes('damage') || incidentType.includes('collision')) {
        derivedExpectedTypes = ['damage', 'vehicle', 'car', 'auto']
        requireDamage = true
      } else if (incidentType.includes('baggage')) {
        derivedExpectedTypes = ['baggage', 'pir', 'receipt', 'luggage']
      } else if (incidentType.includes('medical')) {
        derivedExpectedTypes = ['medical bill', 'invoice', 'receipt']
      } else if (incidentType.includes('trip') || incidentType.includes('flight')) {
        derivedExpectedTypes = ['booking', 'itinerary', 'receipt', 'ticket']
      }
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('claim-documents')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('claim-documents').getPublicUrl(fileName)

    const validator = new DocumentValidator()
    let validationResult
    try {
      validationResult = await validator.validate(file, {
        claimId,
        checkDamage: true,
        expectedDescription: derivedExpectedDescription,
        expectedTypes: derivedExpectedTypes,
        requireDamage,
      })
    } catch (ocrError) {
      console.error('OCR error:', ocrError)
      // Continue without OCR results - file is still uploaded
      validationResult = {
        success: false,
        validation_error: 'OCR processing failed',
      }
    }

    // If validation failed or suggests reupload, remove the file and return a 400
    if (!validationResult.success || validationResult.needs_reupload) {
      await supabase.storage.from('claim-documents').remove([fileName])
      return new Response(
        JSON.stringify({
          error: validationResult.validation_error || 'Invalid document uploaded',
          riskFlags: validationResult.risk_flags || [],
          needsReupload: true,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Save to database
    const { data: document, error: dbError } = await supabase
      .from('claim_documents')
      .insert({
        claim_id: claimId!,
        file_name: file.name,
        file_path: fileName,
        file_type: file.type,
        mime_type: file.type,
        file_size: file.size,
        inferred_document_type: validationResult?.ocr?.document_type,
        ocr_data: validationResult?.ocr as any,
        damage_assessment: validationResult?.damage_assessment as any,
        risk_flags: validationResult?.risk_flags || [],

        // Enhanced metadata fields
        authenticity_score: validationResult?.ocr?.authenticity_score ?? null,
        extracted_entities: validationResult?.ocr?.extracted_entities ?? null,
        processing_status: validationResult?.ocr?.processing_metadata?.processing_status ?? 'completed',
        tampering_detected: validationResult?.ocr?.tampering_detected ?? false,
        processed_at: validationResult?.ocr?.processing_metadata?.processed_at ?? new Date().toISOString(),
        auto_filled_fields: null, // Will be populated when AI extracts information
        document_purpose: derivedExpectedTypes?.[0] ?? null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // File uploaded but DB insert failed - cleanup storage
      await supabase.storage.from('claim-documents').remove([fileName])
      return new Response(JSON.stringify({ error: 'Failed to save document metadata' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        document,
        ocrResults: validationResult?.ocr,
        riskFlags: validationResult?.risk_flags || [],
        damageAssessment: validationResult?.damage_assessment,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Document upload error:', error)
    return new Response(JSON.stringify({ error: 'Failed to process document upload' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
