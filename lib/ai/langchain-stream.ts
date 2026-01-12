import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'

type ChatHistory = Array<{ role: 'user' | 'assistant'; content: string }>

interface LangChainStreamInput {
  systemPrompt: string
  history: ChatHistory
  userMessage: string
  temperature?: number
  model?: string
}

/**
 * Lightweight LangChain streaming helper that converts our existing history shape
 * into LangChain messages and yields text chunks for SSE.
 */
export async function* runLangChainStream({
  systemPrompt,
  history,
  userMessage,
  temperature = 0.7,
  model = 'gpt-4o',
}: LangChainStreamInput): AsyncGenerator<string> {
  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...history.map((m) =>
      m.role === 'assistant'
        ? new AIMessage(m.content)
        : new HumanMessage(m.content)
    ),
    new HumanMessage(userMessage),
  ]

  const chatModel = new ChatOpenAI({
    model,
    temperature,
    streaming: true,
  })

  const stream = await chatModel.stream(messages)

  for await (const chunk of stream) {
    // LangChain chunks are AIMessageChunk; content is already the delta text
    const content = typeof chunk.content === 'string'
      ? chunk.content
      : chunk.content?.toString?.() ?? ''

    if (content) {
      yield content
    }
  }
}
