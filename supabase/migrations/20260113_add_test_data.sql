-- Add test data for claim intake testing
-- This creates coverage types, a policy, and links it to users

-- Insert coverage types if they don't exist
INSERT INTO coverage_types (id, name, slug, description, category, is_active, display_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Flight Cancellation', 'flight_cancellation', 'Coverage for cancelled flights', 'travel', true, 1),
  ('22222222-2222-2222-2222-222222222222', 'Baggage Loss', 'baggage_loss', 'Coverage for lost or delayed baggage', 'travel', true, 2),
  ('33333333-3333-3333-3333-333333333333', 'Trip Cancellation', 'trip_cancellation', 'Coverage for cancelled trips', 'travel', true, 3),
  ('44444444-4444-4444-4444-444444444444', 'Medical Emergency', 'medical_emergency', 'Coverage for medical emergencies during travel', 'medical', true, 4)
ON CONFLICT (id) DO NOTHING;

-- Insert a test policy
INSERT INTO policies (id, name, description, policy_type, is_active)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Comprehensive Travel Insurance', 'Complete coverage for all travel-related incidents', 'travel', true)
ON CONFLICT (id) DO NOTHING;

-- Link coverage types to the policy
INSERT INTO policy_coverage_types (policy_id, coverage_type_id, coverage_limit, deductible, is_required)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 5000.00, 100.00, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 2000.00, 50.00, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 10000.00, 200.00, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 50000.00, 500.00, false)
ON CONFLICT DO NOTHING;

-- Link the policy to ALL existing users
-- This will give every user in your system access to this test policy
INSERT INTO user_policies (user_id, policy_id, is_active, start_date, end_date)
SELECT
  u.id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_policies up
  WHERE up.user_id = u.id
  AND up.policy_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- Verify the data
SELECT 'Coverage Types Created:' as message, COUNT(*) as count FROM coverage_types;
SELECT 'Policies Created:' as message, COUNT(*) as count FROM policies;
SELECT 'User Policies Created:' as message, COUNT(*) as count FROM user_policies WHERE policy_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
