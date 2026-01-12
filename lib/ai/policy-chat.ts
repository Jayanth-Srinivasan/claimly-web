import { SupabaseClient } from '@supabase/supabase-js'
import { AI_MODELS } from './openai'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, BaseMessage } from '@langchain/core/messages'
import { z } from 'zod'

export class PolicyChatService {
  private supabase: SupabaseClient
  private userId: string

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase
    this.userId = userId
  }

  async* streamMessage(message: string, sessionId: string) {
    // Build context with user's policies
    const context = await this.buildContext()
    const history = await this.getHistory(sessionId)

    let fullResponse = ''

    const systemPrompt = this.buildSystemPrompt(context, message)
    const tools = this.getTools()
    const model = new ChatOpenAI({
      model: AI_MODELS.GPT4O,
      temperature: 0.6,
    }).bindTools(tools)

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...history.map((m) =>
        m.role === 'assistant' ? new AIMessage(m.content) : new HumanMessage(m.content)
      ),
      new HumanMessage(message),
    ]

    // Tool-calling loop
    while (true) {
      const response = await model.invoke(messages)

      // Handle tool calls (function calling)
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Add the assistant message that requested tools so tool responses have a parent
        messages.push(response as AIMessage)

        for (const toolCall of response.tool_calls) {
          const toolResult = await this.callTool(toolCall.name, toolCall.args)
          messages.push(
            new ToolMessage({
              content: JSON.stringify(toolResult),
              tool_call_id: toolCall.id ?? `${toolCall.name}-call`,
              name: toolCall.name,
            })
          )
        }
        continue
      }

      const content = typeof response.content === 'string'
        ? response.content
        : response.content?.toString?.() ?? ''

      fullResponse = content
      if (content) {
        yield content
      }
      break
    }

    // Save to database after streaming completes
    await this.saveMessages(sessionId, message, fullResponse)
  }

  private async buildContext() {
    const { data: userPolicies } = await this.supabase
      .from('user_policies')
      .select(`
        *,
        policy:policies(
          *,
          policy_coverage_types(
            coverage_limit,
            deductible,
            coverage_type:coverage_types(*)
          )
        )
      `)
      .eq('user_id', this.userId)
      .eq('is_active', true)

    const enrolledPolicyIds = (userPolicies || []).map((p) => p.policy_id)

    const { data: availablePolicies } = await this.supabase
      .from('policies')
      .select(
        'id, name, description, coverage_items, deductible, premium, currency, policy_term_months, premium_frequency, exclusions, is_active'
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const filteredAvailable = (availablePolicies || []).filter(
      (p) => !enrolledPolicyIds.includes(p.id)
    )

    return {
      userPolicies: userPolicies || [],
      availablePolicies: filteredAvailable,
    }
  }

  private async getHistory(sessionId: string) {
    const { data: messages } = await this.supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .eq('admin_only', false)
      .order('created_at', { ascending: true })
      .limit(10)

    return (
      messages?.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })) || []
    )
  }

  private buildSystemPrompt(context: any, userMessage: string): string {
    const summarizePolicies = (policies: any[]) =>
      (policies || []).map((p) => {
        const coverageLimits =
          p.policy?.policy_coverage_types?.map((ct: any) => ({
            name: ct.coverage_type?.name,
            limit: ct.coverage_limit,
            deductible: ct.deductible,
          })) || []

        const coverageUsage =
          (p.coverage_items as any[])?.map((ci: any) => ({
            name: ci?.name,
            total_limit: ci?.total_limit,
            used_limit: ci?.used_limit,
            remaining: typeof ci?.total_limit === 'number' && typeof ci?.used_limit === 'number'
              ? ci.total_limit - ci.used_limit
              : null,
            currency: ci?.currency,
          })) || []

        return {
          policy_name: p.policy?.name || p.name || p.policy_name,
          coverage_limits: coverageLimits,
          coverage_usage: coverageUsage,
          currency: p.policy?.currency || p.currency || 'USD',
        }
      })

    const enrolledSummary = summarizePolicies(context.userPolicies)
    const availableSummary = summarizePolicies(context.availablePolicies)

    return `You are a helpful insurance policy assistant for Claimly.

Context:
- User message: "${userMessage}"
- Enrolled policies (limits/deductibles): ${JSON.stringify(enrolledSummary, null, 2)}
- Other available policies: ${JSON.stringify(availableSummary, null, 2)}

Expectations for every reply:
1) Address the user's stated need (trip length, higher coverage, specific use case).
2) Explain relevant current coverage, limits, and deductibles in plain language.
3) Identify gaps (e.g., requested coverage amount exceeds current limits, missing coverage type).
4) Recommend up to 3 available policies that close the gap (higher limits, relevant coverage type); include names and 1-2 concise reasons with numeric limits/premiums if present.
5) If current coverage is sufficient, reassure and summarize key limits/deductibles.
6) Keep it concise and avoid boilerplate. Always ground answers in the provided policy data.`
  }

  private getTools() {
    return [
      {
        name: 'get_user_policies',
        description: "Fetch the user's active policies with coverage details",
        schema: z.object({}),
        func: async () => {
          const { userPolicies } = await this.buildContext()
          return userPolicies
        },
      },
      {
        name: 'get_available_policies',
        description: 'Fetch active policies that the user is not enrolled in',
        schema: z.object({}),
        func: async () => {
          const { availablePolicies } = await this.buildContext()
          return availablePolicies
        },
      },
    ]
  }

  private async callTool(name: string, args: any) {
    const tools = this.getTools()
    const tool = tools.find((t) => t.name === name)
    if (!tool) {
      return { error: `Unknown tool ${name}` }
    }
    return tool.func()
  }

  private async saveMessages(sessionId: string, userMessage: string, aiMessage: string) {
    await this.supabase.from('chat_messages').insert([
      {
        session_id: sessionId,
        role: 'user',
        content: userMessage,
        admin_only: false,
      },
      {
        session_id: sessionId,
        role: 'assistant',
        content: aiMessage,
        admin_only: false,
      },
    ])

    await this.supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  }
}


