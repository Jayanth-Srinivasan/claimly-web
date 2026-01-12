import OpenAI from 'openai'
import { getOpenAIClient, AI_MODELS } from './openai'
import type { ExtractedInformation, InformationRequirement } from '@/types/adaptive-questions'

export class InformationExtractor {
  private openai: OpenAI

  constructor() {
    this.openai = getOpenAIClient()
  }

  /**
   * Extract structured information from user's natural language message
   *
   * Example:
   * User: "My Delta flight 1234 was cancelled on Jan 15 due to weather"
   * Extracts: airline=Delta, flight_number=DL1234, date=2026-01-15, reason=weather
   */
  async extractFromMessage(
    userMessage: string,
    requiredFields: InformationRequirement[],
    conversationContext: string
  ): Promise<ExtractedInformation[]> {
    const completion = await this.openai.chat.completions.create({
      model: AI_MODELS.GPT4O,
      messages: [
        {
          role: 'system',
          content: `You are an information extraction assistant. Extract structured claim information from user messages.

FIELDS TO EXTRACT:
${requiredFields.map(f => `- ${f.field} (${f.type}): ${f.description}`).join('\n')}

EXTRACTION RULES:
1. Only extract information explicitly mentioned or strongly implied
2. Return confidence: high (explicit), medium (implied), low (uncertain)
3. Normalize formats:
   - Dates → ISO 8601 (YYYY-MM-DD)
   - Numbers → numeric values without currency symbols
   - Text → cleaned and normalized
4. Do NOT fabricate missing information
5. Extract airline codes (e.g., "Delta flight 1234" → flight_number: "DL1234")

Return JSON with this exact structure:
{
  "extracted": [
    {
      "field": "field_name",
      "value": "extracted_value",
      "confidence": "high|medium|low"
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Previous conversation context:
${conversationContext}

User's latest message:
"${userMessage}"

Extract any relevant claim information from this message.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const result = JSON.parse(completion.choices[0].message.content!)

    return (result.extracted || []).map((item: any) => ({
      field: item.field,
      value: item.value,
      confidence: item.confidence || 'medium',
      source: 'user_message' as const
    }))
  }
}
