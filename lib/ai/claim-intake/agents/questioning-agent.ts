import { LanguageModel, streamText } from 'ai'
import { SupabaseClient } from '@supabase/supabase-js'
import type { FlowState } from '../core/types'
import {
  createExtractInfoTool,
  createListMissingFieldsTool,
  createMarkFieldCollectedTool,
  createGetFieldRequirementsTool,
} from '../tools/extract-info'

/**
 * Adaptive questioning agent using AI SDK multi-step capabilities
 * Generates contextual questions to fill missing required fields
 */
export class QuestioningAgent {
  private model: LanguageModel
  private supabase: SupabaseClient

  constructor(model: LanguageModel, supabase: SupabaseClient) {
    this.model = model
    this.supabase = supabase
  }

  /**
   * Generate next adaptive question based on missing fields
   */
  async* generateNextQuestion(
    state: FlowState,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): AsyncGenerator<string> {
    if (!state.coverageTypeIds || state.coverageTypeIds.length === 0) {
      yield 'Error: Coverage types not set. Please start over.'
      return
    }

    const extractedData = state.extractedData || {}

    // Create tools for the agent
    const tools = {
      extract_info: createExtractInfoTool(
        this.supabase,
        state.sessionId,
        state.coverageTypeIds
      ),
      list_missing_fields: createListMissingFieldsTool(
        state.coverageTypeIds,
        extractedData
      ),
      mark_field_collected: createMarkFieldCollectedTool(
        this.supabase,
        state.sessionId
      ),
      get_field_requirements: createGetFieldRequirementsTool(
        state.coverageTypeIds
      ),
    }

    const systemPrompt = this.buildSystemPrompt(state.coverageTypeIds, extractedData)

    // Stream adaptive question with tools
    const result = await streamText({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ],
      tools,
      maxSteps: 3, // Allow tool use for checking and extracting
      temperature: 0.7,
    })

    for await (const chunk of result.textStream) {
      yield chunk
    }
  }

  /**
   * Extract information from user's message
   */
  async extractInformation(
    state: FlowState,
    userMessage: string
  ): Promise<Record<string, any>> {
    if (!state.coverageTypeIds || state.coverageTypeIds.length === 0) {
      return {}
    }

    // Get coverage requirements for extraction schema
    const { COVERAGE_REQUIREMENTS } = await import('@/lib/ai/prompts')

    const allFields: any[] = []
    state.coverageTypeIds.forEach(ctId => {
      const requirements = COVERAGE_REQUIREMENTS[ctId]
      if (requirements) {
        allFields.push(...requirements.required_fields)
      }
    })

    // Build extraction schema
    const schemaFields: Record<string, any> = {}
    allFields.forEach(field => {
      const hints = field.extractionHints?.join(', ') || field.label
      schemaFields[field.field] = {
        type: field.type,
        description: `${field.description}. Look for: ${hints}`,
        optional: !field.required,
      }
    })

    // Use extraction tool to pull out information
    const tool = createExtractInfoTool(
      this.supabase,
      state.sessionId,
      state.coverageTypeIds
    )

    // Simple extraction - in a real implementation, this would use generateObject
    // For now, return empty to let the agent handle it via tools
    return {}
  }

  /**
   * Build system prompt for adaptive questioning
   */
  private buildSystemPrompt(coverageTypeIds: string[], extractedData: Record<string, any>): string {
    const missingFieldsText = Object.keys(extractedData).length > 0
      ? `\n\nAlready collected: ${Object.keys(extractedData).join(', ')}`
      : ''

    return `You are a helpful insurance claims assistant. Your job is to collect required information for a claim.

Coverage types: ${coverageTypeIds.join(', ')}

Instructions:
1. Use the list_missing_fields tool to see what information is still needed
2. Ask ONE clear, specific question at a time to collect missing information
3. Be conversational and friendly, not robotic
4. Use the extract_info tool when you identify information in the user's response
5. Use mark_field_collected to confirm when information is successfully collected
6. If unsure about field requirements, use get_field_requirements tool

Guidelines:
- Ask questions in a natural, conversational way
- Don't repeat questions that were already answered
- Be empathetic - users are dealing with incidents
- Keep questions short and focused
- Acknowledge information as it's provided${missingFieldsText}

Remember: You're here to help users through a difficult situation. Be patient and supportive.`
  }
}
