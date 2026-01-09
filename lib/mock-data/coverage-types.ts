import { CoverageType } from '@/types/policies'

// Mock Coverage Types Data (25 types across 5 categories)
export const mockCoverageTypes: CoverageType[] = [
  // ============================================
  // Medical (5 types)
  // ============================================
  {
    id: 'ct1',
    name: 'Medical Emergency',
    slug: 'medical-emergency',
    description: 'Emergency medical expenses during travel',
    category: 'medical',
    icon: 'medical-bag',
    is_active: true,
    display_order: 1,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct2',
    name: 'Hospitalization',
    slug: 'hospitalization',
    description: 'Hospital stay and treatment coverage',
    category: 'medical',
    icon: 'hospital',
    is_active: true,
    display_order: 2,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct3',
    name: 'Medical Evacuation',
    slug: 'medical-evacuation',
    description: 'Emergency medical evacuation and repatriation',
    category: 'medical',
    icon: 'ambulance',
    is_active: true,
    display_order: 3,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct4',
    name: 'Prescription Drugs',
    slug: 'prescription-drugs',
    description: 'Prescription medication coverage',
    category: 'medical',
    icon: 'pill',
    is_active: true,
    display_order: 4,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct5',
    name: 'Dental Emergency',
    slug: 'dental-emergency',
    description: 'Emergency dental treatment',
    category: 'medical',
    icon: 'tooth',
    is_active: true,
    display_order: 5,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ============================================
  // Travel (9 types)
  // ============================================
  {
    id: 'ct6',
    name: 'Trip Cancellation',
    slug: 'trip-cancellation',
    description: 'Reimbursement for cancelled trips',
    category: 'travel',
    icon: 'calendar-x',
    is_active: true,
    display_order: 6,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct7',
    name: 'Trip Interruption',
    slug: 'trip-interruption',
    description: 'Coverage for interrupted trips',
    category: 'travel',
    icon: 'route',
    is_active: true,
    display_order: 7,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct8',
    name: 'Trip Delay',
    slug: 'trip-delay',
    description: 'Compensation for delayed trips',
    category: 'travel',
    icon: 'clock',
    is_active: true,
    display_order: 8,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct9',
    name: 'Missed Connection',
    slug: 'missed-connection',
    description: 'Coverage for missed flight connections',
    category: 'travel',
    icon: 'plane-arrival',
    is_active: true,
    display_order: 9,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct10',
    name: 'Baggage Loss',
    slug: 'baggage-loss',
    description: 'Compensation for lost baggage',
    category: 'travel',
    icon: 'luggage',
    is_active: true,
    display_order: 10,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct11',
    name: 'Baggage Delay',
    slug: 'baggage-delay',
    description: 'Coverage for delayed baggage expenses',
    category: 'travel',
    icon: 'clock',
    is_active: true,
    display_order: 11,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct12',
    name: 'Baggage Damage',
    slug: 'baggage-damage',
    description: 'Coverage for damaged baggage',
    category: 'travel',
    icon: 'luggage',
    is_active: true,
    display_order: 12,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct13',
    name: 'Personal Items',
    slug: 'personal-items',
    description: 'Coverage for personal belongings',
    category: 'travel',
    icon: 'shopping-bag',
    is_active: true,
    display_order: 13,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct14',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Protection for electronic devices',
    category: 'travel',
    icon: 'smartphone',
    is_active: true,
    display_order: 14,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ============================================
  // Flight (3 types)
  // ============================================
  {
    id: 'ct15',
    name: 'Flight Delay',
    slug: 'flight-delay',
    description: 'Compensation for delayed flights',
    category: 'flight',
    icon: 'plane',
    is_active: true,
    display_order: 15,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct16',
    name: 'Flight Cancellation',
    slug: 'flight-cancellation',
    description: 'Coverage for cancelled flights',
    category: 'flight',
    icon: 'plane-slash',
    is_active: true,
    display_order: 16,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct17',
    name: 'Overbooking',
    slug: 'overbooking',
    description: 'Compensation for denied boarding',
    category: 'flight',
    icon: 'users-slash',
    is_active: true,
    display_order: 17,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ============================================
  // Business (2 types)
  // ============================================
  {
    id: 'ct18',
    name: 'Business Equipment',
    slug: 'business-equipment',
    description: 'Coverage for business equipment and tools',
    category: 'business',
    icon: 'briefcase',
    is_active: true,
    display_order: 18,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct19',
    name: 'Business Interruption',
    slug: 'business-interruption',
    description: 'Coverage for business travel interruptions',
    category: 'business',
    icon: 'briefcase',
    is_active: true,
    display_order: 19,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ============================================
  // Other (6 types)
  // ============================================
  {
    id: 'ct20',
    name: 'Rental Car Damage',
    slug: 'rental-car-damage',
    description: 'Coverage for rental car damage',
    category: 'other',
    icon: 'car',
    is_active: true,
    display_order: 20,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct21',
    name: 'Personal Liability',
    slug: 'personal-liability',
    description: 'Personal liability coverage during travel',
    category: 'other',
    icon: 'shield',
    is_active: true,
    display_order: 21,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct22',
    name: 'Legal Expenses',
    slug: 'legal-expenses',
    description: 'Legal expense coverage abroad',
    category: 'other',
    icon: 'gavel',
    is_active: true,
    display_order: 22,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct23',
    name: 'Pet Care',
    slug: 'pet-care',
    description: 'Emergency pet care coverage',
    category: 'other',
    icon: 'paw',
    is_active: true,
    display_order: 23,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct24',
    name: 'Home Security',
    slug: 'home-security',
    description: 'Home monitoring during travel',
    category: 'other',
    icon: 'home',
    is_active: true,
    display_order: 24,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ct25',
    name: 'Identity Theft',
    slug: 'identity-theft',
    description: 'Identity theft protection while traveling',
    category: 'other',
    icon: 'user-shield',
    is_active: true,
    display_order: 25,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// Helper function to get coverage types by category
export function getCoverageTypesByCategory(category: string): CoverageType[] {
  return mockCoverageTypes.filter((ct) => ct.category === category)
}

// Helper function to get coverage type by slug
export function getCoverageTypeBySlug(slug: string): CoverageType | undefined {
  return mockCoverageTypes.find((ct) => ct.slug === slug)
}

// Get all active coverage types
export function getActiveCoverageTypes(): CoverageType[] {
  return mockCoverageTypes.filter((ct) => ct.is_active)
}

// Get coverage types count by category
export function getCoverageTypeCountsByCategory(): Record<string, number> {
  return mockCoverageTypes.reduce(
    (acc, ct) => {
      if (ct.category) {
        acc[ct.category] = (acc[ct.category] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )
}
