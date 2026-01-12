import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClaimChatService } from '@/lib/ai/claim-chat'
import { StreamingResponse } from '@/lib/utils/streaming'
import { z } from 'zod'

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1),
  questionId: z.string().uuid().optional(),
  answerValue: z.any().optional(),
  questioningState: z.any().optional(), // Client-side state from Zustand
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
    const validatedInput = RequestSchema.parse(body)

    // Create service and stream response
    const claimChatService = new ClaimChatService(supabase, user.id)
    const streamIterator = claimChatService.streamMessage(validatedInput)

    const streamingResponse = new StreamingResponse()
    return streamingResponse.stream(streamIterator)
  } catch (error) {
    console.error('Claim chat error:', error)

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
