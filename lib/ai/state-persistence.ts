import { SupabaseClient } from '@supabase/supabase-js'
import type { QuestioningState, ConversationTurn } from '@/types/adaptive-questions'

/**
 * Service for persisting adaptive questioning state to the database.
 * Solves the critical issue where state was lost between requests.
 */
export class StatePersistenceService {
  private disabled = false

  constructor(private supabase: SupabaseClient) {}

  private isMissingTable(error: any) {
    return error?.code === 'PGRST205' && /claim_questioning_state/i.test(error?.message || '')
  }

  /**
   * Load persisted questioning state from database
   */
  async loadState(claimId: string): Promise<Partial<QuestioningState> | null> {
    if (this.disabled) return null

    const { data, error } = await this.supabase
      .from('claim_questioning_state')
      .select('*')
      .eq('claim_id', claimId)
      .single()

    if (error) {
      if (this.isMissingTable(error)) {
        console.warn('[StatePersistence] Table missing; disabling persistence for this session.')
        this.disabled = true
        return null
      }
      // No state found yet - this is normal for new claims
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[StatePersistence] Error loading state:', error)
      return null
    }

    if (!data) return null

    return {
      database_questions_asked: data.database_questions_asked || [],
      conversation_history: data.conversation_history || [],
      current_focus: data.current_focus,
    }
  }

  /**
   * Save complete questioning state to database
   */
  async saveState(claimId: string, state: QuestioningState): Promise<void> {
    if (this.disabled) return

    const { error } = await this.supabase
      .from('claim_questioning_state')
      .upsert(
        {
          claim_id: claimId,
          database_questions_asked: state.database_questions_asked,
          conversation_history: state.conversation_history,
          current_focus: state.current_focus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'claim_id' }
      )

    if (error) {
      if (this.isMissingTable(error)) {
        console.warn('[StatePersistence] Table missing; disabling persistence for this session.')
        this.disabled = true
        return
      }
      console.error('[StatePersistence] Error saving state:', error)
    }
  }

  /**
   * Update only the asked questions list (more efficient than full save)
   */
  async updateAskedQuestions(claimId: string, questionIds: string[]): Promise<void> {
    if (this.disabled) return

    // First, get existing asked questions
    const { data: existing } = await this.supabase
      .from('claim_questioning_state')
      .select('database_questions_asked')
      .eq('claim_id', claimId)
      .single()

    const currentAsked = existing?.database_questions_asked || []
    // Merge and deduplicate
    const merged = Array.from(new Set([...currentAsked, ...questionIds]))

    const { error } = await this.supabase
      .from('claim_questioning_state')
      .upsert(
        {
          claim_id: claimId,
          database_questions_asked: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'claim_id' }
      )

    if (error) {
      if (this.isMissingTable(error)) {
        console.warn('[StatePersistence] Table missing; disabling persistence for this session.')
        this.disabled = true
        return
      }
      console.error('[StatePersistence] Error updating asked questions:', error)
    }
  }

  /**
   * Add a single conversation turn to the history
   */
  async addConversationTurn(
    claimId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    if (this.disabled) return

    // Get existing conversation history
    const { data: existing } = await this.supabase
      .from('claim_questioning_state')
      .select('conversation_history')
      .eq('claim_id', claimId)
      .single()

    const history = existing?.conversation_history || []

    // Add new turn with timestamp
    history.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    })

    // Limit history to last 50 turns to prevent unbounded growth
    const limitedHistory = history.slice(-50)

    const { error } = await this.supabase
      .from('claim_questioning_state')
      .upsert(
        {
          claim_id: claimId,
          conversation_history: limitedHistory,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'claim_id' }
      )

    if (error) {
      if (this.isMissingTable(error)) {
        console.warn('[StatePersistence] Table missing; disabling persistence for this session.')
        this.disabled = true
        return
      }
      console.error('[StatePersistence] Error adding conversation turn:', error)
    }
  }

  /**
   * Update the current focus field
   */
  async updateCurrentFocus(claimId: string, focus: string | undefined): Promise<void> {
    if (this.disabled) return

    const { error } = await this.supabase
      .from('claim_questioning_state')
      .upsert(
        {
          claim_id: claimId,
          current_focus: focus || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'claim_id' }
      )

    if (error) {
      if (this.isMissingTable(error)) {
        console.warn('[StatePersistence] Table missing; disabling persistence for this session.')
        this.disabled = true
        return
      }
      console.error('[StatePersistence] Error updating current focus:', error)
    }
  }

  /**
   * Clear state for a claim (useful for testing or resetting)
   */
  async clearState(claimId: string): Promise<void> {
    if (this.disabled) return

    const { error } = await this.supabase
      .from('claim_questioning_state')
      .delete()
      .eq('claim_id', claimId)

    if (error) {
      if (this.isMissingTable(error)) {
        console.warn('[StatePersistence] Table missing; disabling persistence for this session.')
        this.disabled = true
        return
      }
      console.error('[StatePersistence] Error clearing state:', error)
    }
  }
}
