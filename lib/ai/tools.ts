import type { OpenAI } from 'openai'

/**
 * Tool definitions for Policy Chat Mode
 */
export const policyTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_user_policies',
      description: 'Fetch all active policies for the current user from the database. ALWAYS use this tool first when user asks about their coverage or policies. Returns policy details including coverage items, limits, and premiums.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_policy_details',
      description: 'Get COMPLETE detailed information about a specific policy. ALWAYS use this tool after suggest_policies to get full coverage details for each suggested policy. Returns all coverage types with their specific limits, deductibles, premiums, exclusions, and all other policy details. This is essential for providing comprehensive policy recommendations.',
      parameters: {
        type: 'object',
        properties: {
          policy_id: {
            type: 'string',
            description: 'The ID of the policy to get details for',
          },
        },
        required: ['policy_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_coverage_usage',
      description: 'Get used coverage limits for the user. Shows how much of each coverage type has been used vs. available limits.',
      parameters: {
        type: 'object',
        properties: {
          user_policy_id: {
            type: 'string',
            description: 'The user policy ID to check coverage usage for',
          },
        },
        required: ['user_policy_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_policies',
      description: 'Find and suggest policies that match user requirements from the database. ALWAYS use this tool when user asks for policy recommendations. Returns policies with complete coverage information including coverage_list array with all coverage types, limits, and details. The response includes: coverage_list (array of {name, limit, deductible}), exclusions, premium, and summary. Use the coverage_list array to provide detailed coverage information to users. If no policies match, returns an empty list.',
      parameters: {
        type: 'object',
        properties: {
          coverage_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of coverage type IDs or names the user needs (e.g., ["travel", "medical", "life", "baggage"])',
          },
          min_coverage_limit: {
            type: 'number',
            description: 'Minimum coverage limit required for specific coverage type (optional)',
          },
          max_premium: {
            type: 'number',
            description: 'Maximum premium the user is willing to pay (optional)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detect_tone',
      description: 'Analyze the emotional tone of the user message to adjust response style. Returns tone classification (frustrated, anxious, calm, etc.) and suggested response style.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The user message to analyze for tone',
          },
        },
        required: ['message'],
      },
    },
  },
]

/**
 * Tool definitions for Claims Chat Mode
 */
export const claimsTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'categorize_incident',
      description: 'Categorize the user incident description into appropriate coverage types. Returns matching coverage types with confidence scores.',
      parameters: {
        type: 'object',
        properties: {
          incident_description: {
            type: 'string',
            description: 'The user description of the incident',
          },
        },
        required: ['incident_description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_intake_state',
      description: 'Get the current claim intake state for the session. Returns current stage, questions asked, validation status, and other progress information. ALWAYS call this first when starting a new claim or checking progress. The session_id is automatically provided by the system.',
      parameters: {
        type: 'object',
        properties: {
          session_id: {
            type: 'string',
            description: 'The chat session ID (automatically provided by the system)',
          },
        },
        required: ['session_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_intake_state',
      description: 'Update the claim intake state. Use this to track progress, update stage, mark questions as asked, and update validation status. IMPORTANT: When you set coverage_type_ids and move to categorization stage, the system automatically creates a DRAFT claim that will be used for saving answers. The session_id is automatically provided by the system.',
      parameters: {
        type: 'object',
        properties: {
          session_id: {
            type: 'string',
            description: 'The chat session ID',
          },
          current_stage: {
            type: 'string',
            description: 'Current stage: initial_contact, categorization, questioning, document_collection, validation, claim_creation',
            enum: [
              'initial_contact',
              'categorization',
              'questioning',
              'document_collection',
              'validation',
              'claim_creation',
            ],
          },
          coverage_type_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of coverage type IDs identified for this claim',
          },
          incident_description: {
            type: 'string',
            description: 'The incident description',
          },
          database_questions_asked: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of question IDs that have been asked',
          },
          validation_passed: {
            type: 'boolean',
            description: 'Whether validation has passed',
          },
          validation_errors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of validation error messages',
          },
        },
        required: ['session_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_coverage_questions',
      description: 'Get all questions configured for a coverage type. Returns questions ordered by order_index, including field types and validation rules. MANDATORY: Use this to get ALL questions from the database that you must ask the user. Do not invent questions - use only the questions returned by this tool.',
      parameters: {
        type: 'object',
        properties: {
          coverage_type_id: {
            type: 'string',
            description: 'The coverage type ID to get questions for',
          },
        },
        required: ['coverage_type_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_coverage_rules',
      description: 'Get all active rules configured for a coverage type. Returns rules including conditions, actions, and validation logic. Use this to understand what validation rules apply and what additional information might be required based on answers. Rules can help determine which questions to ask next or what documents are needed.',
      parameters: {
        type: 'object',
        properties: {
          coverage_type_id: {
            type: 'string',
            description: 'The coverage type ID to get rules for',
          },
        },
        required: ['coverage_type_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_extracted_info',
      description: 'Get all extracted information for a claim. This includes all data extracted from user messages, documents, and AI analysis. Use this before creating a claim to ensure you have all necessary information to populate claim fields like incident_date, incident_location, total_claimed_amount, and incident_type.',
      parameters: {
        type: 'object',
        properties: {
          claim_id: {
            type: 'string',
            description: 'The claim ID to get extracted information for',
          },
        },
        required: ['claim_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_answer',
      description: 'Save an answer to a question. Stores the answer and evaluates it against rules. If no claim exists yet, use the session_id as claim_id - the system will create a draft claim automatically.',
      parameters: {
        type: 'object',
        properties: {
          claim_id: {
            type: 'string',
            description: 'The claim ID. If no claim exists yet, use the session_id - the system will handle creating a draft claim automatically.',
          },
          question_id: {
            type: 'string',
            description: 'The question ID being answered',
          },
          answer_text: {
            type: 'string',
            description: 'Text answer (for text fields)',
          },
          answer_number: {
            type: 'number',
            description: 'Numeric answer (for number fields)',
          },
          answer_date: {
            type: 'string',
            description: 'Date answer in ISO format (for date fields)',
          },
          answer_select: {
            type: 'string',
            description: 'Selected option (for select fields)',
          },
          answer_file_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of file IDs (for file fields)',
          },
        },
        required: ['claim_id', 'question_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_answers',
      description: 'Validate all collected answers against configured rules for the coverage type. Returns validation results including errors and warnings.',
      parameters: {
        type: 'object',
        properties: {
          coverage_type_id: {
            type: 'string',
            description: 'The coverage type ID',
          },
          answers: {
            type: 'object',
            description: 'Object mapping question IDs to their answers',
            additionalProperties: true,
          },
        },
        required: ['coverage_type_id', 'answers'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_document_info',
      description: 'Extract information from uploaded documents using AI. Validates document type, extracts text/data, and checks for authenticity. IMPORTANT: After calling this tool, you MUST provide a response to the user summarizing what was extracted. Do not just say "let me process" and stop - complete the extraction and respond immediately.',
      parameters: {
        type: 'object',
        properties: {
          document_path: {
            type: 'string',
            description: 'The file path or URL of the document to process',
          },
          document_type: {
            type: 'string',
            description: 'Expected document type (e.g., receipt, invoice, medical_report)',
          },
          claim_id: {
            type: 'string',
            description: 'The claim ID this document belongs to',
          },
        },
        required: ['document_path', 'claim_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_extracted_info',
      description: 'Save extracted information from documents to the claim. Stores structured data that can be used for claim processing.',
      parameters: {
        type: 'object',
        properties: {
          claim_id: {
            type: 'string',
            description: 'The claim ID',
          },
          field_name: {
            type: 'string',
            description: 'The name of the field (e.g., amount, date, merchant_name)',
          },
          field_value: {
            type: 'object',
            description: 'The extracted value (can be string, number, date, etc.)',
            additionalProperties: true,
          },
          confidence: {
            type: 'string',
            description: 'Confidence level: high, medium, low',
            enum: ['high', 'medium', 'low'],
          },
          source: {
            type: 'string',
            description: 'Source of extraction (e.g., document_path, ocr, ai_analysis)',
          },
        },
        required: ['claim_id', 'field_name', 'field_value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_claim',
      description: 'Finalize the claim after all information is collected and validated. IMPORTANT: A draft claim is usually already created during categorization. This function automatically reads extracted information, claim answers, and user policies to populate all claim fields including incident_date, incident_location, incident_type, total_claimed_amount, claim_summary, and ai_analysis. It updates the existing draft claim from "draft" to "pending" status. Sets status to pending and links to the chat session. Returns JSON string: {"success":true,"data":{"claimId":"<UUID>","claimNumber":"CLM-XXXXX-XXXX","status":"pending"}}. CRITICAL: You MUST parse this JSON, extract data.claimId (UUID format like "7f6be445-4698-4845-a4ac-6b08a78a5908") and data.claimNumber (format like "CLM-MKBT3FJE-8868") EXACTLY as returned. DO NOT make up values like "CLAIM12345" or "FC-78910" - these are WRONG. Use the values EXACTLY as provided in the tool response. After providing the claim details, inform the user the chat session is now closed. RECOMMENDED: Call get_extracted_info before this to review collected data.',
      parameters: {
        type: 'object',
        properties: {
          session_id: {
            type: 'string',
            description: 'The chat session ID',
          },
          coverage_type_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of coverage type IDs for this claim',
          },
          incident_description: {
            type: 'string',
            description: 'Description of the incident',
          },
          incident_date: {
            type: 'string',
            description: 'Date of the incident in ISO format',
          },
          incident_location: {
            type: 'string',
            description: 'Location where the incident occurred',
          },
          incident_type: {
            type: 'string',
            description: 'Type of incident (e.g., theft, accident, medical_emergency)',
          },
          total_claimed_amount: {
            type: 'number',
            description: 'Total amount being claimed',
          },
          currency: {
            type: 'string',
            description: 'Currency code (e.g., USD, EUR)',
          },
          policy_id: {
            type: 'string',
            description: 'The policy ID this claim is for (optional)',
          },
        },
        required: [
          'session_id',
          'coverage_type_ids',
          'incident_description',
          'incident_date',
          'incident_location',
          'incident_type',
          'total_claimed_amount',
        ],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_claim_stage',
      description: 'Update the current stage of the claim intake process.',
      parameters: {
        type: 'object',
        properties: {
          session_id: {
            type: 'string',
            description: 'The chat session ID',
          },
          stage: {
            type: 'string',
            description: 'The new stage',
            enum: [
              'initial_contact',
              'categorization',
              'questioning',
              'document_collection',
              'validation',
              'claim_creation',
            ],
          },
        },
        required: ['session_id', 'stage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detect_tone',
      description: 'Analyze the emotional tone of the user message to adjust response style. Returns tone classification (frustrated, anxious, calm, etc.) and suggested response style.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The user message to analyze for tone',
          },
        },
        required: ['message'],
      },
    },
  },
]

/**
 * Admin tools for claim interaction
 */
export const adminTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_claim_details',
      description: 'Get full claim information including answers, documents, extracted information, and notes.',
      parameters: {
        type: 'object',
        properties: {
          claim_id: {
            type: 'string',
            description: 'The claim ID',
          },
        },
        required: ['claim_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_claim_status',
      description: 'Update the status of a claim (pending, approved, rejected, under-review).',
      parameters: {
        type: 'object',
        properties: {
          claim_id: {
            type: 'string',
            description: 'The claim ID',
          },
          status: {
            type: 'string',
            description: 'New status',
            enum: ['pending', 'approved', 'rejected', 'under-review'],
          },
          approved_amount: {
            type: 'number',
            description: 'Approved amount (if status is approved)',
          },
        },
        required: ['claim_id', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_admin_note',
      description: 'Add an admin note to the claim for internal tracking.',
      parameters: {
        type: 'object',
        properties: {
          claim_id: {
            type: 'string',
            description: 'The claim ID',
          },
          content: {
            type: 'string',
            description: 'The note content',
          },
          note_type: {
            type: 'string',
            description: 'Type of note (e.g., review, follow_up, decision)',
          },
        },
        required: ['claim_id', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_additional_info',
      description: 'Request additional information from the user for a claim.',
      parameters: {
        type: 'object',
        properties: {
          claim_id: {
            type: 'string',
            description: 'The claim ID',
          },
          requested_info: {
            type: 'string',
            description: 'Description of what information is needed',
          },
        },
        required: ['claim_id', 'requested_info'],
      },
    },
  },
]

/**
 * Get tools for a specific mode
 */
export function getToolsForMode(mode: 'policy' | 'claim' | 'admin'): OpenAI.Chat.Completions.ChatCompletionTool[] {
  switch (mode) {
    case 'policy':
      return policyTools
    case 'claim':
      return claimsTools
    case 'admin':
      return adminTools
    default:
      return []
  }
}
