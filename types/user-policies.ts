export interface UserPolicy {
  id: string
  user_id: string
  policy_id: string
  policy_name: string
  enrolled_at: string
  expires_at: string | null
  coverage_items: CoverageItem[]
  total_premium: number | null
  currency: string
  is_active: boolean
  status: 'active' | 'expired' | 'cancelled' | 'suspended'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CoverageItem {
  name: string
  total_limit: number
  used_limit: number
  currency: string
}

export interface UserPolicyInsert {
  user_id: string
  policy_id: string
  policy_name: string
  enrolled_at?: string
  expires_at?: string | null
  coverage_items: CoverageItem[]
  total_premium?: number | null
  currency?: string
  is_active?: boolean
  status?: 'active' | 'expired' | 'cancelled' | 'suspended'
  notes?: string | null
}

export interface UserPolicyUpdate {
  policy_name?: string
  expires_at?: string | null
  coverage_items?: CoverageItem[]
  total_premium?: number | null
  currency?: string
  is_active?: boolean
  status?: 'active' | 'expired' | 'cancelled' | 'suspended'
  notes?: string | null
}

export interface UserPolicyWithPolicy extends UserPolicy {
  policy: {
    id: string
    name: string
    description: string | null
    deductible: number | null
    premium: number | null
    exclusions: string[]
  }
}
