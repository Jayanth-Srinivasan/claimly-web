import { SupabaseClient } from '@supabase/supabase-js'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { InformationExtractor } from './information-extractor'
import { getSystemPromptForAdaptiveQuestioning, COVERAGE_REQUIREMENTS } from './prompts'
import type {
  QuestioningState,
  ExtractedInformation,
  ConversationTurn,
  CoverageTypeRequirements
} from '@/types/adaptive-questions'

export class AdaptiveQuestioningEngine {
  private supabase: SupabaseClient
  private extractor: InformationExtractor

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.extractor = new InformationExtractor()
  }

  /**
   * Initialize questioning state for a claim
   * Loads existing extracted information if any
   * Merges with persisted state if provided to restore conversation history
   */
  async initialize(
    claimId: string,
    coverageTypeIds: string[],
    persistedState?: Partial<QuestioningState>
  ): Promise<QuestioningState> {
    console.log('[Adaptive Init] Starting with coverageTypeIds:', coverageTypeIds)

    // Fetch coverage type names/slugs to map to COVERAGE_REQUIREMENTS keys
    const { data: coverageTypes, error: coverageTypesError } = await this.supabase
      .from('coverage_types')
      .select('id, name, slug')
      .in('id', coverageTypeIds)

    // CRITICAL: Log query results
    console.log('[Adaptive Init] Coverage types query:', {
      input: coverageTypeIds,
      found: coverageTypes?.length || 0,
      error: coverageTypesError,
      data: coverageTypes
    })

    // Handle query failure
    if (coverageTypesError) {
      console.error('[Adaptive Init] ERROR fetching coverage types:', coverageTypesError)
      throw new Error(`Failed to fetch coverage types: ${coverageTypesError.message}`)
    }

    if (!coverageTypes || coverageTypes.length === 0) {
      console.error('[Adaptive Init] ERROR: No coverage types found for IDs:', coverageTypeIds)
      console.error('[Adaptive Init] This means the UUIDs do not exist in coverage_types table')
      throw new Error(`Coverage types not found in database for IDs: ${coverageTypeIds.join(', ')}`)
    }

    // Map UUIDs to snake_case keys for COVERAGE_REQUIREMENTS
    const mappedCoverageTypeIds = (coverageTypes || []).map(ct => {
      // Convert slug or name to snake_case (handle hyphens and spaces)
      const key = (ct.slug || ct.name)
        .toLowerCase()
        .replace(/[-\s]+/g, '_')
      console.log(`[Adaptive Init] Mapped: ${ct.name} (${ct.id}) → ${key}`)
      return key
    })

    console.log('[Adaptive Init] Final mapped IDs:', mappedCoverageTypeIds)

    // Load existing extracted information
    const { data: existingInfo } = await this.supabase
      .from('claim_extracted_information')
      .select('*')
      .eq('claim_id', claimId)

    const mappedInfo: ExtractedInformation[] = (existingInfo || []).map(row => ({
      field: row.field_name,
      value: typeof row.field_value === 'string' ? JSON.parse(row.field_value) : row.field_value,
      confidence: row.confidence as 'high' | 'medium' | 'low',
      source: row.source as 'user_message' | 'database_question' | 'ai_inference'
    }))

    const missingFields = this.getMissingFields(mappedCoverageTypeIds, mappedInfo)
    console.log(`[Adaptive] Missing fields:`, missingFields)

    // Merge with persisted state if available (preserves conversation history and asked questions)
    return {
      claim_id: claimId,
      coverage_type_ids: mappedCoverageTypeIds,
      extracted_info: mappedInfo,
      missing_required_fields: missingFields,
      conversation_history: persistedState?.conversation_history || [],
      database_questions_asked: persistedState?.database_questions_asked || [],
      current_focus: persistedState?.current_focus
    }
  }

  /**
   * Process user message and extract information
   */
  async processUserMessage(
    state: QuestioningState,
    userMessage: string
  ): Promise<{
    extracted: ExtractedInformation[]
    updatedState: QuestioningState
  }> {
    // 1. Get all fields (required + optional) for coverage types
    const requirements = this.getCoverageRequirements(state.coverage_type_ids)
    const allFields = [
      ...requirements.flatMap(r => r.required_fields),
      ...requirements.flatMap(r => r.optional_fields)
    ]

    // 2. Extract information from message
    const extracted = await this.extractor.extractFromMessage(
      userMessage,
      allFields,
      state.conversation_history.map(t => `${t.role}: ${t.content}`).join('\n')
    )

    // 3. Save to database
    if (extracted.length > 0) {
      await this.saveExtractedInfo(state.claim_id, extracted)
    }

    // 4. Update state
    const updatedState: QuestioningState = {
      ...state,
      extracted_info: [...state.extracted_info, ...extracted],
      missing_required_fields: this.getMissingFields(
        state.coverage_type_ids,
        [...state.extracted_info, ...extracted]
      ),
      conversation_history: [
        ...state.conversation_history,
        { role: 'user', content: userMessage, extracted_info: extracted }
      ]
    }

    return { extracted, updatedState }
  }

  /**
   * Generate next adaptive question using GPT-4o streaming
   * NOTE: This should ONLY be called when database questions are exhausted
   * Database question priority is handled in ClaimChatService
   */
  async* generateNextQuestion(
    state: QuestioningState,
    options: { incidentDescription?: string } = {}
  ): AsyncGenerator<string> {
    const requirements = this.getCoverageRequirements(state.coverage_type_ids)
    const requirementFields = requirements.flatMap(r => r.required_fields)
    const orderedMissing = requirements
      .flatMap(r => r.required_fields.map(f => f.field))
      .filter(field => state.missing_required_fields.includes(field))
    const lastAssistantMessage = state.conversation_history
      .filter(turn => turn.role === 'assistant')
      .at(-1)?.content

    const systemPrompt = getSystemPromptForAdaptiveQuestioning(
      state.coverage_type_ids,
      state.extracted_info,
      state.conversation_history,
      {
        incidentDescription: options.incidentDescription,
        missingFieldOrder: orderedMissing,
        lastAssistantMessage
      }
    )

    const tools = [
      {
        name: 'list_missing_fields',
        description: 'Return missing required fields with labels and descriptions',
        schema: z.object({}),
        func: async () => {
          return requirementFields
            .filter(f => state.missing_required_fields.includes(f.field))
            .map(f => ({ field: f.field, label: f.label, description: f.description }))
        }
      },
      {
        name: 'get_follow_up_suggestions',
        description: 'Return coverage-specific follow-up suggestions',
        schema: z.object({}),
        func: async () =>
          requirements.flatMap(r => r.follow_up_questions || []),
      }
    ]

    const model = new ChatOpenAI({
      model: 'gpt-4o',
      temperature: 0.6,
      streaming: true
    }).bindTools(tools)

    let messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...state.conversation_history.map(turn =>
        turn.role === 'assistant' ? new AIMessage(turn.content) : new HumanMessage(turn.content)
      ),
      new HumanMessage('Ask the next needed question now.'),
    ]

    let generated = ''

    while (true) {
      const result = await model.stream(messages)

      for await (const chunk of result) {
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          for (const call of chunk.tool_calls) {
            const tool = tools.find(t => t.name === call.name)
            const toolResult = tool ? await tool.func() : { error: 'unknown tool' }
            messages.push(
              new ToolMessage({
                name: call.name,
                tool_call_id: call.id ?? `${call.name}-call`,
                content: JSON.stringify(toolResult)
              })
            )
          }
          continue
        }

        const content =
          typeof chunk.content === 'string'
            ? chunk.content
            : chunk.content?.toString?.() ?? ''

        if (content) {
          generated += content
          yield content
        }
      }

      break
    }

    const normalize = (val?: string) => (val || '').trim().toLowerCase()
    const isRepeat = normalize(generated) === normalize(lastAssistantMessage)

    if (isRepeat) {
      const fallbackField =
        state.missing_required_fields.find(f => f !== orderedMissing[0]) ||
        state.missing_required_fields[0]

      if (fallbackField) {
        const fieldMeta = requirementFields.find(f => f.field === fallbackField)
        const label = fieldMeta?.label || fallbackField
        const desc = fieldMeta?.description ? ` (${fieldMeta.description})` : ''
        generated = `To keep moving, could you share ${label}${desc}?`
        yield generated
      }
    }

    if (generated) {
      state.conversation_history.push({
        role: 'assistant',
        content: generated
      })
    }
  }

  /**
   * Get missing required fields
   */
  private getMissingFields(
    coverageTypeIds: string[],
    extractedInfo: ExtractedInformation[]
  ): string[] {
    const requirements = this.getCoverageRequirements(coverageTypeIds)
    const requiredFields = requirements.flatMap(r => r.required_fields)
    const collectedFields = new Set(extractedInfo.map(info => info.field))

    return requiredFields
      .filter(f => !collectedFields.has(f.field))
      .map(f => f.field)
  }

  /**
   * Get coverage requirements for coverage type IDs
   */
  private getCoverageRequirements(coverageTypeIds: string[]): CoverageTypeRequirements[] {
    console.log('[Adaptive] getCoverageRequirements called with:', coverageTypeIds)
    console.log('[Adaptive] Available keys in COVERAGE_REQUIREMENTS:', Object.keys(COVERAGE_REQUIREMENTS))

    const requirements = coverageTypeIds
      .map(id => {
        const key = id.toLowerCase().replace(/[-\s]+/g, '_')
        const requirement = COVERAGE_REQUIREMENTS[key]

        if (!requirement) {
          console.error(`[Adaptive] ❌ No match for "${id}" (normalized: "${key}")`)
          console.error(`[Adaptive] Available: ${Object.keys(COVERAGE_REQUIREMENTS).join(', ')}`)
        } else {
          console.log(`[Adaptive] ✅ Found requirements for "${id}" → "${key}"`)
        }

        return requirement
      })
      .filter(Boolean)

    console.log(`[Adaptive] Found ${requirements.length} coverage requirement(s)`)
    return requirements
  }

  /**
   * Save extracted information to database
   */
  private async saveExtractedInfo(claimId: string, extracted: ExtractedInformation[]) {
    const records = extracted.map(info => ({
      claim_id: claimId,
      field_name: info.field,
      field_value: JSON.stringify(info.value),
      confidence: info.confidence,
      source: info.source
    }))

    await this.supabase
      .from('claim_extracted_information')
      .insert(records)
  }
}
