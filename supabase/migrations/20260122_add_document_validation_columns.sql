-- Migration: Add document validation columns to claim_documents
-- Date: 2026-01-22
-- Purpose: Enhance document validation tracking for strict document requirements

-- Add validation status enum if not exists
DO $$ BEGIN
    CREATE TYPE document_validation_status AS ENUM (
        'pending',
        'valid',
        'needs_review',
        'invalid',
        'reupload_required'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to claim_documents table
ALTER TABLE claim_documents
ADD COLUMN IF NOT EXISTS validation_status document_validation_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_errors TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS validation_warnings TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS detected_document_type TEXT,
ADD COLUMN IF NOT EXISTS expected_document_type TEXT,
ADD COLUMN IF NOT EXISTS profile_validation JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context_validation JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS authenticity_score DECIMAL(3,2) DEFAULT 0.00;

-- Add index for validation status queries
CREATE INDEX IF NOT EXISTS idx_claim_documents_validation_status
ON claim_documents(validation_status);

-- Add index for session documents with validation status
CREATE INDEX IF NOT EXISTS idx_claim_documents_session_validation
ON claim_documents(claim_session_id, validation_status);

-- Add comment for documentation
COMMENT ON COLUMN claim_documents.validation_status IS 'Status of document validation: pending, valid, needs_review, invalid, reupload_required';
COMMENT ON COLUMN claim_documents.validation_errors IS 'Array of validation error messages';
COMMENT ON COLUMN claim_documents.validation_warnings IS 'Array of validation warning messages';
COMMENT ON COLUMN claim_documents.detected_document_type IS 'Document type detected via OCR/AI analysis';
COMMENT ON COLUMN claim_documents.expected_document_type IS 'Expected document type based on claim requirements';
COMMENT ON COLUMN claim_documents.profile_validation IS 'JSON object with profile validation results (name match, DOB match, etc.)';
COMMENT ON COLUMN claim_documents.context_validation IS 'JSON object with claim context validation results (date alignment, amount match, etc.)';
COMMENT ON COLUMN claim_documents.authenticity_score IS 'AI-assessed authenticity score from 0.00 to 1.00';
