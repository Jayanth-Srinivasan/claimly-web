import { Database } from '@/lib/supabase/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export interface AuthError {
  error: string
}

export interface AuthSuccess {
  success: true
}

export type AuthResult = AuthError | AuthSuccess | void
