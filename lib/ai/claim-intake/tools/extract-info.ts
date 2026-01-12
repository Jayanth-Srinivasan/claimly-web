import { tool } from 'ai'
import { z } from 'zod'
import { SupabaseClient } from '@supabase/supabase-js'
import type { ConfidenceLevel } from '../core/types'

/**
 * Information extraction tool for AI agents
 * Extracts structured data from user messages and saves to state
 */
export function createExtractInfoTool(
  supabase: SupabaseClient,
  sessionId: string,
  coverageTypeIds: string[]
) {
  return tool({
    description: 'Extract structured information from user message and save it for claim processing',
    parameters: z.object({
      field_name: z.string().describe('Name of the field being extracted (e.g., airline, flight_number, incident_date)'),
      field_value: z.any().describe('Value of the extracted field'),
      confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level in the extraction'),
      source: z.enum(['user_message', 'ai_inference']).describe('How the information was obtained'),
    }),
    execute: async ({ field_name, field_value, confidence, source }) => {
      try {
        // Save to extracted data in state
        const { data: currentState } = await supabase
          .from('claim_intake_state')
          .select('extracted_data')
          .eq('session_id', sessionId)
          .single()

        const extractedData = currentState?.extracted_data || {}
        extractedData[field_name] = {
          value: field_value,
          confidence,
          source,
          extracted_at: new Date().toISOString(),
        }

        await supabase
          .from('claim_intake_state')
          .update({ extracted_data: extractedData })
          .eq('session_id', sessionId)

        return {
          success: true,
          field: field_name,
          message: `Successfully extracted ${field_name}: ${field_value}`,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        }
      }
    },
  })
}

/**
 * Tool to list missing required fields
 */
export function createListMissingFieldsTool(
  coverageTypeIds: string[],
  extractedData: Record<string, any>
) {
  return tool({
    description: 'Get list of required fields that are still missing from the claim information',
    parameters: z.object({}),
    execute: async () => {
      // Import coverage requirements
      const { COVERAGE_REQUIREMENTS } = await import('@/lib/ai/prompts')

      const allRequiredFields: string[] = []

      coverageTypeIds.forEach(ctId => {
        const requirements = COVERAGE_REQUIREMENTS[ctId]
        if (requirements) {
          requirements.required_fields
            .filter(f => f.required)
            .forEach(f => {
              if (!allRequiredFields.includes(f.field)) {
                allRequiredFields.push(f.field)
              }
            })
        }
      })

      const missingFields = allRequiredFields.filter(
        field => !extractedData[field] || !extractedData[field].value
      )

      return {
        missing_fields: missingFields,
        total_required: allRequiredFields.length,
        collected: allRequiredFields.length - missingFields.length,
        is_complete: missingFields.length === 0,
      }
    },
  })
}

/**
 * Tool to mark field as collected (confirms extraction)
 */
export function createMarkFieldCollectedTool(
  supabase: SupabaseClient,
  sessionId: string
) {
  return tool({
    description: 'Mark a field as successfully collected and confirmed',
    parameters: z.object({
      field_name: z.string().describe('Name of the field that was collected'),
      field_value: z.any().describe('Value of the field'),
    }),
    execute: async ({ field_name, field_value }) => {
      try {
        const { data: currentState } = await supabase
          .from('claim_intake_state')
          .select('extracted_data')
          .eq('session_id', sessionId)
          .single()

        const extractedData = currentState?.extracted_data || {}
        extractedData[field_name] = {
          value: field_value,
          confidence: 'high',
          source: 'user_message',
          extracted_at: new Date().toISOString(),
          confirmed: true,
        }

        await supabase
          .from('claim_intake_state')
          .update({ extracted_data: extractedData })
          .eq('session_id', sessionId)

        return {
          success: true,
          field: field_name,
          message: `Field ${field_name} marked as collected`,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        }
      }
    },
  })
}

/**
 * Tool to get field requirements for adaptive questioning
 */
export function createGetFieldRequirementsTool(coverageTypeIds: string[]) {
  return tool({
    description: 'Get requirements and validation rules for a specific field',
    parameters: z.object({
      field_name: z.string().describe('Name of the field to get requirements for'),
    }),
    execute: async ({ field_name }) => {
      const { COVERAGE_REQUIREMENTS } = await import('@/lib/ai/prompts')

      for (const ctId of coverageTypeIds) {
        const requirements = COVERAGE_REQUIREMENTS[ctId]
        if (requirements) {
          const field = requirements.required_fields.find(f => f.field === field_name)
          if (field) {
            return {
              found: true,
              field_name: field.field,
              label: field.label,
              type: field.type,
              required: field.required,
              description: field.description,
              validation_rules: field.validationRules || [],
              extraction_hints: field.extractionHints || [],
            }
          }
        }
      }

      return {
        found: false,
        message: `Field ${field_name} not found in coverage requirements`,
      }
    },
  })
}
