-- Seed Document Rules for Travel Coverage Types
-- These rules define the required documents for each coverage type
-- Run this after coverage_types have been created

-- Function to insert document rules for a coverage type by slug
-- This allows dynamic insertion without hardcoding UUIDs

-- Baggage Loss Documents Rule
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
    'Baggage Loss Required Documents',
    'Required documents for baggage loss claims',
    '[]'::jsonb,  -- Empty conditions = always applies
    jsonb_build_array(
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('baggage_receipt', 'airline_pir', 'baggage_tag'),
            'minFiles', 1,
            'maxFiles', 5,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload your Property Irregularity Report (PIR) from the airline or baggage claim receipt'
        ),
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('purchase_receipt', 'item_receipt'),
            'minFiles', 0,
            'maxFiles', 10,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Upload receipts for items in your lost baggage to help verify their value (optional but recommended)'
        )
    ),
    true,
    100
FROM coverage_types ct
WHERE ct.slug ILIKE '%baggage%' OR ct.name ILIKE '%baggage%'
ON CONFLICT DO NOTHING;

-- Flight Cancellation Documents Rule
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
    'Flight Cancellation Required Documents',
    'Required documents for flight cancellation claims',
    '[]'::jsonb,
    jsonb_build_array(
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('cancellation_notice', 'airline_notification', 'cancellation_email'),
            'minFiles', 1,
            'maxFiles', 3,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload the flight cancellation notice from your airline'
        ),
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('booking_confirmation', 'ticket', 'itinerary'),
            'minFiles', 1,
            'maxFiles', 3,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload your original flight booking confirmation'
        )
    ),
    true,
    100
FROM coverage_types ct
WHERE ct.slug ILIKE '%flight%cancel%' OR ct.name ILIKE '%flight%cancel%'
ON CONFLICT DO NOTHING;

-- Flight Delay Documents Rule
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
    'Flight Delay Required Documents',
    'Required documents for flight delay claims',
    '[]'::jsonb,
    jsonb_build_array(
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('delay_notification', 'delay_certificate', 'airline_notification'),
            'minFiles', 1,
            'maxFiles', 3,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload proof of flight delay from your airline'
        ),
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('boarding_pass', 'ticket'),
            'minFiles', 1,
            'maxFiles', 2,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload your boarding pass or flight ticket'
        )
    ),
    true,
    100
FROM coverage_types ct
WHERE (ct.slug ILIKE '%flight%delay%' OR ct.name ILIKE '%flight%delay%')
  AND ct.slug NOT ILIKE '%cancel%' AND ct.name NOT ILIKE '%cancel%'
ON CONFLICT DO NOTHING;

-- Medical Emergency Documents Rule
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
    'Medical Emergency Required Documents',
    'Required documents for medical emergency claims',
    '[]'::jsonb,
    jsonb_build_array(
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('medical_report', 'doctors_report', 'diagnosis'),
            'minFiles', 1,
            'maxFiles', 5,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload your medical report or doctor''s diagnosis'
        ),
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('hospital_bill', 'medical_bill', 'invoice'),
            'minFiles', 1,
            'maxFiles', 10,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload itemized bills from the hospital or healthcare provider'
        ),
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('prescription', 'medication_receipt'),
            'minFiles', 0,
            'maxFiles', 5,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Upload any prescriptions or medication receipts if applicable'
        )
    ),
    true,
    100
FROM coverage_types ct
WHERE ct.slug ILIKE '%medical%' OR ct.name ILIKE '%medical%'
ON CONFLICT DO NOTHING;

-- Trip Interruption Documents Rule
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
    'Trip Interruption Required Documents',
    'Required documents for trip interruption claims',
    '[]'::jsonb,
    jsonb_build_array(
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('interruption_proof', 'emergency_documentation', 'incident_report'),
            'minFiles', 1,
            'maxFiles', 5,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload documentation proving the reason for trip interruption'
        ),
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('booking_changes', 'new_booking', 'itinerary_change'),
            'minFiles', 0,
            'maxFiles', 5,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'If you rebooked travel, please upload the new booking confirmation'
        ),
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('original_booking', 'original_itinerary'),
            'minFiles', 1,
            'maxFiles', 3,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload your original trip itinerary or booking'
        )
    ),
    true,
    100
FROM coverage_types ct
WHERE ct.slug ILIKE '%trip%interrupt%' OR ct.name ILIKE '%trip%interrupt%'
   OR ct.slug ILIKE '%interruption%' OR ct.name ILIKE '%interruption%'
ON CONFLICT DO NOTHING;

-- Create a generic travel document rule as fallback
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
    'Travel Claim Required Documents',
    'Basic document requirements for general travel claims',
    '[]'::jsonb,
    jsonb_build_array(
        jsonb_build_object(
            'type', 'require_document',
            'documentTypes', jsonb_build_array('supporting_document', 'proof', 'receipt'),
            'minFiles', 1,
            'maxFiles', 10,
            'allowedFormats', jsonb_build_array('pdf', 'jpg', 'jpeg', 'png'),
            'message', 'Please upload supporting documents for your claim'
        )
    ),
    true,
    50
FROM coverage_types ct
WHERE ct.slug ILIKE '%travel%' OR ct.name ILIKE '%travel%'
  AND ct.id NOT IN (
      SELECT coverage_type_id FROM rules WHERE rule_type = 'document'
  )
ON CONFLICT DO NOTHING;
