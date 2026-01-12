import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PolicyChatService } from '@/lib/ai/policy-chat'
import { StreamingResponse } from '@/lib/utils/streaming'
import { z } from 'zod'

const RequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    const { sessionId, message } = RequestSchema.parse(body)

    // Get or create session
    let session
    if (sessionId) {
      const { data } = await supabase.from('chat_sessions').select('*').eq('id', sessionId).single()
      session = data
    }

    if (!session) {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'Policy Q&A',
          mode: 'policy',
        })
        .select()
        .single()
      session = newSession
    }

    if (!session) {
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Stream response
    const policyChatService = new PolicyChatService(supabase, user.id)
    const streamIterator = policyChatService.streamMessage(message, session.id)

    const streamingResponse = new StreamingResponse()
    return streamingResponse.stream(streamIterator)
  } catch (error) {
    console.error('Policy chat error:', error)

    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Failed to process message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
