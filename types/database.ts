export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          custom_id: string
          email: string
          full_name: string
          date_of_birth: string | null
          gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
          phone_number: string | null
          country: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          occupation: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
          onboarding_completed_at: string | null
        }
        Insert: {
          id: string
          custom_id: string
          email: string
          full_name: string
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
          phone_number?: string | null
          country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          occupation?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
          onboarding_completed_at?: string | null
        }
        Update: {
          id?: string
          custom_id?: string
          email?: string
          full_name?: string
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
          phone_number?: string | null
          country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          occupation?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
          onboarding_completed_at?: string | null
        }
      }
      coverage_types: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          category: string | null
          icon: string | null
          is_active: boolean
          display_order: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          category?: string | null
          icon?: string | null
          is_active?: boolean
          display_order?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          category?: string | null
          icon?: string | null
          is_active?: boolean
          display_order?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      policies: {
        Row: {
          id: string
          name: string
          description: string | null
          coverage_items: Json
          deductible: number | null
          premium: number | null
          currency: string | null
          premium_frequency: 'monthly' | 'quarterly' | 'annually' | null
          policy_term_months: number | null
          exclusions: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          coverage_items: Json
          deductible?: number | null
          premium?: number | null
          currency?: string | null
          premium_frequency?: 'monthly' | 'quarterly' | 'annually' | null
          policy_term_months?: number | null
          exclusions?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          coverage_items?: Json
          deductible?: number | null
          premium?: number | null
          currency?: string | null
          premium_frequency?: 'monthly' | 'quarterly' | 'annually' | null
          policy_term_months?: number | null
          exclusions?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      policy_coverage_types: {
        Row: {
          id: string
          policy_id: string
          coverage_type_id: string
          coverage_limit: number | null
          deductible: number | null
          is_optional: boolean
          additional_premium: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          policy_id: string
          coverage_type_id: string
          coverage_limit?: number | null
          deductible?: number | null
          is_optional?: boolean
          additional_premium?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          policy_id?: string
          coverage_type_id?: string
          coverage_limit?: number | null
          deductible?: number | null
          is_optional?: boolean
          additional_premium?: number
          created_at?: string
          updated_at?: string
        }
      }
      questionnaires: {
        Row: {
          id: string
          claim_type: Database['public']['Enums']['claim_type'] | null
          coverage_type_id: string | null
          name: string
          description: string | null
          version: number
          is_published: boolean
          parent_version_id: string | null
          effective_from: string | null
          effective_until: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          claim_type?: Database['public']['Enums']['claim_type'] | null
          coverage_type_id?: string | null
          name: string
          description?: string | null
          version?: number
          is_published?: boolean
          parent_version_id?: string | null
          effective_from?: string | null
          effective_until?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          claim_type?: Database['public']['Enums']['claim_type'] | null
          coverage_type_id?: string | null
          name?: string
          description?: string | null
          version?: number
          is_published?: boolean
          parent_version_id?: string | null
          effective_from?: string | null
          effective_until?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      question_dependencies: {
        Row: {
          id: string
          question_id: string
          depends_on_question_id: string
          dependency_type: string
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          depends_on_question_id: string
          dependency_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          depends_on_question_id?: string
          dependency_type?: string
          created_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          coverage_type_id: string
          question_text: string
          field_type: Database['public']['Enums']['field_type']
          is_required: boolean
          options: string[] | null
          order_index: number
          placeholder: string | null
          help_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coverage_type_id: string
          question_text: string
          field_type: Database['public']['Enums']['field_type']
          is_required?: boolean
          options?: string[] | null
          order_index: number
          placeholder?: string | null
          help_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coverage_type_id?: string
          question_text?: string
          field_type?: Database['public']['Enums']['field_type']
          is_required?: boolean
          options?: string[] | null
          order_index?: number
          placeholder?: string | null
          help_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rules: {
        Row: {
          id: string
          coverage_type_id: string
          question_id: string | null
          rule_type: Database['public']['Enums']['rule_type']
          name: string
          description: string | null
          conditions: Json
          actions: Json
          priority: number
          is_active: boolean
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coverage_type_id: string
          question_id?: string | null
          rule_type: Database['public']['Enums']['rule_type']
          name: string
          description?: string | null
          conditions?: Json
          actions?: Json
          priority?: number
          is_active?: boolean
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coverage_type_id?: string
          question_id?: string | null
          rule_type?: Database['public']['Enums']['rule_type']
          name?: string
          description?: string | null
          conditions?: Json
          actions?: Json
          priority?: number
          is_active?: boolean
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      claim_type: 'travel' | 'medical' | 'baggage' | 'flight'
      field_type: 'text' | 'number' | 'date' | 'file' | 'select'
      rule_type: 'conditional' | 'validation' | 'document' | 'eligibility' | 'calculation'
      rule_operator:
        | 'equals'
        | 'not_equals'
        | 'contains'
        | 'not_contains'
        | 'greater_than'
        | 'greater_than_or_equal'
        | 'less_than'
        | 'less_than_or_equal'
        | 'in'
        | 'not_in'
        | 'between'
        | 'regex'
        | 'is_empty'
        | 'is_not_empty'
        | 'date_before'
        | 'date_after'
        | 'date_between'
    }
  }
}
