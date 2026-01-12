import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { RuleEvaluator } from '@/lib/rules/evaluator'

const RequestSchema = z.object({
  coverage_type_ids: z.array(z.string().uuid()).min(1),
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      answer_text: z.string().optional(),
      answer_number: z.number().optional(),
      answer_date: z.string().optional(),
    })
  ),
})

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const parsed = RequestSchema.parse(body)

    const evaluator = new RuleEvaluator(supabase)
    const result = await evaluator.evaluate(parsed)

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Rule evaluate error:', error)
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'Failed to evaluate rules' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
