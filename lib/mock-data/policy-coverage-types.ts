import { PolicyCoverageType } from '@/types/policies'

// Mock Policy Coverage Types Data
// Maps policies to coverage types (replaces coverage_items JSON)
export const mockPolicyCoverageTypes: PolicyCoverageType[] = [
  // ============================================
  // Policy 1: Travel Insurance Basic
  // ============================================
  {
    id: 'pct1',
    policy_id: '1',
    coverage_type_id: 'ct1', // Medical Emergency
    coverage_limit: 30000,
    deductible: 250,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'pct2',
    policy_id: '1',
    coverage_type_id: 'ct6', // Trip Cancellation
    coverage_limit: 10000,
    deductible: 250,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'pct3',
    policy_id: '1',
    coverage_type_id: 'ct10', // Baggage Loss
    coverage_limit: 5000,
    deductible: 250,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'pct4',
    policy_id: '1',
    coverage_type_id: 'ct15', // Flight Delay
    coverage_limit: 5000,
    deductible: 250,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },

  // ============================================
  // Policy 2: Medical Insurance Premium
  // ============================================
  {
    id: 'pct5',
    policy_id: '2',
    coverage_type_id: 'ct1', // Medical Emergency
    coverage_limit: 100000,
    deductible: 500,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-10').toISOString(),
    updated_at: new Date('2024-01-20').toISOString(),
  },
  {
    id: 'pct6',
    policy_id: '2',
    coverage_type_id: 'ct2', // Hospitalization
    coverage_limit: 100000,
    deductible: 500,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-10').toISOString(),
    updated_at: new Date('2024-01-20').toISOString(),
  },
  {
    id: 'pct7',
    policy_id: '2',
    coverage_type_id: 'ct3', // Medical Evacuation
    coverage_limit: 30000,
    deductible: 500,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-10').toISOString(),
    updated_at: new Date('2024-01-20').toISOString(),
  },
  {
    id: 'pct8',
    policy_id: '2',
    coverage_type_id: 'ct4', // Prescription Drugs
    coverage_limit: 20000,
    deductible: 100,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-10').toISOString(),
    updated_at: new Date('2024-01-20').toISOString(),
  },

  // ============================================
  // Policy 3: Baggage Protection Plus
  // ============================================
  {
    id: 'pct9',
    policy_id: '3',
    coverage_type_id: 'ct10', // Baggage Loss
    coverage_limit: 3000,
    deductible: 100,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-05').toISOString(),
    updated_at: new Date('2024-01-05').toISOString(),
  },
  {
    id: 'pct10',
    policy_id: '3',
    coverage_type_id: 'ct11', // Baggage Delay
    coverage_limit: 1000,
    deductible: 100,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-05').toISOString(),
    updated_at: new Date('2024-01-05').toISOString(),
  },
  {
    id: 'pct11',
    policy_id: '3',
    coverage_type_id: 'ct14', // Electronics
    coverage_limit: 1000,
    deductible: 100,
    is_optional: true,
    additional_premium: 10,
    created_at: new Date('2024-01-05').toISOString(),
    updated_at: new Date('2024-01-05').toISOString(),
  },

  // ============================================
  // Policy 4: Business Travel Insurance
  // ============================================
  {
    id: 'pct12',
    policy_id: '4',
    coverage_type_id: 'ct1', // Medical Emergency
    coverage_limit: 40000,
    deductible: 1000,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2023-12-20').toISOString(),
    updated_at: new Date('2024-01-18').toISOString(),
  },
  {
    id: 'pct13',
    policy_id: '4',
    coverage_type_id: 'ct18', // Business Equipment
    coverage_limit: 20000,
    deductible: 500,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2023-12-20').toISOString(),
    updated_at: new Date('2024-01-18').toISOString(),
  },
  {
    id: 'pct14',
    policy_id: '4',
    coverage_type_id: 'ct6', // Trip Cancellation
    coverage_limit: 30000,
    deductible: 1000,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2023-12-20').toISOString(),
    updated_at: new Date('2024-01-18').toISOString(),
  },
  {
    id: 'pct15',
    policy_id: '4',
    coverage_type_id: 'ct1', // Emergency Assistance (mapped to Medical Emergency)
    coverage_limit: 10000,
    deductible: 1000,
    is_optional: true,
    additional_premium: 50,
    created_at: new Date('2023-12-20').toISOString(),
    updated_at: new Date('2024-01-18').toISOString(),
  },

  // ============================================
  // Policy 5: Flight Cancellation Insurance
  // ============================================
  {
    id: 'pct16',
    policy_id: '5',
    coverage_type_id: 'ct16', // Flight Cancellation
    coverage_limit: 5000,
    deductible: 0,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-12').toISOString(),
    updated_at: new Date('2024-01-12').toISOString(),
  },
  {
    id: 'pct17',
    policy_id: '5',
    coverage_type_id: 'ct15', // Flight Delay
    coverage_limit: 2000,
    deductible: 0,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-12').toISOString(),
    updated_at: new Date('2024-01-12').toISOString(),
  },
  {
    id: 'pct18',
    policy_id: '5',
    coverage_type_id: 'ct9', // Missed Connection
    coverage_limit: 2000,
    deductible: 0,
    is_optional: false,
    additional_premium: 0,
    created_at: new Date('2024-01-12').toISOString(),
    updated_at: new Date('2024-01-12').toISOString(),
  },
  {
    id: 'pct19',
    policy_id: '5',
    coverage_type_id: 'ct8', // Trip Delay (Hotel Accommodation mapped here)
    coverage_limit: 1000,
    deductible: 0,
    is_optional: true,
    additional_premium: 5,
    created_at: new Date('2024-01-12').toISOString(),
    updated_at: new Date('2024-01-12').toISOString(),
  },
]

// Helper functions

export function getPolicyCoverageTypesByPolicy(policyId: string): PolicyCoverageType[] {
  return mockPolicyCoverageTypes.filter((pct) => pct.policy_id === policyId)
}

export function getPolicyCoverageTypesByCoverageType(coverageTypeId: string): PolicyCoverageType[] {
  return mockPolicyCoverageTypes.filter((pct) => pct.coverage_type_id === coverageTypeId)
}

export function getPolicyCoverageType(
  policyId: string,
  coverageTypeId: string
): PolicyCoverageType | undefined {
  return mockPolicyCoverageTypes.find(
    (pct) => pct.policy_id === policyId && pct.coverage_type_id === coverageTypeId
  )
}

export function getOptionalCoverageTypes(policyId: string): PolicyCoverageType[] {
  return mockPolicyCoverageTypes.filter((pct) => pct.policy_id === policyId && pct.is_optional)
}

export function getRequiredCoverageTypes(policyId: string): PolicyCoverageType[] {
  return mockPolicyCoverageTypes.filter((pct) => pct.policy_id === policyId && !pct.is_optional)
}

// Calculate total additional premiums for a policy
export function calculateAdditionalPremiums(policyId: string): number {
  return mockPolicyCoverageTypes
    .filter((pct) => pct.policy_id === policyId)
    .reduce((sum, pct) => sum + pct.additional_premium, 0)
}

// Get coverage statistics for a policy
export function getPolicyCoverageStats(policyId: string) {
  const coverages = getPolicyCoverageTypesByPolicy(policyId)
  return {
    total: coverages.length,
    required: coverages.filter((c) => !c.is_optional).length,
    optional: coverages.filter((c) => c.is_optional).length,
    totalLimit: coverages.reduce((sum, c) => sum + (c.coverage_limit || 0), 0),
    additionalPremium: calculateAdditionalPremiums(policyId),
  }
}
