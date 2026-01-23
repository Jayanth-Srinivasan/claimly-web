/**
 * Adaptive Questioning System
 *
 * This module handles:
 * 1. Entity extraction from user responses
 * 2. Category mapping for detected entities
 * 3. Follow-up question generation based on context
 * 4. Document requirement determination
 */

// ============================================================
// TYPES
// ============================================================

export interface ExtractedEntity {
  text: string
  category: string
  keywords: string[]
}

export interface DocumentRequirementInfo {
  type: string
  description: string
  required: boolean
}

export interface AdaptiveRule {
  category: string
  keywords: string[]
  followUpQuestions: string[]
  documentRequirements: DocumentRequirementInfo[]
  valueThreshold?: number
}

export interface FollowUpQuestionWithKey {
  question: string
  suggested_answer_key: string
  suggested_label: string
  entity: string
  category: string
}

export interface AnalysisResult {
  extracted_entities: ExtractedEntity[]
  categories: string[]
  suggested_follow_up_questions: string[]
  /** Enhanced follow-up questions with suggested answer keys for structured storage */
  suggested_follow_up_questions_with_keys: FollowUpQuestionWithKey[]
  additional_documents_required: DocumentRequirementInfo[]
  context: {
    coverage_type_id: string
    coverage_type_slug: string
    has_high_value_items: boolean
  }
}

// ============================================================
// ENTITY KEYWORDS BY CATEGORY
// ============================================================

export const ENTITY_KEYWORDS: Record<string, string[]> = {
  electronics: [
    'laptop', 'computer', 'notebook', 'macbook', 'pc',
    'tablet', 'ipad', 'surface',
    'phone', 'iphone', 'android', 'smartphone', 'mobile',
    'camera', 'dslr', 'gopro', 'lens', 'canon', 'nikon', 'sony',
    'headphones', 'airpods', 'earbuds', 'beats',
    'smartwatch', 'apple watch', 'fitbit', 'garmin',
    'kindle', 'e-reader', 'ebook',
    'gaming', 'playstation', 'xbox', 'nintendo', 'switch',
    'charger', 'adapter', 'cable', 'power bank',
    'drone', 'speaker', 'bluetooth'
  ],
  jewelry: [
    'jewelry', 'jewellery',
    'ring', 'rings', 'engagement ring', 'wedding ring',
    'necklace', 'necklaces', 'chain', 'pendant',
    'bracelet', 'bracelets', 'bangle',
    'earrings', 'earring', 'studs',
    'watch', 'rolex', 'omega', 'cartier', 'tag heuer',
    'gold', 'silver', 'platinum',
    'diamond', 'diamonds', 'gemstone', 'gem',
    'pearl', 'pearls',
    'brooch', 'cufflinks'
  ],
  clothing: [
    'clothes', 'clothing', 'garments', 'apparel',
    'shirt', 'shirts', 't-shirt', 'blouse',
    'pants', 'trousers', 'jeans', 'shorts',
    'dress', 'dresses', 'gown',
    'suit', 'suits', 'blazer', 'jacket',
    'coat', 'overcoat', 'trench',
    'shoes', 'sneakers', 'boots', 'heels', 'sandals',
    'designer', 'gucci', 'louis vuitton', 'prada', 'versace', 'armani',
    'underwear', 'socks', 'belt'
  ],
  valuables: [
    'cash', 'money', 'currency',
    'wallet', 'purse', 'handbag', 'bag',
    'credit card', 'debit card',
    'gift card', 'voucher',
    'collectible', 'antique', 'art', 'painting'
  ],
  documents: [
    'passport', 'passports',
    'id', 'identification', 'id card',
    'license', 'licence', 'driving license', 'drivers license',
    'visa', 'permit',
    'ticket', 'tickets', 'boarding pass',
    'insurance card', 'insurance document'
  ],
  medical: [
    'hospital', 'hospitalized', 'hospitalization', 'admitted',
    'emergency room', 'er', 'icu',
    'surgery', 'operation', 'surgical',
    'doctor', 'physician', 'specialist',
    'clinic', 'medical center', 'health center',
    'medicine', 'medication', 'prescription', 'drugs', 'pharmacy',
    'treatment', 'therapy', 'consultation',
    'diagnosis', 'diagnosed', 'condition',
    'injury', 'injured', 'accident',
    'ambulance', 'emergency'
  ],
  travel: [
    'flight', 'flights', 'plane', 'airplane',
    'hotel', 'hotels', 'accommodation', 'lodging', 'resort',
    'car rental', 'rental car', 'vehicle',
    'train', 'railway', 'rail',
    'cruise', 'ship', 'ferry',
    'tour', 'excursion', 'activity', 'booking',
    'reservation', 'reservations'
  ],
  rebooking: [
    'rebook', 'rebooked', 'rebooking',
    'new flight', 'replacement flight', 'alternative flight',
    'change', 'changed', 'reschedule', 'rescheduled'
  ],
  meals: [
    'food', 'meal', 'meals',
    'breakfast', 'lunch', 'dinner',
    'restaurant', 'cafe', 'dining',
    'ate', 'eating', 'eaten'
  ],
  emergency: [
    'emergency', 'urgent', 'urgently',
    'family', 'death', 'funeral', 'deceased',
    'illness', 'sick', 'seriously ill',
    'return', 'returned', 'came back', 'flew back',
    'cancel', 'cancelled', 'cancellation'
  ]
}

// ============================================================
// COVERAGE-SPECIFIC ADAPTIVE RULES
// ============================================================

export const ADAPTIVE_RULES: Record<string, AdaptiveRule[]> = {
  // BAGGAGE LOSS
  'baggage_loss': [
    {
      category: 'electronics',
      keywords: ENTITY_KEYWORDS.electronics,
      followUpQuestions: [
        'What brand and model is the {{item}}?',
        'When did you purchase it and what was the price?',
        'Do you have the original receipt or proof of purchase?'
      ],
      documentRequirements: [
        { type: 'purchase_receipt', description: 'Purchase receipt for {{item}}', required: true }
      ],
      valueThreshold: 500
    },
    {
      category: 'jewelry',
      keywords: ENTITY_KEYWORDS.jewelry,
      followUpQuestions: [
        'Can you describe the {{item}} in detail (brand, material, design)?',
        'What is the estimated value of the {{item}}?',
        'Do you have an appraisal certificate or insurance documentation?'
      ],
      documentRequirements: [
        { type: 'appraisal', description: 'Appraisal certificate for {{item}}', required: true },
        { type: 'purchase_receipt', description: 'Purchase receipt if available', required: false }
      ],
      valueThreshold: 500
    },
    {
      category: 'clothing',
      keywords: ENTITY_KEYWORDS.clothing,
      followUpQuestions: [
        'Can you provide an itemized list of clothing with estimated values?',
        'Are any of the items designer brands?'
      ],
      documentRequirements: [
        { type: 'itemized_list', description: 'List of clothing items with values', required: true }
      ]
    },
    {
      category: 'valuables',
      keywords: ENTITY_KEYWORDS.valuables,
      followUpQuestions: [
        'What is the estimated value of the {{item}}?',
        'Can you describe the {{item}} in detail?'
      ],
      documentRequirements: [
        { type: 'proof_of_value', description: 'Proof of value for {{item}}', required: true }
      ]
    },
    {
      category: 'documents',
      keywords: ENTITY_KEYWORDS.documents,
      followUpQuestions: [
        'Which documents were lost?',
        'Have you reported the loss to the relevant authorities?'
      ],
      documentRequirements: [
        { type: 'police_report', description: 'Police report for lost documents', required: false }
      ]
    }
  ],

  // BAGGAGE DELAY
  'baggage_delay': [
    {
      category: 'essentials',
      keywords: ['essentials', 'toiletries', 'clothes', 'necessities', 'items', 'purchase', 'bought'],
      followUpQuestions: [
        'What essential items did you need to purchase during the delay?',
        'What was the total amount spent on essential purchases?'
      ],
      documentRequirements: [
        { type: 'purchase_receipts', description: 'Receipts for essential items purchased', required: true }
      ]
    }
  ],

  // BAGGAGE DAMAGE
  'baggage_damage': [
    {
      category: 'electronics',
      keywords: ENTITY_KEYWORDS.electronics,
      followUpQuestions: [
        'What {{item}} was damaged?',
        'Can you describe the extent of the damage?',
        'What is the estimated repair or replacement cost?'
      ],
      documentRequirements: [
        { type: 'damage_photos', description: 'Photos of damaged {{item}}', required: true },
        { type: 'repair_estimate', description: 'Repair estimate or replacement quote', required: true }
      ]
    },
    {
      category: 'luggage',
      keywords: ['suitcase', 'bag', 'luggage', 'baggage', 'trunk', 'carry-on', 'checked bag'],
      followUpQuestions: [
        'What type of luggage was damaged (suitcase, bag, etc.)?',
        'Can you describe the damage (broken wheel, torn, crushed, etc.)?',
        'What brand is the luggage and how old is it?'
      ],
      documentRequirements: [
        { type: 'damage_photos', description: 'Photos showing the damage', required: true },
        { type: 'repair_quote', description: 'Repair quote or replacement cost estimate', required: true }
      ]
    }
  ],

  // FLIGHT CANCELLATION
  'flight_cancellation': [
    {
      category: 'rebooking',
      keywords: ENTITY_KEYWORDS.rebooking,
      followUpQuestions: [
        'What was the cost of the replacement flight?',
        'Which airline did you rebook with?',
        'What was the new departure date and time?'
      ],
      documentRequirements: [
        { type: 'new_booking', description: 'Confirmation of replacement booking', required: true },
        { type: 'payment_receipt', description: 'Payment receipt for new booking', required: true }
      ]
    },
    {
      category: 'accommodation',
      keywords: ['hotel', 'stayed', 'overnight', 'accommodation', 'lodging', 'motel', 'airbnb'],
      followUpQuestions: [
        'Which hotel did you stay at?',
        'How many nights did you stay?',
        'What was the total accommodation cost?'
      ],
      documentRequirements: [
        { type: 'hotel_receipt', description: 'Hotel invoice/receipt', required: true }
      ]
    },
    {
      category: 'meals',
      keywords: ENTITY_KEYWORDS.meals,
      followUpQuestions: [
        'What was the total spent on meals during the delay?',
        'How many meals did this cover?'
      ],
      documentRequirements: [
        { type: 'meal_receipts', description: 'Receipts for meals', required: false }
      ]
    },
    {
      category: 'transportation',
      keywords: ['taxi', 'uber', 'lyft', 'transport', 'transportation', 'shuttle', 'bus', 'train'],
      followUpQuestions: [
        'What transportation expenses did you incur?',
        'What was the total cost?'
      ],
      documentRequirements: [
        { type: 'transport_receipts', description: 'Transportation receipts', required: false }
      ]
    }
  ],

  // FLIGHT DELAY
  'flight_delay': [
    {
      category: 'accommodation',
      keywords: ['hotel', 'stayed', 'overnight', 'accommodation', 'lodging'],
      followUpQuestions: [
        'Did you need to stay overnight due to the delay?',
        'Which hotel did you stay at and what was the cost?'
      ],
      documentRequirements: [
        { type: 'hotel_receipt', description: 'Hotel invoice/receipt', required: true }
      ]
    },
    {
      category: 'meals',
      keywords: ENTITY_KEYWORDS.meals,
      followUpQuestions: [
        'What were your meal expenses during the delay?'
      ],
      documentRequirements: [
        { type: 'meal_receipts', description: 'Receipts for meals', required: false }
      ]
    }
  ],

  // MEDICAL EMERGENCY
  'medical_emergency': [
    {
      category: 'hospitalization',
      keywords: ['hospital', 'admitted', 'emergency room', 'er', 'icu', 'hospitalized', 'hospitalization'],
      followUpQuestions: [
        'Which hospital were you treated at?',
        'How many days were you hospitalized?',
        'What was the diagnosis or condition treated?',
        'What was the total hospital bill?'
      ],
      documentRequirements: [
        { type: 'hospital_bill', description: 'Itemized hospital bill', required: true },
        { type: 'discharge_summary', description: 'Hospital discharge summary', required: true },
        { type: 'admission_record', description: 'Hospital admission record', required: true }
      ]
    },
    {
      category: 'medication',
      keywords: ['medicine', 'medication', 'prescription', 'pharmacy', 'drugs', 'prescribed'],
      followUpQuestions: [
        'What medications were prescribed?',
        'What was the total cost of medications?'
      ],
      documentRequirements: [
        { type: 'prescription', description: 'Doctor\'s prescription', required: true },
        { type: 'pharmacy_receipt', description: 'Pharmacy receipt', required: true }
      ]
    },
    {
      category: 'doctor_visit',
      keywords: ['doctor', 'clinic', 'consultation', 'checkup', 'examined', 'physician', 'specialist'],
      followUpQuestions: [
        'Which doctor/clinic did you visit?',
        'What was the consultation fee?',
        'What was the diagnosis?'
      ],
      documentRequirements: [
        { type: 'medical_report', description: 'Doctor\'s report/diagnosis', required: true },
        { type: 'consultation_receipt', description: 'Receipt for consultation', required: true }
      ]
    },
    {
      category: 'surgery',
      keywords: ['surgery', 'operation', 'surgical', 'procedure', 'operated'],
      followUpQuestions: [
        'What surgical procedure was performed?',
        'Which hospital/facility was it performed at?',
        'What was the total surgical cost?'
      ],
      documentRequirements: [
        { type: 'surgical_report', description: 'Surgical procedure report', required: true },
        { type: 'surgeon_bill', description: 'Surgeon\'s bill', required: true },
        { type: 'hospital_bill', description: 'Hospital facility charges', required: true }
      ]
    },
    {
      category: 'ambulance',
      keywords: ['ambulance', 'emergency transport', 'air ambulance', 'medevac'],
      followUpQuestions: [
        'Did you require ambulance transportation?',
        'What was the ambulance service cost?'
      ],
      documentRequirements: [
        { type: 'ambulance_receipt', description: 'Ambulance service receipt', required: true }
      ]
    }
  ],

  // TRIP INTERRUPTION
  'trip_interruption': [
    {
      category: 'emergency_return',
      keywords: ['return', 'came back', 'flew back', 'emergency', 'family', 'death', 'funeral', 'illness'],
      followUpQuestions: [
        'What was the reason for the early return?',
        'What was the cost of the return flight?',
        'What date did you have to return?'
      ],
      documentRequirements: [
        { type: 'return_ticket', description: 'Emergency return flight booking', required: true },
        { type: 'proof_of_emergency', description: 'Documentation of emergency (death certificate, hospital letter, etc.)', required: true }
      ]
    },
    {
      category: 'unused_bookings',
      keywords: ['hotel', 'tour', 'activity', 'booked', 'reservation', 'unused', 'prepaid', 'non-refundable'],
      followUpQuestions: [
        'What bookings/reservations were unused?',
        'What was the total value of unused bookings?',
        'Were any of these refundable?'
      ],
      documentRequirements: [
        { type: 'booking_confirmations', description: 'Original booking confirmations', required: true },
        { type: 'cancellation_proof', description: 'Cancellation confirmations or refund denials', required: true }
      ]
    }
  ],

  // TRIP CANCELLATION
  'trip_cancellation': [
    {
      category: 'cancellation_reason',
      keywords: ['illness', 'sick', 'medical', 'emergency', 'death', 'work', 'job', 'family'],
      followUpQuestions: [
        'What was the reason for cancelling your trip?',
        'When did you need to cancel?'
      ],
      documentRequirements: [
        { type: 'cancellation_proof', description: 'Proof of cancellation reason (medical certificate, death certificate, etc.)', required: true }
      ]
    },
    {
      category: 'prepaid_expenses',
      keywords: ['flight', 'hotel', 'tour', 'booking', 'reservation', 'prepaid', 'deposit', 'non-refundable'],
      followUpQuestions: [
        'What prepaid bookings could not be refunded?',
        'What was the total non-refundable amount?'
      ],
      documentRequirements: [
        { type: 'booking_receipts', description: 'Receipts for prepaid bookings', required: true },
        { type: 'refund_denial', description: 'Evidence of refund denial or non-refundable terms', required: true }
      ]
    }
  ]
}

// ============================================================
// COVERAGE TYPE SLUG MAPPING
// ============================================================

// Map coverage type names/slugs to rule keys
// Handles: database slugs (with hyphens), names (with spaces), and normalized forms (with underscores)
export const COVERAGE_TYPE_MAPPING: Record<string, string> = {
  // Baggage Loss - handles various formats
  'baggage_loss': 'baggage_loss',
  'baggage-loss': 'baggage_loss',
  'baggage loss': 'baggage_loss',
  'lost baggage': 'baggage_loss',
  'lost luggage': 'baggage_loss',
  'baggage': 'baggage_loss', // fallback

  // Baggage Delay
  'baggage_delay': 'baggage_delay',
  'baggage-delay': 'baggage_delay',
  'baggage delay': 'baggage_delay',
  'delayed baggage': 'baggage_delay',
  'delayed luggage': 'baggage_delay',

  // Baggage Damage
  'baggage_damage': 'baggage_damage',
  'baggage-damage': 'baggage_damage',
  'baggage damage': 'baggage_damage',
  'damaged baggage': 'baggage_damage',
  'damaged luggage': 'baggage_damage',

  // Flight Cancellation
  'flight_cancellation': 'flight_cancellation',
  'flight-cancellation': 'flight_cancellation',
  'flight cancellation': 'flight_cancellation',
  'cancelled flight': 'flight_cancellation',
  'canceled flight': 'flight_cancellation',

  // Flight Delay
  'flight_delay': 'flight_delay',
  'flight-delay': 'flight_delay',
  'flight delay': 'flight_delay',
  'delayed flight': 'flight_delay',

  // Medical Emergency
  'medical_emergency': 'medical_emergency',
  'medical-emergency': 'medical_emergency',
  'medical emergency': 'medical_emergency',
  'medical': 'medical_emergency',
  'health emergency': 'medical_emergency',
  'hospitalization': 'medical_emergency', // maps to medical_emergency rules

  // Trip Interruption
  'trip_interruption': 'trip_interruption',
  'trip-interruption': 'trip_interruption',
  'trip interruption': 'trip_interruption',
  'interrupted trip': 'trip_interruption',

  // Trip Cancellation
  'trip_cancellation': 'trip_cancellation',
  'trip-cancellation': 'trip_cancellation',
  'trip cancellation': 'trip_cancellation',
  'cancelled trip': 'trip_cancellation',
  'canceled trip': 'trip_cancellation'
}

// ============================================================
// ENTITY EXTRACTION FUNCTIONS
// ============================================================

/**
 * Normalize text for matching
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim()
}

/**
 * Extract entities from user response based on keywords
 */
export function extractEntities(userResponse: string): ExtractedEntity[] {
  const normalizedResponse = normalizeText(userResponse)
  const entities: ExtractedEntity[] = []
  const foundCategories = new Set<string>()

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(ENTITY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Check if keyword exists in response (word boundary matching)
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (regex.test(normalizedResponse) && !foundCategories.has(`${category}-${keyword}`)) {
        entities.push({
          text: keyword,
          category,
          keywords: [keyword]
        })
        foundCategories.add(`${category}-${keyword}`)
      }
    }
  }

  return entities
}

/**
 * Get unique categories from extracted entities
 */
export function getCategories(entities: ExtractedEntity[]): string[] {
  return [...new Set(entities.map(e => e.category))]
}

/**
 * Normalize coverage type to rule key
 */
export function normalizeCoverageType(coverageType: string): string {
  const normalized = normalizeText(coverageType)

  // Try direct mapping first
  if (COVERAGE_TYPE_MAPPING[normalized]) {
    return COVERAGE_TYPE_MAPPING[normalized]
  }

  // Try partial matching
  for (const [key, value] of Object.entries(COVERAGE_TYPE_MAPPING)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }

  // Fallback: replace spaces/hyphens with underscores
  return normalized.replace(/[\s-]+/g, '_')
}

// ============================================================
// FOLLOW-UP QUESTION GENERATION
// ============================================================

/**
 * Generate a suggested answer key from entity and question context
 * Format: adaptive_<entity>_<field>
 */
function generateAnswerKey(entity: string, questionTemplate: string): string {
  // Normalize entity name (lowercase, replace spaces with underscores)
  const normalizedEntity = entity.toLowerCase().replace(/\s+/g, '_')

  // Extract field type from question template
  let field = 'info'
  const lowerQuestion = questionTemplate.toLowerCase()

  if (lowerQuestion.includes('brand') || lowerQuestion.includes('model')) {
    field = 'model'
  } else if (lowerQuestion.includes('purchase') && lowerQuestion.includes('price')) {
    field = 'purchase_price'
  } else if (lowerQuestion.includes('purchase') && lowerQuestion.includes('when')) {
    field = 'purchase_date'
  } else if (lowerQuestion.includes('value') || lowerQuestion.includes('worth') || lowerQuestion.includes('cost')) {
    field = 'value'
  } else if (lowerQuestion.includes('describe') || lowerQuestion.includes('detail')) {
    field = 'description'
  } else if (lowerQuestion.includes('receipt') || lowerQuestion.includes('proof')) {
    field = 'has_receipt'
  } else if (lowerQuestion.includes('date')) {
    field = 'date'
  } else if (lowerQuestion.includes('repair') || lowerQuestion.includes('replacement')) {
    field = 'repair_cost'
  } else if (lowerQuestion.includes('hotel') || lowerQuestion.includes('stay')) {
    field = 'hotel_info'
  } else if (lowerQuestion.includes('flight') || lowerQuestion.includes('airline')) {
    field = 'flight_info'
  } else if (lowerQuestion.includes('hospital') || lowerQuestion.includes('clinic')) {
    field = 'facility'
  } else if (lowerQuestion.includes('diagnosis') || lowerQuestion.includes('condition')) {
    field = 'diagnosis'
  } else if (lowerQuestion.includes('nights') || lowerQuestion.includes('days')) {
    field = 'duration'
  } else if (lowerQuestion.includes('appraisal') || lowerQuestion.includes('certificate')) {
    field = 'has_appraisal'
  } else if (lowerQuestion.includes('itemized') || lowerQuestion.includes('list')) {
    field = 'itemized_list'
  }

  return `adaptive_${normalizedEntity}_${field}`
}

/**
 * Generate a human-readable label from entity and question context
 */
function generateAnswerLabel(entity: string, questionTemplate: string): string {
  const lowerQuestion = questionTemplate.toLowerCase()

  // Capitalize first letter of entity
  const capitalizedEntity = entity.charAt(0).toUpperCase() + entity.slice(1)

  if (lowerQuestion.includes('brand') || lowerQuestion.includes('model')) {
    return `${capitalizedEntity} Model`
  } else if (lowerQuestion.includes('purchase') && lowerQuestion.includes('price')) {
    return `${capitalizedEntity} Purchase Price`
  } else if (lowerQuestion.includes('purchase') && lowerQuestion.includes('when')) {
    return `${capitalizedEntity} Purchase Date`
  } else if (lowerQuestion.includes('value') || lowerQuestion.includes('worth') || lowerQuestion.includes('cost')) {
    return `${capitalizedEntity} Value`
  } else if (lowerQuestion.includes('describe') || lowerQuestion.includes('detail')) {
    return `${capitalizedEntity} Description`
  } else if (lowerQuestion.includes('receipt') || lowerQuestion.includes('proof')) {
    return `${capitalizedEntity} Receipt Available`
  } else if (lowerQuestion.includes('repair') || lowerQuestion.includes('replacement')) {
    return `${capitalizedEntity} Repair/Replacement Cost`
  } else if (lowerQuestion.includes('nights') || lowerQuestion.includes('days')) {
    return `${capitalizedEntity} Duration`
  }

  return `${capitalizedEntity} Details`
}

/**
 * Generate follow-up questions based on extracted entities and coverage type
 */
export function generateFollowUpQuestions(
  entities: ExtractedEntity[],
  coverageTypeSlug: string
): string[] {
  const normalizedCoverage = normalizeCoverageType(coverageTypeSlug)
  const rules = ADAPTIVE_RULES[normalizedCoverage] || []
  const questions: string[] = []
  const askedQuestions = new Set<string>()

  for (const entity of entities) {
    // Find matching rules for this entity's category
    const matchingRules = rules.filter(rule =>
      rule.category === entity.category ||
      rule.keywords.some(k => entity.keywords.includes(k))
    )

    for (const rule of matchingRules) {
      for (const questionTemplate of rule.followUpQuestions) {
        // Replace {{item}} placeholder with the actual entity
        const question = questionTemplate.replace(/\{\{item\}\}/g, entity.text)

        // Avoid duplicate questions
        if (!askedQuestions.has(question)) {
          questions.push(question)
          askedQuestions.add(question)
        }
      }
    }
  }

  return questions
}

/**
 * Generate follow-up questions with suggested answer keys for structured storage
 */
export function generateFollowUpQuestionsWithKeys(
  entities: ExtractedEntity[],
  coverageTypeSlug: string
): FollowUpQuestionWithKey[] {
  const normalizedCoverage = normalizeCoverageType(coverageTypeSlug)
  const rules = ADAPTIVE_RULES[normalizedCoverage] || []
  const questions: FollowUpQuestionWithKey[] = []
  const askedQuestions = new Set<string>()

  for (const entity of entities) {
    // Find matching rules for this entity's category
    const matchingRules = rules.filter(rule =>
      rule.category === entity.category ||
      rule.keywords.some(k => entity.keywords.includes(k))
    )

    for (const rule of matchingRules) {
      for (const questionTemplate of rule.followUpQuestions) {
        // Replace {{item}} placeholder with the actual entity
        const question = questionTemplate.replace(/\{\{item\}\}/g, entity.text)

        // Avoid duplicate questions
        if (!askedQuestions.has(question)) {
          questions.push({
            question,
            suggested_answer_key: generateAnswerKey(entity.text, questionTemplate),
            suggested_label: generateAnswerLabel(entity.text, questionTemplate),
            entity: entity.text,
            category: entity.category
          })
          askedQuestions.add(question)
        }
      }
    }
  }

  return questions
}

/**
 * Get document requirements based on extracted entities and coverage type
 */
export function getDocumentRequirements(
  entities: ExtractedEntity[],
  coverageTypeSlug: string
): DocumentRequirementInfo[] {
  const normalizedCoverage = normalizeCoverageType(coverageTypeSlug)
  const rules = ADAPTIVE_RULES[normalizedCoverage] || []
  const requirements: DocumentRequirementInfo[] = []
  const addedTypes = new Set<string>()

  for (const entity of entities) {
    // Find matching rules for this entity's category
    const matchingRules = rules.filter(rule =>
      rule.category === entity.category ||
      rule.keywords.some(k => entity.keywords.includes(k))
    )

    for (const rule of matchingRules) {
      for (const doc of rule.documentRequirements) {
        const docType = doc.type
        const description = doc.description.replace(/\{\{item\}\}/g, entity.text)

        // Avoid duplicate document types
        if (!addedTypes.has(`${docType}-${entity.text}`)) {
          requirements.push({
            type: docType,
            description,
            required: doc.required
          })
          addedTypes.add(`${docType}-${entity.text}`)
        }
      }
    }
  }

  return requirements
}

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================

/**
 * Analyze user response and generate adaptive follow-ups
 */
export function analyzeUserResponse(
  userResponse: string,
  coverageTypeId: string,
  coverageTypeName?: string,
  currentAnswers?: Record<string, unknown>
): AnalysisResult {
  // Extract entities from response
  const entities = extractEntities(userResponse)
  const categories = getCategories(entities)

  // Determine coverage type slug for rules
  const coverageTypeSlug = coverageTypeName
    ? normalizeCoverageType(coverageTypeName)
    : coverageTypeId

  // Generate follow-up questions (both formats)
  const followUpQuestions = generateFollowUpQuestions(entities, coverageTypeSlug)
  const followUpQuestionsWithKeys = generateFollowUpQuestionsWithKeys(entities, coverageTypeSlug)

  // Get additional document requirements
  const documentRequirements = getDocumentRequirements(entities, coverageTypeSlug)

  // Check for high-value items
  const highValueCategories = ['electronics', 'jewelry', 'valuables']
  const hasHighValueItems = categories.some(c => highValueCategories.includes(c))

  return {
    extracted_entities: entities,
    categories,
    suggested_follow_up_questions: followUpQuestions,
    suggested_follow_up_questions_with_keys: followUpQuestionsWithKeys,
    additional_documents_required: documentRequirements,
    context: {
      coverage_type_id: coverageTypeId,
      coverage_type_slug: coverageTypeSlug,
      has_high_value_items: hasHighValueItems
    }
  }
}

/**
 * Get all rules for a coverage type (useful for system prompt context)
 */
export function getRulesForCoverageType(coverageTypeSlug: string): AdaptiveRule[] {
  const normalizedCoverage = normalizeCoverageType(coverageTypeSlug)
  return ADAPTIVE_RULES[normalizedCoverage] || []
}

/**
 * Check if a coverage type has adaptive rules configured
 */
export function hasAdaptiveRules(coverageTypeSlug: string): boolean {
  const normalizedCoverage = normalizeCoverageType(coverageTypeSlug)
  return normalizedCoverage in ADAPTIVE_RULES
}
