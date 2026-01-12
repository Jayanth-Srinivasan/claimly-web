export interface ValidationRule {
  type: 'enum' | 'min' | 'max' | 'pattern' | 'required'
  values?: string[]
  min?: number
  max?: number
  pattern?: string
  message?: string
}

export interface InformationRequirement {
  field: string                       // "flight_number", "airline"
  label: string                       // "Flight Number", "Airline"
  type: 'text' | 'number' | 'date' | 'select' | 'boolean'
  required: boolean
  description: string                 // What this field represents
  validationRules?: ValidationRule[]
  extractionHints?: string[]          // Keywords to identify in text
}

export interface CoverageTypeRequirements {
  coverage_type_id: string
  coverage_type_name: string
  required_fields: InformationRequirement[]
  optional_fields: InformationRequirement[]
  follow_up_questions: string[]       // Context-aware prompts
}

export interface ExtractedInformation {
  field: string
  value: any
  confidence: 'high' | 'medium' | 'low'
  source: 'user_message' | 'database_question' | 'ai_inference'
  message_id?: string
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
  extracted_info?: ExtractedInformation[]
}

export interface QuestioningState {
  claim_id: string
  coverage_type_ids: string[]
  extracted_info: ExtractedInformation[]
  missing_required_fields: string[]
  conversation_history: ConversationTurn[]
  database_questions_asked: string[]
  current_focus?: string
}

export interface ExtractedInfoRecord {
  id?: string
  claim_id: string
  field_name: string
  field_value: any
  confidence: 'high' | 'medium' | 'low'
  source: 'user_message' | 'database_question' | 'ai_inference'
  created_at?: string
  updated_at?: string
}
