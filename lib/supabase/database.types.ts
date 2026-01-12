export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          admin_only: boolean | null
          analysis: Json | null
          attached_file_ids: string[] | null
          charts: Json | null
          content: string
          created_at: string
          id: string
          reports: Json | null
          role: string
          session_id: string
          sources: Json | null
        }
        Insert: {
          admin_only?: boolean | null
          analysis?: Json | null
          attached_file_ids?: string[] | null
          charts?: Json | null
          content: string
          created_at?: string
          id?: string
          reports?: Json | null
          role: string
          session_id: string
          sources?: Json | null
        }
        Update: {
          admin_only?: boolean | null
          analysis?: Json | null
          attached_file_ids?: string[] | null
          charts?: Json | null
          content?: string
          created_at?: string
          id?: string
          reports?: Json | null
          role?: string
          session_id?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          admin_id: string | null
          archived_at: string | null
          claim_id: string | null
          created_at: string
          id: string
          is_archived: boolean
          mode: string
          share_code: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          archived_at?: string | null
          claim_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          mode: string
          share_code?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          archived_at?: string | null
          claim_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          mode?: string
          share_code?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_answers: {
        Row: {
          answer_date: string | null
          answer_file_ids: string[] | null
          answer_number: number | null
          answer_select: string | null
          answer_text: string | null
          claim_id: string
          created_at: string | null
          id: string
          question_id: string
          rule_evaluation_results: Json | null
          updated_at: string | null
        }
        Insert: {
          answer_date?: string | null
          answer_file_ids?: string[] | null
          answer_number?: number | null
          answer_select?: string | null
          answer_text?: string | null
          claim_id: string
          created_at?: string | null
          id?: string
          question_id: string
          rule_evaluation_results?: Json | null
          updated_at?: string | null
        }
        Update: {
          answer_date?: string | null
          answer_file_ids?: string[] | null
          answer_number?: number | null
          answer_select?: string | null
          answer_text?: string | null
          claim_id?: string
          created_at?: string | null
          id?: string
          question_id?: string
          rule_evaluation_results?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_answers_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_documents: {
        Row: {
          authenticity_score: number | null
          auto_filled_fields: Json | null
          chat_message_id: string | null
          claim_id: string
          document_purpose: string | null
          extracted_entities: Json | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          inferred_document_type: string | null
          is_verified: boolean | null
          mime_type: string | null
          ocr_data: Json | null
          processed_at: string | null
          processing_status: string | null
          tampering_detected: boolean | null
          uploaded_at: string | null
          validation_results: Json | null
          verified_at: string | null
        }
        Insert: {
          authenticity_score?: number | null
          auto_filled_fields?: Json | null
          chat_message_id?: string | null
          claim_id: string
          document_purpose?: string | null
          extracted_entities?: Json | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          inferred_document_type?: string | null
          is_verified?: boolean | null
          mime_type?: string | null
          ocr_data?: Json | null
          processed_at?: string | null
          processing_status?: string | null
          tampering_detected?: boolean | null
          uploaded_at?: string | null
          validation_results?: Json | null
          verified_at?: string | null
        }
        Update: {
          authenticity_score?: number | null
          auto_filled_fields?: Json | null
          chat_message_id?: string | null
          claim_id?: string
          document_purpose?: string | null
          extracted_entities?: Json | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          inferred_document_type?: string | null
          is_verified?: boolean | null
          mime_type?: string | null
          ocr_data?: Json | null
          processed_at?: string | null
          processing_status?: string | null
          tampering_detected?: boolean | null
          uploaded_at?: string | null
          validation_results?: Json | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_notes: {
        Row: {
          admin_id: string
          claim_id: string
          content: string
          created_at: string | null
          id: string
          note_type: string
        }
        Insert: {
          admin_id: string
          claim_id: string
          content: string
          created_at?: string | null
          id?: string
          note_type: string
        }
        Update: {
          admin_id?: string
          claim_id?: string
          content?: string
          created_at?: string | null
          id?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_notes_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          ai_analysis: Json | null
          ai_validated: boolean | null
          approved_amount: number | null
          assigned_admin_id: string | null
          chat_session_id: string | null
          claim_number: string
          claim_summary: Json | null
          coverage_type_ids: string[]
          created_at: string | null
          currency: string | null
          deductible: number | null
          eligibility_status: string | null
          fraud_assessment: Json | null
          id: string
          incident_date: string
          incident_description: string
          incident_location: string
          incident_type: string
          is_complete: boolean | null
          policy_id: string | null
          priority: string | null
          resolved_at: string | null
          reviewed_at: string | null
          rule_evaluation_results: Json | null
          status: string
          submitted_at: string | null
          total_claimed_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          ai_validated?: boolean | null
          approved_amount?: number | null
          assigned_admin_id?: string | null
          chat_session_id?: string | null
          claim_number: string
          claim_summary?: Json | null
          coverage_type_ids: string[]
          created_at?: string | null
          currency?: string | null
          deductible?: number | null
          eligibility_status?: string | null
          fraud_assessment?: Json | null
          id?: string
          incident_date: string
          incident_description: string
          incident_location: string
          incident_type: string
          is_complete?: boolean | null
          policy_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          rule_evaluation_results?: Json | null
          status?: string
          submitted_at?: string | null
          total_claimed_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          ai_validated?: boolean | null
          approved_amount?: number | null
          assigned_admin_id?: string | null
          chat_session_id?: string | null
          claim_number?: string
          claim_summary?: Json | null
          coverage_type_ids?: string[]
          created_at?: string | null
          currency?: string | null
          deductible?: number | null
          eligibility_status?: string | null
          fraud_assessment?: Json | null
          id?: string
          incident_date?: string
          incident_description?: string
          incident_location?: string
          incident_type?: string
          is_complete?: boolean | null
          policy_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          rule_evaluation_results?: Json | null
          status?: string
          submitted_at?: string | null
          total_claimed_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_extracted_information: {
        Row: {
          id: string
          claim_id: string
          field_name: string
          field_value: Json
          confidence: 'high' | 'medium' | 'low'
          source: 'user_message' | 'database_question' | 'ai_inference'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          field_name: string
          field_value: Json
          confidence?: 'high' | 'medium' | 'low'
          source?: 'user_message' | 'database_question' | 'ai_inference'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          claim_id?: string
          field_name?: string
          field_value?: Json
          confidence?: 'high' | 'medium' | 'low'
          source?: 'user_message' | 'database_question' | 'ai_inference'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_extracted_information_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_types: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          coverage_items: Json
          created_at: string
          currency: string | null
          deductible: number | null
          description: string | null
          exclusions: string[] | null
          id: string
          is_active: boolean
          name: string
          policy_term_months: number | null
          premium: number | null
          premium_frequency: string | null
          updated_at: string
        }
        Insert: {
          coverage_items?: Json
          created_at?: string
          currency?: string | null
          deductible?: number | null
          description?: string | null
          exclusions?: string[] | null
          id?: string
          is_active?: boolean
          name: string
          policy_term_months?: number | null
          premium?: number | null
          premium_frequency?: string | null
          updated_at?: string
        }
        Update: {
          coverage_items?: Json
          created_at?: string
          currency?: string | null
          deductible?: number | null
          description?: string | null
          exclusions?: string[] | null
          id?: string
          is_active?: boolean
          name?: string
          policy_term_months?: number | null
          premium?: number | null
          premium_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      policy_coverage_types: {
        Row: {
          additional_premium: number | null
          coverage_limit: number | null
          coverage_type_id: string
          created_at: string
          deductible: number | null
          id: string
          is_optional: boolean
          policy_id: string
          updated_at: string
        }
        Insert: {
          additional_premium?: number | null
          coverage_limit?: number | null
          coverage_type_id: string
          created_at?: string
          deductible?: number | null
          id?: string
          is_optional?: boolean
          policy_id: string
          updated_at?: string
        }
        Update: {
          additional_premium?: number | null
          coverage_limit?: number | null
          coverage_type_id?: string
          created_at?: string
          deductible?: number | null
          id?: string
          is_optional?: boolean
          policy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_coverage_types_coverage_type_id_fkey"
            columns: ["coverage_type_id"]
            isOneToOne: false
            referencedRelation: "coverage_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_coverage_types_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_id: string
          date_of_birth: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          is_admin: boolean
          occupation: string | null
          onboarding_completed_at: string | null
          phone_number: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_id: string
          date_of_birth?: string | null
          email: string
          full_name: string
          gender?: string | null
          id: string
          is_admin?: boolean
          occupation?: string | null
          onboarding_completed_at?: string | null
          phone_number?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_id?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          is_admin?: boolean
          occupation?: string | null
          onboarding_completed_at?: string | null
          phone_number?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          coverage_type_id: string
          created_at: string
          field_type: Database["public"]["Enums"]["field_type"]
          help_text: string | null
          id: string
          is_required: boolean
          options: string[] | null
          order_index: number
          placeholder: string | null
          question_text: string
          updated_at: string
        }
        Insert: {
          coverage_type_id: string
          created_at?: string
          field_type: Database["public"]["Enums"]["field_type"]
          help_text?: string | null
          id?: string
          is_required?: boolean
          options?: string[] | null
          order_index: number
          placeholder?: string | null
          question_text: string
          updated_at?: string
        }
        Update: {
          coverage_type_id?: string
          created_at?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          help_text?: string | null
          id?: string
          is_required?: boolean
          options?: string[] | null
          order_index?: number
          placeholder?: string | null
          question_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_questions_coverage_type"
            columns: ["coverage_type_id"]
            isOneToOne: false
            referencedRelation: "coverage_types"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_executions: {
        Row: {
          actions_executed: Json | null
          claim_id: string
          conditions_met: boolean
          executed_at: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          rule_id: string
          trigger_data: Json | null
          triggered_by: string
        }
        Insert: {
          actions_executed?: Json | null
          claim_id: string
          conditions_met: boolean
          executed_at?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          rule_id: string
          trigger_data?: Json | null
          triggered_by: string
        }
        Update: {
          actions_executed?: Json | null
          claim_id?: string
          conditions_met?: boolean
          executed_at?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          rule_id?: string
          trigger_data?: Json | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_executions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          actions: Json
          conditions: Json
          coverage_type_id: string
          created_at: string
          description: string | null
          error_message: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          rule_type: Database["public"]["Enums"]["rule_type"]
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          coverage_type_id: string
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          rule_type: Database["public"]["Enums"]["rule_type"]
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          coverage_type_id?: string
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          rule_type?: Database["public"]["Enums"]["rule_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_coverage_type_id_fkey"
            columns: ["coverage_type_id"]
            isOneToOne: false
            referencedRelation: "coverage_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_policies: {
        Row: {
          coverage_items: Json | null
          created_at: string | null
          currency: string | null
          enrolled_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          policy_id: string
          policy_name: string
          status: string | null
          total_premium: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coverage_items?: Json | null
          created_at?: string | null
          currency?: string | null
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          policy_id: string
          policy_name: string
          status?: string | null
          total_premium?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coverage_items?: Json | null
          created_at?: string | null
          currency?: string | null
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          policy_id?: string
          policy_name?: string
          status?: string | null
          total_premium?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_policies_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_policies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_unique_custom_id: { Args: never; Returns: string }
      generate_custom_id: { Args: never; Returns: string }
    }
    Enums: {
      claim_type: "travel" | "medical" | "baggage" | "flight"
      field_type: "text" | "number" | "date" | "file" | "select"
      rule_operator:
        | "equals"
        | "not_equals"
        | "contains"
        | "not_contains"
        | "greater_than"
        | "greater_than_or_equal"
        | "less_than"
        | "less_than_or_equal"
        | "in"
        | "not_in"
        | "between"
        | "regex"
        | "is_empty"
        | "is_not_empty"
        | "date_before"
        | "date_after"
        | "date_between"
      rule_type:
        | "conditional"
        | "validation"
        | "document"
        | "eligibility"
        | "calculation"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      claim_type: ["travel", "medical", "baggage", "flight"],
      field_type: ["text", "number", "date", "file", "select"],
      rule_operator: [
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "greater_than",
        "greater_than_or_equal",
        "less_than",
        "less_than_or_equal",
        "in",
        "not_in",
        "between",
        "regex",
        "is_empty",
        "is_not_empty",
        "date_before",
        "date_after",
        "date_between",
      ],
      rule_type: [
        "conditional",
        "validation",
        "document",
        "eligibility",
        "calculation",
      ],
    },
  },
} as const
