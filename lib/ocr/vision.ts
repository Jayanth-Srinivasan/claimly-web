import OpenAI from 'openai'
import { PDFParse } from 'pdf-parse'
import { getOpenAIClient, AI_MODELS } from '@/lib/ai/openai'

export interface OCRResult {
  document_type: string
  extracted_data: {
    amounts?: Array<{ label: string; value: number; currency?: string }>
    dates?: Array<{ label: string; value: string }>
    parties?: Array<{ role: string; name: string; contact?: string }>
    items?: Array<{ description: string; quantity?: number; price?: number }>
    reference_numbers?: Array<{ type: string; value: string }>
    summary_fields?: Record<string, string | number | boolean>
  }
  authenticity_assessment: {
    likely_authentic: boolean
    confidence: 'high' | 'medium' | 'low'
    concerns?: string[]
    recommendations?: string[]
  }
  summary: string
  raw_text?: string

  // Enhanced metadata fields
  extracted_entities: {
    persons?: Array<{ name: string; role: string }>
    organizations?: Array<{ name: string; type: string }>
    locations?: Array<{ name: string; context: string }>
    dates?: Array<{ value: string; context: string }>
    monetary_amounts?: Array<{ value: number; currency: string; context: string }>
  }
  authenticity_score: number // 0-100
  tampering_detected: boolean
  tampering_indicators?: string[]
  processing_metadata: {
    processing_status: 'pending' | 'processing' | 'completed' | 'failed'
    processed_at: string
    processing_time_ms: number
    model_version: string
  }
}

export class OCRService {
  private openai: OpenAI

  constructor() {
    this.openai = getOpenAIClient()
  }

  async process(file: File): Promise<OCRResult> {
    if (file.type === 'application/pdf') {
      return this.processPDF(file)
    }
    return this.processImage(file)
  }

  private async processImage(file: File): Promise<OCRResult> {
    const base64 = await this.fileToBase64(file)
    const mimeType = file.type

    const completion = await this.openai.chat.completions.create({
      model: AI_MODELS.GPT4O,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: this.promptText(),
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    })

    return JSON.parse(completion.choices[0].message.content!) as OCRResult
  }

  private async processPDF(file: File): Promise<OCRResult> {
    // Use pdf-parse to pull text; if parsing fails, fall back to base64 prompt
    let text = ''
    try {
      const arrayBuffer = await file.arrayBuffer()
      const parser = new PDFParse({ data: Buffer.from(arrayBuffer) })
      const parsed = await parser.getText()
      text = parsed.text?.slice(0, 12000) || ''
    } catch (err) {
      text = (await this.fileToBase64(file)).slice(0, 120000)
    }

    const completion = await this.openai.chat.completions.create({
      model: AI_MODELS.GPT4O,
      messages: [
        { role: 'system', content: this.promptText() },
        {
          role: 'user',
          content: `Document content (truncated):\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    })

    const result = JSON.parse(completion.choices[0].message.content!) as OCRResult
    result.raw_text = text
    return result
  }

  async assessDamage(file: File): Promise<{
    present: boolean
    description?: string
    severity?: 'low' | 'medium' | 'high'
    confidence?: 'low' | 'medium' | 'high'
  }> {
    const base64 = await this.fileToBase64(file)
    const completion = await this.openai.chat.completions.create({
      model: AI_MODELS.GPT4O,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Inspect this image for physical damage related to an insurance claim.

Return JSON:
{
  "present": boolean,
  "description": string,
  "severity": "low" | "medium" | "high",
  "confidence": "low" | "medium" | "high"
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.type};base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 300,
    })

    return JSON.parse(completion.choices[0].message.content!)
  }

  async checkImageMatchesIntent(
    file: File,
    intent: string
  ): Promise<{ match: boolean; confidence: 'low' | 'medium' | 'high'; reasoning?: string }> {
    const base64 = await this.fileToBase64(file)
    const completion = await this.openai.chat.completions.create({
      model: AI_MODELS.GPT4O,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Determine if this image matches the following expected context:\n"${intent}".

Return JSON:
{
  "match": boolean,
  "confidence": "low" | "medium" | "high",
  "reasoning": string
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.type};base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 300,
    })

    return JSON.parse(completion.choices[0].message.content!)
  }

  private promptText() {
    return `Analyze this document for an insurance claim. Extract all relevant information and assess its authenticity.

Return a JSON object with:
1. document_type (e.g., "receipt", "invoice", "medical bill", "police report", "photo of damage", etc.)
2. extracted_data:
   - amounts: Array of monetary amounts with labels (e.g., "Total", "Subtotal", "Tax")
   - dates: Array of dates with labels (e.g., "Transaction Date", "Due Date")
   - parties: Array of involved parties (e.g., merchant, customer, provider)
   - items: Array of line items if applicable
   - reference_numbers: Transaction IDs, invoice numbers, policy numbers, etc.
   - summary_fields: Any other key/value fields visible
3. authenticity_assessment:
   - likely_authentic: boolean indicating if document appears genuine
   - confidence: "high", "medium", or "low"
   - concerns: Array of any red flags or concerns
   - recommendations: Suggestions for additional verification if needed
4. summary: A brief natural language summary of the document
5. extracted_entities:
   - persons: Array of people mentioned with their roles (e.g., [{"name": "John Doe", "role": "claimant"}])
   - organizations: Companies, institutions mentioned (e.g., [{"name": "ABC Insurance", "type": "insurance_company"}])
   - locations: Places mentioned with context (e.g., [{"name": "New York, NY", "context": "incident_location"}])
   - dates: All dates with their significance (e.g., [{"value": "2024-01-15", "context": "incident_date"}])
   - monetary_amounts: All amounts with context (e.g., [{"value": 500, "currency": "USD", "context": "claimed_amount"}])
6. authenticity_score: Number 0-100 indicating confidence in authenticity (e.g., 85)
7. tampering_detected: boolean - any signs of digital manipulation or editing
8. tampering_indicators: Array of specific concerns if tampering detected (e.g., ["inconsistent shadows", "pixelation around text"])
9. processing_metadata:
   - processing_status: "completed"
   - processed_at: Current timestamp in ISO 8601 format
   - processing_time_ms: Estimated processing time
   - model_version: "gpt-4o"

Be thorough and precise in data extraction.`
  }

  private async fileToBase64(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
  }
}
