import { SupabaseClient } from '@supabase/supabase-js'
import type { DatabaseQuestion, QuestionAnswer } from '@/lib/ai/claim-intake/core/types'

/**
 * Pure database operations for questions and answers
 */
export class QuestionService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Get questions by coverage type IDs
   * Returns questions ordered by order_index
   */
  async getQuestionsByCoverageTypes(coverageTypeIds: string[]): Promise<DatabaseQuestion[]> {
    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .in('coverage_type_id', coverageTypeIds)
      .order('order_index', { ascending: true })

    if (error) {
      throw new Error(`Failed to get questions: ${error.message}`)
    }

    return (data || []).map(this.dbRowToQuestion)
  }

  /**
   * Get a single question by ID
   */
  async getQuestionById(questionId: string): Promise<DatabaseQuestion | null> {
    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single()

    if (error) {
      return null
    }

    return this.dbRowToQuestion(data)
  }

  /**
   * Get the next unanswered database question
   * Excludes questions already asked and hidden questions
   */
  async getNextQuestion(
    coverageTypeIds: string[],
    askedQuestionIds: string[],
    hiddenQuestionIds: string[] = []
  ): Promise<DatabaseQuestion | null> {
    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .in('coverage_type_id', coverageTypeIds)
      .not('id', 'in', `(${[...askedQuestionIds, ...hiddenQuestionIds].join(',')})`)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return this.dbRowToQuestion(data)
  }

  /**
   * Save an answer to a database question
   * Before claim is created, we can't link to claim_id yet
   */
  async saveAnswer(
    sessionId: string,
    questionId: string,
    answerValue: any,
    claimId?: string
  ): Promise<void> {
    const record: any = {
      question_id: questionId,
      answer_value: answerValue,
      answered_at: new Date().toISOString(),
    }

    if (claimId) {
      record.claim_id = claimId
    } else {
      // Store temporarily with session_id until claim is created
      record.metadata = { session_id: sessionId }
    }

    const { error } = await this.supabase
      .from('claim_answers')
      .insert(record)

    if (error) {
      throw new Error(`Failed to save answer: ${error.message}`)
    }
  }

  /**
   * Get all answers for a session (before claim creation)
   */
  async getAnswersBySessionId(sessionId: string): Promise<QuestionAnswer[]> {
    const { data, error } = await this.supabase
      .from('claim_answers')
      .select('*')
      .contains('metadata', { session_id: sessionId })

    if (error) {
      return []
    }

    return (data || []).map(row => ({
      questionId: row.question_id,
      answerValue: row.answer_value,
      answeredAt: row.answered_at,
    }))
  }

  /**
   * Get all answers for a claim
   */
  async getAnswersByClaimId(claimId: string): Promise<QuestionAnswer[]> {
    const { data, error } = await this.supabase
      .from('claim_answers')
      .select('*')
      .eq('claim_id', claimId)

    if (error) {
      return []
    }

    return (data || []).map(row => ({
      questionId: row.question_id,
      answerValue: row.answer_value,
      answeredAt: row.answered_at,
    }))
  }

  /**
   * Link session answers to claim after claim is created
   */
  async linkAnswersToClaim(sessionId: string, claimId: string): Promise<void> {
    // Update all answers that have this session_id in metadata
    const { error } = await this.supabase
      .from('claim_answers')
      .update({ claim_id: claimId })
      .contains('metadata', { session_id: sessionId })

    if (error) {
      throw new Error(`Failed to link answers to claim: ${error.message}`)
    }
  }

  /**
   * Get answers as a key-value map (question_id -> answer_value)
   */
  async getAnswersMap(sessionId: string, claimId?: string): Promise<Record<string, any>> {
    const answers = claimId
      ? await this.getAnswersByClaimId(claimId)
      : await this.getAnswersBySessionId(sessionId)

    const answersMap: Record<string, any> = {}
    for (const answer of answers) {
      answersMap[answer.questionId] = answer.answerValue
    }

    return answersMap
  }

  /**
   * Check if all required questions are answered
   */
  async areRequiredQuestionsAnswered(
    coverageTypeIds: string[],
    answeredQuestionIds: string[]
  ): Promise<boolean> {
    const questions = await this.getQuestionsByCoverageTypes(coverageTypeIds)
    const requiredQuestions = questions.filter(q => q.isRequired)

    return requiredQuestions.every(q => answeredQuestionIds.includes(q.id))
  }

  /**
   * Get list of unanswered required questions
   */
  async getUnansweredRequiredQuestions(
    coverageTypeIds: string[],
    answeredQuestionIds: string[]
  ): Promise<DatabaseQuestion[]> {
    const questions = await this.getQuestionsByCoverageTypes(coverageTypeIds)
    return questions.filter(
      q => q.isRequired && !answeredQuestionIds.includes(q.id)
    )
  }

  /**
   * Convert database row to DatabaseQuestion
   */
  private dbRowToQuestion(row: any): DatabaseQuestion {
    return {
      id: row.id,
      questionText: row.question_text,
      fieldType: row.field_type,
      isRequired: row.is_required || false,
      options: row.options || [],
      orderIndex: row.order_index || 0,
      placeholder: row.placeholder || undefined,
      helpText: row.help_text || undefined,
    }
  }
}
