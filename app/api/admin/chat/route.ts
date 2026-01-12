import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { StreamingResponse } from '@/lib/utils/streaming'
import { RuleEvaluator } from '@/lib/rules/evaluator'

const RequestSchema = z.object({
  claimId: z.string().uuid(),
  message: z.string().min(1),
  sessionId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single<{ is_admin: boolean }>()

    if (!profile || !profile.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    const { claimId, message, sessionId } = RequestSchema.parse(body)

    // Fetch comprehensive claim data
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select(
        `
        *,
        profiles!claims_user_id_fkey(
          full_name,
          email,
          phone_number,
          custom_id
        ),
        claim_documents(*),
        claim_answers(
          *,
          questions(question_text, field_type)
        ),
        rule_executions(
          *,
          rules(name, description, action_type)
        ),
        claim_notes(
          *,
          profiles!claim_notes_admin_id_fkey(full_name)
        )
      `
      )
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return new Response(JSON.stringify({ error: 'Claim not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get claimant's claim history
    const { data: claimHistory } = await supabase
      .from('claims')
      .select('id, status, incident_type, total_claimed_amount, submitted_at, resolved_at')
      .eq('user_id', claim.user_id)
      .order('submitted_at', { ascending: false })
      .limit(10)

    // Build context for AI
    const context = {
      current_claim: claim,
      claimant_history: claimHistory || [],
      claim_count: claimHistory?.length || 0,
    }

    // Get or create admin chat session
    let chatSessionId = sessionId
    if (!chatSessionId && claim.chat_session_id) {
      chatSessionId = claim.chat_session_id
    }

    // Get conversation history if session exists
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (chatSessionId) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', chatSessionId)
        .eq('admin_only', true)
        .order('created_at', { ascending: true })
        .limit(10)

      conversationHistory =
        messages?.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })) || []
    }

    const tools = [
      {
        name: 'get_claim_context',
        description: 'Fetch latest claim data, documents, OCR results, notes, and history',
        schema: z.object({}),
        func: async () => {
          const { data: docs } = await supabase
            .from('claim_documents')
            .select('*')
            .eq('claim_id', claimId)
          const { data: notes } = await supabase
            .from('claim_notes')
            .select('*')
            .eq('claim_id', claimId)
          return {
            claim: context.current_claim,
            documents: docs || [],
            notes: notes || [],
            history: context.claimant_history,
          }
        },
      },
      {
        name: 'evaluate_rules',
        description: 'Evaluate rules for this claim using current answers',
        schema: z.object({}),
        func: async () => {
          const evaluator = new RuleEvaluator(supabase)
          return evaluator.evaluate({
            coverage_type_ids: context.current_claim.coverage_type_ids || [],
            answers: context.current_claim.claim_answers || [],
          })
        },
      },
    ]

    const model = new ChatOpenAI({
      model: 'gpt-4o',
      temperature: 0.3,
    }).bindTools(tools)

    const systemPrompt = `You are an AI assistant for insurance claim handlers. Your role is to analyze claims, detect potential fraud, and provide recommendations.

Key responsibilities:
- Analyze claim for completeness and consistency
- Identify red flags or suspicious patterns
- Review submitted documents and OCR results for authenticity
- Check claimant history for patterns
- Provide actionable recommendations (approve, deny, request more info, investigate)
- Highlight any policy violations or coverage gaps
- Suggest fair settlement amounts based on coverage limits

Use tools when you need refreshed context or rule evaluation. Be thorough, objective, and professional.`

    async function* streamResponse() {
      let assistantContent = ''
      let messages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        ...conversationHistory.map((m) =>
          m.role === 'assistant' ? new AIMessage(m.content) : new HumanMessage(m.content)
        ),
        new HumanMessage(message),
      ]

      while (true) {
        const response = await model.invoke(messages)

        if (response.tool_calls && response.tool_calls.length > 0) {
          for (const call of response.tool_calls) {
            const tool = tools.find((t) => t.name === call.name)
            const toolResult = tool ? await tool.func() : { error: 'unknown tool' }
            messages.push(
              new ToolMessage({
                name: call.name,
                tool_call_id: call.id ?? `${call.name}-call`,
                content: JSON.stringify(toolResult),
              })
            )
          }
          continue
        }

        const content =
          typeof response.content === 'string'
            ? response.content
            : response.content?.toString?.() ?? ''

        if (content) {
          assistantContent = content
          yield content
        }
        break
      }

      if (chatSessionId && assistantContent) {
        await supabase.from('chat_messages').insert([
          {
            session_id: chatSessionId,
            role: 'user',
            content: message,
            admin_only: true,
          },
          {
            session_id: chatSessionId,
            role: 'assistant',
            content: assistantContent,
            admin_only: true,
          },
        ])
      }
    }

    const streamingResponse = new StreamingResponse()
    return streamingResponse.stream(streamResponse())
  } catch (error) {
    console.error('Admin chat error:', error)

    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Failed to process admin query' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
