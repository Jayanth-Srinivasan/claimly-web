import type { CoverageTypeRequirements, ExtractedInformation, ConversationTurn } from '@/types/adaptive-questions'

// Coverage type information requirements library
export const COVERAGE_REQUIREMENTS: Record<string, CoverageTypeRequirements> = {
  'flight_cancellation': {
    coverage_type_id: 'flight_cancellation',
    coverage_type_name: 'Flight Cancellation',
    required_fields: [
      {
        field: 'airline',
        label: 'Airline',
        type: 'text',
        required: true,
        description: 'Name of the airline',
        extractionHints: ['airline', 'carrier', 'airways', 'air']
      },
      {
        field: 'flight_number',
        label: 'Flight Number',
        type: 'text',
        required: true,
        description: 'Flight number including carrier code',
        extractionHints: ['flight', 'flight number', 'flight #', 'number']
      },
      {
        field: 'scheduled_departure_date',
        label: 'Scheduled Departure Date',
        type: 'date',
        required: true,
        description: 'Originally scheduled departure date',
        extractionHints: ['date', 'scheduled', 'departure', 'on']
      },
      {
        field: 'cancellation_reason',
        label: 'Reason for Cancellation',
        type: 'select',
        required: true,
        description: 'Why the flight was cancelled',
        validationRules: [{
          type: 'enum',
          values: ['weather', 'mechanical', 'crew', 'airline_decision', 'other']
        }]
      },
      {
        field: 'booking_confirmation',
        label: 'Booking Confirmation Number',
        type: 'text',
        required: true,
        description: 'Airline booking reference',
        extractionHints: ['confirmation', 'booking', 'reference', 'code']
      },
      {
        field: 'ticket_cost',
        label: 'Original Ticket Cost',
        type: 'number',
        required: true,
        description: 'Amount paid for the ticket',
        extractionHints: ['cost', 'paid', 'price', 'amount', '$']
      }
    ],
    optional_fields: [
      {
        field: 'replacement_flight_cost',
        label: 'Replacement Flight Cost',
        type: 'number',
        required: false,
        description: 'Cost of replacement flight if purchased'
      },
      {
        field: 'additional_expenses',
        label: 'Additional Expenses',
        type: 'number',
        required: false,
        description: 'Hotel, meals, transportation costs'
      }
    ],
    follow_up_questions: [
      "Did you have to book a replacement flight?",
      "Did you incur any additional expenses like hotel or meals?",
      "Do you have receipts for these expenses?"
    ]
  },

  'baggage_loss': {
    coverage_type_id: 'baggage_loss',
    coverage_type_name: 'Baggage Loss',
    required_fields: [
      {
        field: 'airline',
        label: 'Airline',
        type: 'text',
        required: true,
        description: 'Airline responsible for baggage',
        extractionHints: ['airline', 'carrier', 'airways']
      },
      {
        field: 'flight_number',
        label: 'Flight Number',
        type: 'text',
        required: true,
        description: 'Flight on which baggage was lost',
        extractionHints: ['flight', 'flight number']
      },
      {
        field: 'baggage_tag_number',
        label: 'Baggage Tag Number',
        type: 'text',
        required: true,
        description: 'Baggage claim tag number',
        extractionHints: ['tag', 'baggage tag', 'tag number']
      },
      {
        field: 'date_reported',
        label: 'Date Reported to Airline',
        type: 'date',
        required: true,
        description: 'When you reported the loss to the airline',
        extractionHints: ['reported', 'date']
      },
      {
        field: 'contents_value',
        label: 'Estimated Value of Contents',
        type: 'number',
        required: true,
        description: 'Total value of lost items',
        extractionHints: ['value', 'worth', 'cost', '$']
      }
    ],
    optional_fields: [
      {
        field: 'item_list',
        label: 'List of Lost Items',
        type: 'text',
        required: false,
        description: 'Detailed list of items in lost baggage'
      }
    ],
    follow_up_questions: [
      "Do you have a PIR (Property Irregularity Report) from the airline?",
      "Can you provide an itemized list of the contents?",
      "Do you have receipts for valuable items?"
    ]
  },

  'trip_cancellation': {
    coverage_type_id: 'trip_cancellation',
    coverage_type_name: 'Trip Cancellation',
    required_fields: [
      {
        field: 'trip_destination',
        label: 'Trip Destination',
        type: 'text',
        required: true,
        description: 'Where you were traveling to',
        extractionHints: ['destination', 'going to', 'traveling to']
      },
      {
        field: 'trip_start_date',
        label: 'Trip Start Date',
        type: 'date',
        required: true,
        description: 'Originally scheduled start date',
        extractionHints: ['start date', 'departure date', 'leaving on']
      },
      {
        field: 'cancellation_reason',
        label: 'Reason for Cancellation',
        type: 'text',
        required: true,
        description: 'Why you had to cancel the trip',
        extractionHints: ['reason', 'because', 'due to']
      },
      {
        field: 'total_trip_cost',
        label: 'Total Trip Cost',
        type: 'number',
        required: true,
        description: 'Total amount paid for the trip',
        extractionHints: ['cost', 'paid', 'total', '$']
      },
      {
        field: 'non_refundable_amount',
        label: 'Non-Refundable Amount',
        type: 'number',
        required: true,
        description: 'Amount you could not recover',
        extractionHints: ['non-refundable', 'lost', 'cannot recover']
      }
    ],
    optional_fields: [],
    follow_up_questions: [
      "Do you have documentation of the cancellation reason?",
      "What portion of the trip cost is non-refundable?"
    ]
  },

  'medical_emergency': {
    coverage_type_id: 'medical_emergency',
    coverage_type_name: 'Medical Emergency',
    required_fields: [
      {
        field: 'incident_date',
        label: 'Date of Incident',
        type: 'date',
        required: true,
        description: 'When the medical emergency occurred',
        extractionHints: ['date', 'when', 'occurred on']
      },
      {
        field: 'incident_location',
        label: 'Location',
        type: 'text',
        required: true,
        description: 'Where the emergency occurred',
        extractionHints: ['location', 'where', 'at']
      },
      {
        field: 'medical_condition',
        label: 'Medical Condition',
        type: 'text',
        required: true,
        description: 'Nature of the medical emergency',
        extractionHints: ['condition', 'illness', 'injury', 'medical']
      },
      {
        field: 'treatment_received',
        label: 'Treatment Received',
        type: 'text',
        required: true,
        description: 'Medical treatment provided',
        extractionHints: ['treatment', 'care', 'medical attention']
      },
      {
        field: 'medical_costs',
        label: 'Total Medical Costs',
        type: 'number',
        required: true,
        description: 'Total amount of medical expenses',
        extractionHints: ['cost', 'expenses', 'paid', '$']
      }
    ],
    optional_fields: [],
    follow_up_questions: [
      "Did you visit a hospital or clinic?",
      "Do you have medical records and receipts?"
    ]
  }
}

interface AdaptivePromptOptions {
  incidentDescription?: string
  missingFieldOrder?: string[]
  lastAssistantMessage?: string
}


interface AdaptivePromptOptions {
  incidentDescription?: string
  missingFieldOrder?: string[]
  lastAssistantMessage?: string
}

export function getSystemPromptForAdaptiveQuestioning(
  coverageTypes: string[],
  extractedInfo: ExtractedInformation[],
  conversationHistory: ConversationTurn[],
  options: AdaptivePromptOptions = {}
): string {
  const requirements = coverageTypes
    .map(id => COVERAGE_REQUIREMENTS[id.toLowerCase().replace(/ /g, '_')])
    .filter(Boolean)

  const allRequiredFields = requirements.flatMap(r => r.required_fields)
  const collectedFields = extractedInfo.map(info => info.field)
  const missingFields = allRequiredFields.filter(f => !collectedFields.includes(f.field))

  const orderedMissing = (options.missingFieldOrder || []).filter(field =>
    missingFields.some(f => f.field === field)
  )
  const primaryMissingField = orderedMissing[0] || missingFields[0]?.field
  const coverageNames = requirements.map(r => r.coverage_type_name).join(', ')

  return `You are an adaptive insurance claim assistant helping the user file a claim.

Incident description (for context): ${options.incidentDescription || 'Not provided yet'}
Coverage Type(s): ${coverageNames || 'Unknown'}

REQUIRED INFORMATION TO COLLECT (in priority order):
${allRequiredFields.map(f => `- ${f.field}${orderedMissing.includes(f.field) ? ' (next)' : ''}: ${f.description}`).join('\\n')}

INFORMATION ALREADY COLLECTED:
${extractedInfo.map(info => `- ${info.field}: ${info.value}`).join('\\n') || 'None yet'}

MISSING INFORMATION:
${missingFields.map(f => `- ${f.field}: ${f.description}`).join('\\n') || 'None'}

CONVERSATION SO FAR:
${conversationHistory.map(turn => `${turn.role}: ${turn.content}`).join('\\n')}

GUIDELINES:
- Ask for the highest-priority missing item first: ${primaryMissingField || 'n/a'}.
- NEVER echo the last assistant message: "${options.lastAssistantMessage || ''}". If it was just asked, switch to a different missing field or rephrase.
- Do not re-ask for fields already collected; acknowledge any new details the user provides.
- Keep each question concise (1-2 sentences) and tailored to the incident context; vary phrasing to avoid repetition.
- You may combine 1-2 closely related missing fields into one question if it feels natural.
- If something is unclear, ask a clarifying question with concrete examples.
- Once all required info is collected, stop asking and prompt for documents if relevant.`
}
