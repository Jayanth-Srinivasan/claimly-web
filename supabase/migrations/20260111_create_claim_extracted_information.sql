-- Create table to store AI-extracted information from claim conversations
CREATE TABLE IF NOT EXISTS claim_extracted_information (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value JSONB NOT NULL,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')) DEFAULT 'medium',
  source TEXT CHECK (source IN ('user_message', 'database_question', 'ai_inference')) DEFAULT 'user_message',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_claim_extracted_info_claim_id
  ON claim_extracted_information(claim_id);

CREATE INDEX idx_claim_extracted_info_field_name
  ON claim_extracted_information(field_name);

-- Composite index for common queries
CREATE INDEX idx_claim_extracted_info_claim_field
  ON claim_extracted_information(claim_id, field_name);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_claim_extracted_information_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_claim_extracted_information_updated_at
  BEFORE UPDATE ON claim_extracted_information
  FOR EACH ROW
  EXECUTE FUNCTION update_claim_extracted_information_updated_at();

-- Add comment for documentation
COMMENT ON TABLE claim_extracted_information IS 'Stores structured information extracted by AI from user messages during claim questioning';
COMMENT ON COLUMN claim_extracted_information.field_name IS 'Name of the extracted field (e.g., airline, flight_number)';
COMMENT ON COLUMN claim_extracted_information.field_value IS 'Extracted value in JSON format';
COMMENT ON COLUMN claim_extracted_information.confidence IS 'AI confidence level: high (explicit), medium (implied), low (uncertain)';
COMMENT ON COLUMN claim_extracted_information.source IS 'Where the information came from: user_message, database_question, or ai_inference';
