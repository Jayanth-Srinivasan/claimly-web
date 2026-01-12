import { createOpenAIClient } from './openai-client'

export type ToneClassification =
  | 'frustrated'
  | 'anxious'
  | 'calm'
  | 'confused'
  | 'angry'
  | 'sad'
  | 'neutral'
  | 'happy'
  | 'urgent'

export interface ToneAnalysis {
  tone: ToneClassification
  confidence: number
  suggestedStyle: 'supportive' | 'professional' | 'empathetic' | 'efficient'
  reasoning: string
}

/**
 * Detect the emotional tone of a user message
 */
export async function detectTone(message: string): Promise<ToneAnalysis> {
  const client = createOpenAIClient()

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini', // Using mini for faster, cheaper tone detection
    messages: [
      {
        role: 'system',
        content: `You are a tone detection assistant. Analyze the emotional tone of user messages and classify them.

Possible tones: frustrated, anxious, calm, confused, angry, sad, neutral, happy, urgent

For each message, provide:
1. The primary tone classification
2. Confidence level (0-1)
3. Suggested response style: supportive (for frustrated/anxious/angry/sad), professional (for calm/neutral), empathetic (for confused/anxious), efficient (for urgent/happy)
4. Brief reasoning

Respond in JSON format with: {tone, confidence, suggestedStyle, reasoning}`,
      },
      {
        role: 'user',
        content: message,
      },
    ],
    temperature: 0.3, // Lower temperature for more consistent classification
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    // Default to neutral if detection fails
    return {
      tone: 'neutral',
      confidence: 0.5,
      suggestedStyle: 'professional',
      reasoning: 'Unable to detect tone, defaulting to neutral',
    }
  }

  try {
    const analysis = JSON.parse(content) as ToneAnalysis
    return analysis
  } catch (error) {
    console.error('Failed to parse tone analysis:', error)
    return {
      tone: 'neutral',
      confidence: 0.5,
      suggestedStyle: 'professional',
      reasoning: 'Error parsing tone analysis',
    }
  }
}
