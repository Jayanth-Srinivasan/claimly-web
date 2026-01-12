import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClaimIntakeOrchestrator } from '@/lib/ai/claim-intake/core/orchestrator'

/**
 * POST /api/claim-intake/stream
 *
 * Single streaming endpoint for the entire claim intake flow.
 * Orchestrator routes to appropriate stage based on state.
 *
 * Request body:
 * - sessionId: string (required)
 * - message?: string (user message)
 * - questionId?: string (if answering a database question)
 * - answerValue?: any (answer to database question)
 * - documentId?: string (if a document was uploaded)
 * - questioningState?: object (optional client state)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { sessionId, message, questionId, answerValue, documentId, questioningState } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Create orchestrator
    const orchestrator = new ClaimIntakeOrchestrator(supabase, user.id)

    // Stream response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream intake process
          const generator = orchestrator.stream({
            sessionId,
            message,
            questionId,
            answerValue,
            documentId,
            questioningState,
          })

          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(chunk))
          }

          controller.close()
        } catch (error: any) {
          console.error('Stream error:', error)
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
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/claim-intake/stream?sessionId=...
 *
 * Get current state of claim intake for a session
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session ID from query
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Create orchestrator
    const orchestrator = new ClaimIntakeOrchestrator(supabase, user.id)

    // Get state
    const state = await orchestrator.getState(sessionId)

    if (!state) {
      return NextResponse.json(
        { error: 'State not found for this session' },
        { status: 404 }
      )
    }

    return NextResponse.json({ state })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
