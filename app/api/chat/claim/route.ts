import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClaimIntakeOrchestrator } from '@/lib/ai/claim-intake/core/orchestrator'
import { z } from 'zod'

/**
 * POST /api/chat/claim
 *
 * Legacy endpoint - now uses the new ClaimIntakeOrchestrator
 * Redirects to new refactored claim intake system
 */

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).optional(),
  questionId: z.string().uuid().optional(),
  answerValue: z.any().optional(),
  questioningState: z.any().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedInput = RequestSchema.parse(body)

    // Create new orchestrator (refactored system)
    const orchestrator = new ClaimIntakeOrchestrator(supabase, user.id)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[Claim Intake] Starting stream for session:', validatedInput.sessionId)

          const generator = orchestrator.stream({
            sessionId: validatedInput.sessionId,
            message: validatedInput.message,
            questionId: validatedInput.questionId,
            answerValue: validatedInput.answerValue,
            questioningState: validatedInput.questioningState,
          })

          let chunkCount = 0
          for await (const chunk of generator) {
            console.log('Streaming chunk:', chunk.substring(0, 100))
            controller.enqueue(encoder.encode(chunk))
            chunkCount++
          }

          console.log(`Stream completed. Total chunks: ${chunkCount}`)
          controller.close()
        } catch (error: any) {
          console.error('Stream error:', error)
          console.error('Error stack:', error.stack)
          controller.enqueue(
            encoder.encode(`\n\nError: ${error.message}\n\nPlease try again.`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Claim chat error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
