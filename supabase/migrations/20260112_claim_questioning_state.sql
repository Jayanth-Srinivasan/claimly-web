-- Migration: Add claim questioning state table
-- Purpose: Persist adaptive questioning state across requests to prevent question repetition
-- Date: 2026-01-12

CREATE TABLE IF NOT EXISTS claim_questioning_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,

  -- State tracking
  database_questions_asked JSONB DEFAULT '[]'::jsonb,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  current_focus TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one state per claim
  CONSTRAINT unique_claim_state UNIQUE (claim_id)
);

-- Index for fast lookup by claim_id
CREATE INDEX idx_claim_questioning_state_claim_id
  ON claim_questioning_state(claim_id);

-- Table and column comments
COMMENT ON TABLE claim_questioning_state IS 'Persists adaptive questioning state across requests to prevent question repetition. Each claim has exactly one state record.';
COMMENT ON COLUMN claim_questioning_state.database_questions_asked IS 'Array of question IDs (UUIDs) that have already been asked to the user';
COMMENT ON COLUMN claim_questioning_state.conversation_history IS 'Full conversation history as array of {role, content, timestamp} for duplicate detection';
COMMENT ON COLUMN claim_questioning_state.current_focus IS 'Current field or topic being discussed in the adaptive questioning flow';
