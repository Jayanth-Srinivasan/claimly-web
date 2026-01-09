import { createClient } from './server'
import { insertOne, updateOne } from './helpers'
import type { CoverageType, CoverageTypeInsert, CoverageTypeUpdate } from '@/types/policies'

/**
 * Get all coverage types
 */
export async function getCoverageTypes(): Promise<CoverageType[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coverage_types')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch coverage types: ${error.message}`)
  }

  return (data as unknown as CoverageType[]) || []
}

/**
 * Get active coverage types only
 */
export async function getActiveCoverageTypes(): Promise<CoverageType[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coverage_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch active coverage types: ${error.message}`)
  }

  return (data as unknown as CoverageType[]) || []
}

/**
 * Get coverage types by category
 */
export async function getCoverageTypesByCategory(category: string): Promise<CoverageType[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coverage_types')
    .select('*')
    .eq('category', category)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch coverage types by category: ${error.message}`)
  }

  return (data as unknown as CoverageType[]) || []
}

/**
 * Get a single coverage type by ID
 */
export async function getCoverageType(id: string): Promise<CoverageType | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coverage_types')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch coverage type: ${error.message}`)
  }

  return data as unknown as CoverageType
}

/**
 * Get a coverage type by slug
 */
export async function getCoverageTypeBySlug(slug: string): Promise<CoverageType | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coverage_types')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch coverage type by slug: ${error.message}`)
  }

  return data as unknown as CoverageType
}

/**
 * Search coverage types by name or description
 */
export async function searchCoverageTypes(query: string): Promise<CoverageType[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coverage_types')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to search coverage types: ${error.message}`)
  }

  return (data as unknown as CoverageType[]) || []
}

/**
 * Create a new coverage type
 */
export async function createCoverageType(
  coverageType: CoverageTypeInsert
): Promise<CoverageType> {
  const supabase = await createClient()

  const insertData: typeof supabase.from<'coverage_types'>['insert']['arguments'] = {
    name: coverageType.name,
    slug: coverageType.slug,
    description: coverageType.description ?? null,
    category: coverageType.category ?? null,
    icon: coverageType.icon ?? null,
    is_active: coverageType.is_active ?? true,
    display_order: coverageType.display_order ?? 0,
    metadata: coverageType.metadata ?? {},
  }

  const data = await insertOne(supabase, 'coverage_types', insertData)
  return data as unknown as CoverageType
}

/**
 * Update a coverage type
 */
export async function updateCoverageType(
  id: string,
  updates: CoverageTypeUpdate
): Promise<CoverageType> {
  const supabase = await createClient()

  const updateData: typeof supabase.from<'coverage_types'>['update']['arguments'] = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.slug !== undefined) updateData.slug = updates.slug
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.category !== undefined) updateData.category = updates.category
  if (updates.icon !== undefined) updateData.icon = updates.icon
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active
  if (updates.display_order !== undefined) updateData.display_order = updates.display_order
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata

  const data = await updateOne(supabase, 'coverage_types', id, updateData)
  return data as unknown as CoverageType
}

/**
 * Delete a coverage type
 */
export async function deleteCoverageType(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('coverage_types').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete coverage type: ${error.message}`)
  }
}

/**
 * Toggle coverage type active status
 */
export async function toggleCoverageTypeActive(
  id: string,
  isActive: boolean
): Promise<CoverageType> {
  return updateCoverageType(id, { is_active: isActive })
}

/**
 * Reorder coverage types by updating display_order
 */
export async function reorderCoverageTypes(
  coverageTypes: Array<{ id: string; display_order: number }>
): Promise<void> {
  const supabase = await createClient()

  const updates = coverageTypes.map((ct) => ({
    id: ct.id,
    data: { display_order: ct.display_order },
  }))

  await Promise.all(
    updates.map(({ id, data }) =>
      supabase.from('coverage_types').update(data).eq('id', id)
    )
  )
}

/**
 * Get coverage type categories (distinct list)
 */
export async function getCoverageTypeCategories(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coverage_types')
    .select('category')
    .not('category', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch coverage type categories: ${error.message}`)
  }

  // Extract unique categories
  const categories = [...new Set(data.map((row) => row.category).filter(Boolean))]
  return categories as string[]
}

/**
 * Get coverage type statistics
 */
export async function getCoverageTypeStats(): Promise<{
  total: number
  active: number
  inactive: number
  byCategory: Record<string, number>
}> {
  const coverageTypes = await getCoverageTypes()

  const stats = {
    total: coverageTypes.length,
    active: coverageTypes.filter((ct) => ct.is_active).length,
    inactive: coverageTypes.filter((ct) => !ct.is_active).length,
    byCategory: coverageTypes.reduce(
      (acc, ct) => {
        if (ct.category) {
          acc[ct.category] = (acc[ct.category] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>
    ),
  }

  return stats
}
