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
      user_policies: {
        Row: {
          id: string
          user_id: string
          policy_id: string
          policy_name: string
          enrolled_at: string
          expires_at: string | null
          coverage_items: Json
          total_premium: number | null
          currency: string
          is_active: boolean
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          policy_id: string
          policy_name: string
          enrolled_at?: string
          expires_at?: string | null
          coverage_items?: Json
          total_premium?: number | null
          currency?: string
          is_active?: boolean
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          policy_id?: string
          policy_name?: string
          enrolled_at?: string
          expires_at?: string | null
          coverage_items?: Json
          total_premium?: number | null
          currency?: string
          is_active?: boolean
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          mode: 'policy' | 'claim'
          is_archived: boolean
          archived_at: string | null
          claim_id: string | null
          admin_id: string | null
          created_at: string
          updated_at: string
          share_code: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          mode: 'policy' | 'claim'
          is_archived?: boolean
          archived_at?: string | null
          claim_id?: string | null
          admin_id?: string | null
          created_at?: string
          updated_at?: string
          share_code?: string | null
        }
        Update: {
          title?: string
          is_archived?: boolean
          archived_at?: string | null
          claim_id?: string | null
          admin_id?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          attached_file_ids: string[]
          sources: Json | null
          reports: Json | null
          analysis: Json | null
          charts: Json | null
          admin_only: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          attached_file_ids?: string[]
          sources?: Json | null
          reports?: Json | null
          analysis?: Json | null
          charts?: Json | null
          admin_only?: boolean
          created_at?: string
        }
        Update: {}
      }
      claims: {
        Row: {
          id: string
          claim_number: string
          user_id: string
          policy_id: string | null
          chat_session_id: string | null
          assigned_admin_id: string | null
          coverage_type_ids: string[]
          incident_type: string
          incident_date: string
          incident_location: string
          incident_description: string
          total_claimed_amount: number
          approved_amount: number | null
          deductible: number | null
          currency: string
          status: 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid'
          priority: 'low' | 'normal' | 'high' | 'urgent'
          claim_summary: Json
          rule_evaluation_results: Json
          fraud_assessment: Json
          ai_analysis: Json
          eligibility_status: string | null
          is_complete: boolean
          ai_validated: boolean
          submitted_at: string | null
          created_at: string
          updated_at: string
          reviewed_at: string | null
          resolved_at: string | null
        }
        Insert: {
          id?: string
          claim_number: string
          user_id: string
          policy_id?: string | null
          chat_session_id?: string | null
          assigned_admin_id?: string | null
          coverage_type_ids: string[]
          incident_type: string
          incident_date: string
          incident_location: string
          incident_description: string
          total_claimed_amount: number
          approved_amount?: number | null
          deductible?: number | null
          currency?: string
          status?: 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid'
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          claim_summary?: Json
          rule_evaluation_results?: Json
          fraud_assessment?: Json
          ai_analysis?: Json
          eligibility_status?: string | null
          is_complete?: boolean
          ai_validated?: boolean
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
          reviewed_at?: string | null
          resolved_at?: string | null
        }
        Update: {
          claim_number?: string
          policy_id?: string | null
          assigned_admin_id?: string | null
          coverage_type_ids?: string[]
          incident_type?: string
          incident_date?: string
          incident_location?: string
          incident_description?: string
          total_claimed_amount?: number
          approved_amount?: number | null
          deductible?: number | null
          currency?: string
          status?: 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid'
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          claim_summary?: Json
          rule_evaluation_results?: Json
          fraud_assessment?: Json
          ai_analysis?: Json
          eligibility_status?: string | null
          is_complete?: boolean
          ai_validated?: boolean
          submitted_at?: string | null
          reviewed_at?: string | null
          resolved_at?: string | null
        }
      }
      claim_documents: {
        Row: {
          id: string
          claim_id: string
          chat_message_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          mime_type: string | null
          inferred_document_type: string | null
          document_purpose: string | null
          ocr_data: Json
          extracted_entities: Json
          validation_results: Json
          authenticity_score: number | null
          tampering_detected: boolean
          auto_filled_fields: Json
          processing_status: string
          is_verified: boolean
          uploaded_at: string
          processed_at: string | null
          verified_at: string | null
        }
        Insert: {
          id?: string
          claim_id: string
          chat_message_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          mime_type?: string | null
          inferred_document_type?: string | null
          document_purpose?: string | null
          ocr_data?: Json
          extracted_entities?: Json
          validation_results?: Json
          authenticity_score?: number | null
          tampering_detected?: boolean
          auto_filled_fields?: Json
          processing_status?: string
          is_verified?: boolean
          uploaded_at?: string
          processed_at?: string | null
          verified_at?: string | null
        }
        Update: {
          inferred_document_type?: string | null
          document_purpose?: string | null
          ocr_data?: Json
          extracted_entities?: Json
          validation_results?: Json
          authenticity_score?: number | null
          tampering_detected?: boolean
          auto_filled_fields?: Json
          processing_status?: string
          is_verified?: boolean
          processed_at?: string | null
          verified_at?: string | null
        }
      }
      claim_answers: {
        Row: {
          id: string
          claim_id: string
          question_id: string
          answer_text: string | null
          answer_number: number | null
          answer_date: string | null
          answer_file_ids: string[] | null
          answer_select: string | null
          rule_evaluation_results: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          question_id: string
          answer_text?: string | null
          answer_number?: number | null
          answer_date?: string | null
          answer_file_ids?: string[] | null
          answer_select?: string | null
          rule_evaluation_results?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          answer_text?: string | null
          answer_number?: number | null
          answer_date?: string | null
          answer_file_ids?: string[] | null
          answer_select?: string | null
          rule_evaluation_results?: Json
        }
      }
      rule_executions: {
        Row: {
          id: string
          claim_id: string
          rule_id: string
          triggered_by: string
          trigger_data: Json
          conditions_met: boolean
          actions_executed: Json
          input_data: Json
          output_data: Json
          executed_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          rule_id: string
          triggered_by: string
          trigger_data?: Json
          conditions_met: boolean
          actions_executed?: Json
          input_data?: Json
          output_data?: Json
          executed_at?: string
        }
        Update: {}
      }
      claim_notes: {
        Row: {
          id: string
          claim_id: string
          admin_id: string
          note_type: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          admin_id: string
          note_type: string
          content: string
          created_at?: string
        }
        Update: {}
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
