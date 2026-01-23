-- Strict Document Requirements for Travel Coverage Types
-- These rules have NO conditions (always apply) and define specific required document types
-- Run this AFTER the migration to add strict document validation

-- First, let's identify your coverage types (adjust these UUIDs based on your actual data)
-- You can find your coverage_type_ids by running:
-- SELECT id, name, slug FROM coverage_types WHERE is_active = true;

-- BAGGAGE LOSS - requires PIR or baggage receipt
INSERT INTO rules (
    coverage_type_id,
    rule_type,
    name,
    description,
    conditions,
    actions,
    is_active,
    priority
)
SELECT
    ct.id,
    'document'::rule_type,
    'Baggage Loss - Required Documents',
    'Mandatory documents for baggage loss claims - always required',
    '[]'::jsonb,  -- No conditions = always applies
    '[
      {
        "type": "require_document",
        "documentTypes": ["baggage_receipt", "airline_pir", "property_irregularity_report"],
        "minFiles": 1,
        "maxFiles": 5,
        "allowedFormats": ["pdf", "jpg", "jpeg", "png"],
        "errorMessage": "Please upload your Property Irregularity Report (PIR) from the airline or baggage claim receipt"
      }
    ]'::jsonb,
    true,
    200  -- Higher priority than existing rules
FROM coverage_types ct
WHERE ct.slug ILIKE '%baggage%'
   OR ct.name ILIKE '%baggage%'
   OR ct.slug ILIKE '%luggage%'
   OR ct.name ILIKE '%luggage%'
ON CONFLICT DO NOTHING;

-- FLIGHT CANCELLATION - requires cancellation notice + booking confirmation
INSERT INTO rules (
    coverage_type_id,
    rule_type,
    name,
    description,
    conditions,
    actions,
    is_active,
    priority
)
SELECT
    ct.id,
    'document'::rule_type,
    'Flight Cancellation - Required Documents',
    'Mandatory documents for flight cancellation claims - always required',
    '[]'::jsonb,
    '[
      {
        "type": "require_document",
        "documentTypes": ["cancellation_notice", "cancellation_email", "airline_notification"],
        "minFiles": 1,
        "maxFiles": 3,
        "allowedFormats": ["pdf", "jpg", "jpeg", "png"],
        "errorMessage": "Please upload the flight cancellation notice from your airline"
      },
      {
        "type": "require_document",
        "documentTypes": ["booking_confirmation", "ticket", "itinerary", "e_ticket"],
        "minFiles": 1,
        "maxFiles": 3,
        "allowedFormats": ["pdf", "jpg", "jpeg", "png"],
        "errorMessage": "Please upload your original flight booking confirmation"
      }
    ]'::jsonb,
    true,
    200
FROM coverage_types ct
WHERE (ct.slug ILIKE '%flight%' AND ct.slug ILIKE '%cancel%')
   OR (ct.name ILIKE '%flight%' AND ct.name ILIKE '%cancel%')
ON CONFLICT DO NOTHING;

-- FLIGHT DELAY - requires delay notification + boarding pass
INSERT INTO rules (
    coverage_type_id,
    rule_type,
    name,
    description,
    conditions,
    actions,
    is_active,
    priority
)
SELECT
    ct.id,
    'document'::rule_type,
    'Flight Delay - Required Documents',
    'Mandatory documents for flight delay claims - always required',
    '[]'::jsonb,
    '[
      {
        "type": "require_document",
        "documentTypes": ["delay_notification", "delay_certificate", "airline_notification"],
        "minFiles": 1,
        "maxFiles": 3,
        "allowedFormats": ["pdf", "jpg", "jpeg", "png"],
        "errorMessage": "Please upload proof of flight delay from your airline"
      },
      {
        "type": "require_document",
        "documentTypes": ["boarding_pass", "ticket", "booking_confirmation"],
        "minFiles": 1,
        "maxFiles": 2,
        "allowedFormats": ["pdf", "jpg", "jpeg", "png"],
        "errorMessage": "Please upload your boarding pass or flight ticket"
      }
    ]'::jsonb,
    true,
    200
FROM coverage_types ct
WHERE (ct.slug ILIKE '%flight%' AND ct.slug ILIKE '%delay%')
   OR (ct.name ILIKE '%flight%' AND ct.name ILIKE '%delay%')
ON CONFLICT DO NOTHING;

-- MEDICAL EMERGENCY - requires medical report + bills
INSERT INTO rules (
    coverage_type_id,
    rule_type,
    name,
    description,
    conditions,
    actions,
    is_active,
    priority
)
SELECT
    ct.id,
    'document'::rule_type,
    'Medical Emergency - Required Documents',
    'Mandatory documents for medical claims - always required',
    '[]'::jsonb,
    '[
      {
        "type": "require_document",
        "documentTypes": ["medical_report", "doctors_report", "diagnosis", "discharge_summary"],
        "minFiles": 1,
        "maxFiles": 5,
        "allowedFormats": ["pdf", "jpg", "jpeg", "png"],
        "errorMessage": "Please upload your medical report or doctor diagnosis"
      },
      {
        "type": "require_document",
        "documentTypes": ["hospital_bill", "medical_bill", "invoice", "receipt"],
        "minFiles": 1,
        "maxFiles": 10,
        "allowedFormats": ["pdf", "jpg", "jpeg", "png"],
        "errorMessage": "Please upload itemized bills from the hospital or healthcare provider"
      }
    ]'::jsonb,
    true,
    200
FROM coverage_types ct
WHERE ct.slug ILIKE '%medical%'
   OR ct.name ILIKE '%medical%'
   OR ct.slug ILIKE '%health%'
   OR ct.name ILIKE '%health%'
ON CONFLICT DO NOTHING;

-- TRIP INTERRUPTION - requires proof + original booking
INSERT INTO rules (
    coverage_type_id,
    rule_type,
    name,
    description,
    conditions,
    actions,
    is_active,
    priority
)
SELECT
    ct.id,
    'document'::rule_type,
    'Trip Interruption - Required Documents',
    'Mandatory documents for trip interruption claims - always required',
    '[]'::jsonb,
    '[
      {
        "type": "require_document",
        "documentTypes": ["interruption_proof", "emergency_documentation", "incident_report"],
        "minFiles": 1,
        "maxFiles": 5,
        "allowedFormats": ["pdf", "jpg", "jpeg", "png"],
        "errorMessage": "Please upload documentation proving the reason for trip interruption"
      },
      {
        "type": "require_document",
        "documentTypes": ["original_booking", "original_itinerary", "booking_confirmation"],
        "minFiles": 1,
        "maxFiles": 3,
        "allowedFormats": ["pdf", "jpg", "jpeg", "png"],
        "errorMessage": "Please upload your original trip itinerary or booking"
      }
    ]'::jsonb,
    true,
    200
FROM coverage_types ct
WHERE ct.slug ILIKE '%interrupt%'
   OR ct.name ILIKE '%interrupt%'
   OR ct.slug ILIKE '%trip%'
   OR ct.name ILIKE '%trip%'
ON CONFLICT DO NOTHING;

-- Verify the new rules were added
SELECT name, rule_type, priority, is_active
FROM rules
WHERE rule_type = 'document'
  AND actions::text LIKE '%require_document%'
ORDER BY coverage_type_id, priority DESC;
