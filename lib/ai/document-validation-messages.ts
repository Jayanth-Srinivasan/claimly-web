/**
 * User-friendly document validation messages and re-upload guidance
 * This module provides clear, empathetic messages for document validation scenarios
 */

export type ValidationStatus = 'valid' | 'needs_review' | 'invalid' | 'reupload_required'

/**
 * Document type definitions with descriptions and guidance
 */
export const DOCUMENT_TYPES: Record<string, {
  name: string
  description: string
  typical_contents: string[]
  guidance: string
}> = {
  // Baggage Claims
  baggage_receipt: {
    name: 'Baggage Claim Receipt',
    description: 'Receipt issued by the airline when baggage is reported lost or delayed',
    typical_contents: ['Passenger name', 'Flight number', 'Bag tag number', 'Date of report'],
    guidance: 'This is the receipt you receive when you report lost baggage at the airport baggage claims counter.',
  },
  airline_pir: {
    name: 'Property Irregularity Report (PIR)',
    description: 'Official airline document recording lost, delayed, or damaged baggage',
    typical_contents: ['PIR reference number', 'Flight details', 'Passenger details', 'Baggage description'],
    guidance: 'The PIR is given to you at the airport when you report baggage issues. It has a unique reference number starting with letters and numbers.',
  },
  baggage_tag: {
    name: 'Baggage Tag',
    description: 'The tag attached to your checked luggage at check-in',
    typical_contents: ['Barcode', 'Flight routing', 'Bag number'],
    guidance: 'This is the sticker placed on your bag at check-in. The receipt portion is usually attached to your boarding pass.',
  },
  purchase_receipt: {
    name: 'Purchase Receipt',
    description: 'Receipts proving the value of items in lost baggage',
    typical_contents: ['Item description', 'Purchase price', 'Date', 'Store name'],
    guidance: 'Upload receipts for valuable items that were in your lost baggage to help verify their value.',
  },
  item_receipt: {
    name: 'Item Receipt',
    description: 'Proof of purchase for individual items',
    typical_contents: ['Item description', 'Amount paid', 'Merchant name'],
    guidance: 'Any receipt showing what you paid for items in your baggage.',
  },

  // Flight Claims
  cancellation_notice: {
    name: 'Flight Cancellation Notice',
    description: 'Official notification from the airline about flight cancellation',
    typical_contents: ['Flight number', 'Cancellation date', 'Reason (if provided)', 'Airline contact'],
    guidance: 'This is typically an email or text message from the airline informing you of the cancellation.',
  },
  airline_notification: {
    name: 'Airline Notification',
    description: 'Any official communication from the airline about flight changes',
    typical_contents: ['Flight details', 'Nature of change', 'Date and time'],
    guidance: 'Emails, texts, or app notifications from your airline about schedule changes.',
  },
  cancellation_email: {
    name: 'Cancellation Email',
    description: 'Email from airline confirming flight cancellation',
    typical_contents: ['Booking reference', 'Flight details', 'Cancellation confirmation'],
    guidance: 'The email you received when your flight was cancelled - screenshot or PDF is fine.',
  },
  booking_confirmation: {
    name: 'Booking Confirmation',
    description: 'Original flight booking confirmation',
    typical_contents: ['Booking reference', 'Passenger names', 'Flight times', 'Route', 'Price paid'],
    guidance: 'The confirmation email or document you received when you booked your flight.',
  },
  delay_notification: {
    name: 'Flight Delay Notification',
    description: 'Notice from airline about flight delay',
    typical_contents: ['Original time', 'New time', 'Flight number', 'Delay duration'],
    guidance: 'Communication from your airline showing the delay - can be email, text, or app notification.',
  },
  delay_certificate: {
    name: 'Delay Certificate',
    description: 'Official certificate from airline confirming the delay',
    typical_contents: ['Flight number', 'Delay duration', 'Airline stamp/signature'],
    guidance: 'Some airlines provide official certificates at the gate or upon request.',
  },
  boarding_pass: {
    name: 'Boarding Pass',
    description: 'Your boarding pass for the flight',
    typical_contents: ['Passenger name', 'Flight number', 'Date', 'Gate', 'Seat'],
    guidance: 'Your physical or digital boarding pass showing you were booked on the flight.',
  },
  ticket: {
    name: 'Flight Ticket',
    description: 'E-ticket or paper ticket',
    typical_contents: ['Ticket number', 'Passenger details', 'Flight itinerary'],
    guidance: 'Your e-ticket receipt or paper ticket showing your booking.',
  },
  itinerary: {
    name: 'Travel Itinerary',
    description: 'Document showing your planned travel schedule',
    typical_contents: ['Flight details', 'Dates', 'Routes', 'Booking references'],
    guidance: 'Your complete travel itinerary from the airline or travel agent.',
  },

  // Medical Claims
  medical_report: {
    name: 'Medical Report',
    description: 'Doctor\'s report detailing diagnosis and treatment',
    typical_contents: ['Patient name', 'Diagnosis', 'Treatment provided', 'Doctor\'s signature'],
    guidance: 'Request a detailed medical report from your treating physician.',
  },
  doctors_report: {
    name: 'Doctor\'s Report',
    description: 'Written report from your treating doctor',
    typical_contents: ['Medical history', 'Examination findings', 'Diagnosis', 'Recommendations'],
    guidance: 'Ask your doctor for a written report summarizing your condition and treatment.',
  },
  diagnosis: {
    name: 'Diagnosis Document',
    description: 'Document confirming medical diagnosis',
    typical_contents: ['Patient details', 'Diagnosis', 'Date', 'Physician details'],
    guidance: 'Official diagnosis from your healthcare provider.',
  },
  hospital_bill: {
    name: 'Hospital Bill',
    description: 'Itemized bill from the hospital',
    typical_contents: ['Patient name', 'Itemized services', 'Amounts', 'Hospital details'],
    guidance: 'Request an itemized bill showing all services and charges.',
  },
  medical_bill: {
    name: 'Medical Bill',
    description: 'Bill for medical services',
    typical_contents: ['Services rendered', 'Costs', 'Provider information'],
    guidance: 'Bills from any healthcare provider - doctor, clinic, pharmacy, etc.',
  },
  invoice: {
    name: 'Medical Invoice',
    description: 'Invoice for medical expenses',
    typical_contents: ['Service description', 'Amount', 'Provider', 'Date'],
    guidance: 'Any invoice related to your medical treatment.',
  },
  prescription: {
    name: 'Prescription',
    description: 'Doctor\'s prescription for medication',
    typical_contents: ['Medication name', 'Dosage', 'Doctor\'s details', 'Date'],
    guidance: 'The prescription given by your doctor for medications.',
  },
  medication_receipt: {
    name: 'Medication Receipt',
    description: 'Receipt from purchasing prescribed medication',
    typical_contents: ['Medication name', 'Price paid', 'Pharmacy details'],
    guidance: 'Receipts from pharmacies for prescribed medications.',
  },
  discharge_summary: {
    name: 'Discharge Summary',
    description: 'Hospital discharge documentation',
    typical_contents: ['Admission/discharge dates', 'Diagnosis', 'Treatment summary', 'Follow-up instructions'],
    guidance: 'The summary provided when you are discharged from hospital.',
  },

  // Trip Interruption
  interruption_proof: {
    name: 'Interruption Proof',
    description: 'Documentation proving reason for trip interruption',
    typical_contents: ['Nature of emergency', 'Dates', 'Supporting details'],
    guidance: 'Any document that proves why you had to interrupt your trip.',
  },
  emergency_documentation: {
    name: 'Emergency Documentation',
    description: 'Documents related to the emergency causing interruption',
    typical_contents: ['Emergency details', 'Dates', 'Official documentation'],
    guidance: 'Police reports, medical records, or other documents related to the emergency.',
  },
  incident_report: {
    name: 'Incident Report',
    description: 'Official report of the incident',
    typical_contents: ['Incident description', 'Date/time', 'Location', 'Report number'],
    guidance: 'Police report or official incident documentation.',
  },
  booking_changes: {
    name: 'Booking Changes Documentation',
    description: 'Records of changes made to your booking',
    typical_contents: ['Original booking', 'New booking', 'Change fees'],
    guidance: 'Documentation showing how your travel plans were changed.',
  },
  new_booking: {
    name: 'New Booking Confirmation',
    description: 'Confirmation of rebooked travel',
    typical_contents: ['New flight/hotel details', 'Booking reference', 'Cost'],
    guidance: 'Confirmation of any new bookings made due to the interruption.',
  },
  original_booking: {
    name: 'Original Booking',
    description: 'Your original travel booking before interruption',
    typical_contents: ['Original itinerary', 'Booking reference', 'Cost paid'],
    guidance: 'Your original booking confirmation showing the planned trip.',
  },
  original_itinerary: {
    name: 'Original Itinerary',
    description: 'Your planned trip itinerary',
    typical_contents: ['Travel dates', 'Destinations', 'Accommodations'],
    guidance: 'Your complete original travel plan.',
  },

  // General
  id_document: {
    name: 'ID Document',
    description: 'Government-issued identification',
    typical_contents: ['Name', 'Photo', 'ID number', 'Expiry date'],
    guidance: 'Passport, driver\'s license, or government ID - may be needed for identity verification.',
  },
  bank_statement: {
    name: 'Bank Statement',
    description: 'Statement showing relevant transactions',
    typical_contents: ['Transaction details', 'Dates', 'Amounts'],
    guidance: 'Bank statement showing payments related to your claim.',
  },
  supporting_document: {
    name: 'Supporting Document',
    description: 'Any document supporting your claim',
    typical_contents: ['Relevant information about your claim'],
    guidance: 'Any document that helps verify the details of your claim.',
  },
  proof: {
    name: 'Proof Document',
    description: 'Evidence supporting your claim',
    typical_contents: ['Information relevant to your claim'],
    guidance: 'Documents that prove or support the facts of your claim.',
  },
  receipt: {
    name: 'Receipt',
    description: 'Receipt for expenses related to your claim',
    typical_contents: ['Description', 'Amount', 'Date', 'Vendor'],
    guidance: 'Receipts for expenses you\'re claiming reimbursement for.',
  },
}

/**
 * Get validation message based on status and context
 */
export function getValidationMessage(
  status: ValidationStatus,
  detectedType: string | undefined,
  expectedType: string | undefined,
  errors: string[],
  warnings: string[]
): {
  title: string
  message: string
  guidance?: string
  isBlocking: boolean
} {
  switch (status) {
    case 'valid':
      return {
        title: 'Document Accepted',
        message: `Your ${detectedType ? getDocumentTypeName(detectedType) : 'document'} has been successfully validated and saved to your claim.`,
        isBlocking: false,
      }

    case 'needs_review':
      return {
        title: 'Document Saved for Review',
        message: `Your document has been saved, but it will be reviewed by our team due to: ${warnings.join(', ')}`,
        guidance: 'You can continue with your claim. Our team will review this document during processing.',
        isBlocking: false,
      }

    case 'invalid':
      return {
        title: 'Document Has Issues',
        message: errors.length > 0
          ? `We found the following issues with your document: ${errors.join('. ')}`
          : 'The document could not be validated.',
        guidance: 'Please review the issues above and consider uploading a corrected version.',
        isBlocking: true,
      }

    case 'reupload_required':
      const expectedDoc = expectedType ? DOCUMENT_TYPES[expectedType] : undefined
      const detectedDoc = detectedType ? DOCUMENT_TYPES[detectedType] : undefined

      let message = ''
      let guidance = ''

      if (detectedType && expectedType && detectedType !== expectedType) {
        message = `This appears to be a ${detectedDoc?.name || detectedType}, but I need a ${expectedDoc?.name || expectedType} for this claim.`
        guidance = expectedDoc?.guidance || `Please upload a ${expectedDoc?.name || expectedType}.`
      } else if (errors.length > 0) {
        message = errors.join('. ')
        guidance = expectedDoc?.guidance || 'Please upload a clearer or correct document.'
      } else {
        message = 'This document cannot be accepted for your claim.'
        guidance = expectedDoc?.guidance || 'Please upload the correct document type.'
      }

      return {
        title: 'Different Document Needed',
        message,
        guidance,
        isBlocking: true,
      }

    default:
      return {
        title: 'Document Status Unknown',
        message: 'We could not determine the status of this document.',
        guidance: 'Please try uploading again.',
        isBlocking: true,
      }
  }
}

/**
 * Get user-friendly document type name
 */
export function getDocumentTypeName(typeKey: string | undefined | null): string {
  if (!typeKey) return 'Document'
  return DOCUMENT_TYPES[typeKey]?.name || typeKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Get document type description
 */
export function getDocumentTypeDescription(typeKey: string | undefined | null): string {
  if (!typeKey) return ''
  return DOCUMENT_TYPES[typeKey]?.description || ''
}

/**
 * Get guidance for uploading a specific document type
 */
export function getDocumentUploadGuidance(typeKey: string | undefined | null): string {
  if (!typeKey) return 'Please upload a relevant document.'
  return DOCUMENT_TYPES[typeKey]?.guidance || `Please upload a ${getDocumentTypeName(typeKey)}.`
}

/**
 * Generate empathetic re-upload message
 */
export function generateReuploadMessage(
  detectedType: string | undefined,
  expectedTypes: string[],
  reason: string
): string {
  const parts: string[] = []

  parts.push("I understand you've uploaded a document, but I need something different for your claim.")

  if (detectedType && expectedTypes.length > 0) {
    const detected = getDocumentTypeName(detectedType)
    const expected = expectedTypes.filter(Boolean).map(getDocumentTypeName).join(' or ')
    parts.push(`This appears to be a ${detected}, but I need a ${expected}.`)
  }

  if (reason) {
    parts.push(reason)
  }

  // Add guidance for the first expected type
  const validExpectedTypes = expectedTypes.filter(Boolean)
  if (validExpectedTypes.length > 0) {
    const guidance = getDocumentUploadGuidance(validExpectedTypes[0])
    if (guidance) {
      parts.push(guidance)
    }
  }

  return parts.join(' ')
}

/**
 * Get required documents description for a coverage type
 */
export function formatRequiredDocumentsMessage(
  requirements: Array<{
    documentTypes: string[]
    minFiles: number
    message?: string
  }>
): string {
  if (requirements.length === 0) {
    return 'Please upload any relevant supporting documents for your claim.'
  }

  const parts: string[] = ['To process your claim, I\'ll need the following documents:']

  requirements.forEach((req, index) => {
    const docNames = req.documentTypes.map(getDocumentTypeName).join(' or ')
    const required = req.minFiles > 0 ? ' (required)' : ' (optional but helpful)'

    if (req.message) {
      parts.push(`${index + 1}. ${req.message}${required}`)
    } else {
      parts.push(`${index + 1}. ${docNames}${required}`)
    }
  })

  return parts.join('\n')
}

/**
 * Get completeness check message
 */
export function getCompletenessMessage(
  validDocuments: string[],
  missingDocuments: string[],
  invalidDocuments: Array<{ name: string; reason: string }>
): {
  isComplete: boolean
  message: string
  canProceed: boolean
} {
  const parts: string[] = []
  let canProceed = true

  if (validDocuments.length > 0) {
    parts.push(`Documents received: ${validDocuments.map(getDocumentTypeName).join(', ')}.`)
  }

  if (missingDocuments.length > 0) {
    parts.push(`Still needed: ${missingDocuments.map(getDocumentTypeName).join(', ')}.`)
    canProceed = false
  }

  if (invalidDocuments.length > 0) {
    parts.push(`Issues with: ${invalidDocuments.map(d => `${getDocumentTypeName(d.name)} (${d.reason})`).join('; ')}.`)
    canProceed = false
  }

  if (canProceed && validDocuments.length > 0) {
    parts.push('All required documents have been validated.')
  }

  return {
    isComplete: canProceed && missingDocuments.length === 0 && invalidDocuments.length === 0,
    message: parts.join(' '),
    canProceed,
  }
}
