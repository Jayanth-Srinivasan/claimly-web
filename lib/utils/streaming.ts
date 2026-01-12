export class StreamingResponse {
  private encoder = new TextEncoder()

  stream(iterator: AsyncIterable<string>) {
    const encoder = this.encoder

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of iterator) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            )
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }
}
