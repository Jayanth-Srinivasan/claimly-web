import type { OpenAI } from 'openai'

/**
 * Tool definitions for Policy Chat Mode
 */
export const policyTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_user_policies',
      description: 'Fetch active user policies with coverage details, limits, and premiums.',
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
      description: 'Get detailed policy information including coverage types, limits, deductibles, premiums, and exclusions.',
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
      description: 'Find policies matching user requirements. Returns policies with coverage details.',
      parameters: {
        type: 'object',
        properties: {
          coverage_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of coverage type IDs or names the user needs',
          },
          min_coverage_limit: {
            type: 'number',
            description: 'Minimum coverage limit required (optional)',
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
      description: 'Analyze the emotional tone of the user message to adjust response style.',
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
 * Tool definitions for Claims Chat Mode (simplified architecture)
 * Only 5 core tools for the new clean workflow:
 * 1. update_claim_session - Store all claim data (answers, info, stage)
 * 2. get_claim_session - Get current session state
 * 3. upload_document - Handle file uploads
 * 4. prepare_claim_summary - Generate summary for review
 * 5. submit_claim - Finalize and create claim
 */
export const claimsTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'update_claim_session',
      description: 'Update claim session data. Use this to store incident info, answers, and track questions asked. Session is auto-created on first call.',
      parameters: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            description: 'Current stage: gathering_info, reviewing_summary, submitted',
            enum: ['gathering_info', 'reviewing_summary', 'submitted'],
          },
          incident_type: {
            type: 'string',
            description: 'Type of incident (e.g., baggage_loss, flight_cancellation, medical)',
          },
          incident_description: {
            type: 'string',
            description: 'User description of the incident',
          },
          incident_date: {
            type: 'string',
            description: 'Date of the incident in ISO format',
          },
          incident_location: {
            type: 'string',
            description: 'Location where the incident occurred',
          },
          coverage_type_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of coverage type IDs identified for this claim',
          },
          policy_id: {
            type: 'string',
            description: 'The policy ID this claim is for',
          },
          answer_key: {
            type: 'string',
            description: 'Key for the answer being stored (e.g., "claimed_amount", "departure_date")',
          },
          answer: {
            type: 'object',
            description: 'Answer object with value, type, and label',
            properties: {
              value: {
                description: 'The answer value (string, number, date, or array)',
              },
              type: {
                type: 'string',
                description: 'Answer type: text, date, number, select, file',
                enum: ['text', 'date', 'number', 'select', 'file'],
              },
              label: {
                type: 'string',
                description: 'Human-readable label for the answer',
              },
            },
            required: ['value', 'type', 'label'],
          },
          question_asked: {
            type: 'string',
            description: 'Question that was asked (for tracking)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_claim_session',
      description: 'Get current claim session state. Returns session data, stage, and progress.',
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
      name: 'upload_document',
      description: 'Record an uploaded document for the claim session. Automatically validates the document and extracts information. Returns extracted_info field with key details that you should share with the user.',
      parameters: {
        type: 'object',
        properties: {
          file_name: {
            type: 'string',
            description: 'Name of the uploaded file',
          },
          file_path: {
            type: 'string',
            description: 'Storage path of the file',
          },
          file_type: {
            type: 'string',
            description: 'Type of document (e.g., receipt, invoice, medical_report)',
          },
          file_size: {
            type: 'number',
            description: 'File size in bytes',
          },
          mime_type: {
            type: 'string',
            description: 'MIME type of the file',
          },
        },
        required: ['file_name', 'file_path', 'file_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_claim_summary',
      description: 'Generate a summary of all collected claim information for user review. Call this before asking for confirmation.',
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
      name: 'submit_claim',
      description: 'Finalize and submit the claim. Creates the final claim record. Only call after user confirms the summary.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  // Document validation tools (MANDATORY for strict document requirements)
  {
    type: 'function',
    function: {
      name: 'get_required_documents',
      description: 'Get the list of required documents for a coverage type. MUST be called after categorizing incident to inform user what documents are needed. Returns required document types with descriptions and upload guidance.',
      parameters: {
        type: 'object',
        properties: {
          coverage_type_id: {
            type: 'string',
            description: 'The coverage type ID to get document requirements for',
          },
        },
        required: ['coverage_type_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_document',
      description: 'Validate an uploaded document against claim requirements. Triggers OCR extraction and validates against user profile and claim context. Returns validation status and any issues found.',
      parameters: {
        type: 'object',
        properties: {
          document_id: {
            type: 'string',
            description: 'The ID of the uploaded document to validate',
          },
          expected_document_type: {
            type: 'string',
            description: 'The expected document type (e.g., "baggage_receipt", "medical_report")',
          },
        },
        required: ['document_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_document_completeness',
      description: 'Check if all required documents have been uploaded and validated. MUST be called before prepare_claim_summary to ensure all mandatory documents are present. Returns missing documents and validation status for each.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  // Helper tools (optional but useful)
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
      name: 'check_policy_coverage',
      description: 'Check if coverage type is covered by user\'s active policies.',
      parameters: {
        type: 'object',
        properties: {
          coverage_type_id: {
            type: 'string',
            description: 'The coverage type ID to check coverage for',
          },
        },
        required: ['coverage_type_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detect_tone',
      description: 'Analyze the emotional tone of the user message to adjust response style.',
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
      description: 'Get full claim information including answers, documents, and notes.',
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
