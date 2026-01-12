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
      description: 'Get the current claim intake state for the session. Returns current stage, questions asked, validation status, and other progress information.',
      parameters: {
        type: 'object',
        properties: {
          session_id: {
            type: 'string',
            description: 'The chat session ID',
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
      description: 'Update the claim intake state. Use this to track progress, update stage, mark questions as asked, and update validation status.',
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
      description: 'Get all questions configured for a coverage type. Returns questions ordered by order_index, including field types and validation rules.',
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
      name: 'save_answer',
      description: 'Save an answer to a question. Stores the answer and evaluates it against rules.',
      parameters: {
        type: 'object',
        properties: {
          claim_id: {
            type: 'string',
            description: 'The claim ID (or intake state ID if claim not yet created)',
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
      description: 'Extract information from uploaded documents using AI. Validates document type, extracts text/data, and checks for authenticity.',
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
      description: 'Create a new claim record after all information is collected and validated. Sets status to pending and links to the chat session.',
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
