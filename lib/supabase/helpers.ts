import type { Database } from '@/lib/supabase/database.types'
import type { createClient as createServerClient } from './server'

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>
type TableName = keyof Database['public']['Tables']

/**
 * Type-safe helper for insert operations with select
 *
 * @param supabase - Supabase client instance
 * @param table - Table name (must be a valid table in Database schema)
 * @param data - Insert data matching the table's Insert type
 * @returns The inserted row as the table's Row type
 * @throws Error if insert fails or returns no data
 */
export async function insertOne<T extends TableName>(
  supabase: SupabaseClient,
  table: T,
  data: Database['public']['Tables'][T]['Insert']
): Promise<Database['public']['Tables'][T]['Row']> {
  // Type assertion needed due to Supabase TypeScript limitations with generic table operations
  const { data: result, error } = await ((supabase as any)
    .from(table as string)
    .insert(data as never)
    .select()
    .single())

  if (error) {
    throw new Error(`Failed to insert into ${String(table)}: ${error.message}`)
  }

  if (!result) {
    throw new Error(`Insert into ${String(table)} returned no data`)
  }

  return result as unknown as Database['public']['Tables'][T]['Row']
}

/**
 * Type-safe helper for update operations with select
 *
 * @param supabase - Supabase client instance
 * @param table - Table name (must be a valid table in Database schema)
 * @param id - Record ID to update
 * @param updates - Update data matching the table's Update type
 * @returns The updated row as the table's Row type
 * @throws Error if update fails or returns no data
 */
export async function updateOne<T extends TableName>(
  supabase: SupabaseClient,
  table: T,
  id: string,
  updates: Database['public']['Tables'][T]['Update']
): Promise<Database['public']['Tables'][T]['Row']> {
  // Type assertion needed due to Supabase TypeScript limitations with generic table operations
  const { data: result, error } = await ((supabase as any)
    .from(table as string)
    .update(updates as never)
    .eq('id' as never, id)
    .select()
    .single())

  if (error) {
    throw new Error(`Failed to update ${String(table)}: ${error.message}`)
  }

  if (!result) {
    throw new Error(`Update on ${String(table)} returned no data`)
  }

  return result as unknown as Database['public']['Tables'][T]['Row']
}

/**
 * Type-safe helper for bulk update operations
 *
 * @param supabase - Supabase client instance
 * @param table - Table name (must be a valid table in Database schema)
 * @param updates - Array of updates, each with id and data
 * @throws Error if any update fails
 */
export async function updateMany<T extends TableName>(
  supabase: SupabaseClient,
  table: T,
  updates: Array<{ id: string; data: Database['public']['Tables'][T]['Update'] }>
): Promise<void> {
  // Type assertion needed due to Supabase TypeScript limitations with generic table operations
  const results = await Promise.allSettled(
    updates.map(({ id, data }) =>
      (supabase as any)
        .from(table as string)
        .update(data as never)
        .eq('id' as never, id)
    )
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error('Failed updates:', failed)
    throw new Error(`Failed to update ${failed.length} of ${updates.length} records in ${String(table)}`)
  }
}
