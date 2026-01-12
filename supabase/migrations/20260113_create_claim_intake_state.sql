-- Create claim_intake_state table for stage-based flow management
-- This table tracks the progress of claim intake through 5 distinct stages

CREATE TABLE claim_intake_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL UNIQUE REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current stage in the flow
  current_stage TEXT NOT NULL CHECK (current_stage IN (
    'categorization',
    'questioning',
    'documents',
    'validation',
    'finalization',
    'completed'
  )) DEFAULT 'categorization',

  -- Stage 1: Categorization data
  coverage_type_ids UUID[],
  incident_description TEXT,
  categorization_confidence TEXT CHECK (categorization_confidence IN ('high', 'medium', 'low')),

  -- Stage 2: Questioning data
  questioning_state JSONB DEFAULT '{}'::jsonb,
  database_questions_asked UUID[] DEFAULT ARRAY[]::UUID[],

  -- Stage 3: Documents data
  uploaded_document_ids UUID[] DEFAULT ARRAY[]::UUID[],
  extracted_data JSONB DEFAULT '{}'::jsonb,

  -- Stage 4: Validation data
  validation_results JSONB,
  validation_passed BOOLEAN,
  validation_errors JSONB,

  -- Stage 5: Finalization data (claim only created in this stage!)
  claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
  claim_number TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Ensure claim_id is only set when in finalization or completed stage
  CONSTRAINT claim_id_only_in_final_stages CHECK (
    (claim_id IS NULL) OR
    (current_stage IN ('finalization', 'completed'))
  )
);

-- Indexes for performance
CREATE INDEX idx_claim_intake_state_session ON claim_intake_state(session_id);
CREATE INDEX idx_claim_intake_state_user ON claim_intake_state(user_id);
CREATE INDEX idx_claim_intake_state_stage ON claim_intake_state(current_stage);
CREATE INDEX idx_claim_intake_state_claim ON claim_intake_state(claim_id) WHERE claim_id IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_claim_intake_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.current_stage = 'completed' AND OLD.current_stage != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_claim_intake_state_updated_at
  BEFORE UPDATE ON claim_intake_state
  FOR EACH ROW
  EXECUTE FUNCTION update_claim_intake_state_updated_at();

-- Row Level Security (RLS)
ALTER TABLE claim_intake_state ENABLE ROW LEVEL SECURITY;

-- Users can only access their own intake states
CREATE POLICY "Users can view their own claim intake states"
  ON claim_intake_state
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own claim intake states"
  ON claim_intake_state
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own claim intake states"
  ON claim_intake_state
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON TABLE claim_intake_state IS 'Tracks claim intake progress through 5 stages: categorization → questioning → documents → validation → finalization. Ensures claims are only created after all validation passes.';
COMMENT ON COLUMN claim_intake_state.current_stage IS 'Current stage: categorization, questioning, documents, validation, finalization, completed';
COMMENT ON COLUMN claim_intake_state.claim_id IS 'Claim ID - only populated in finalization/completed stages (enforced by constraint)';
