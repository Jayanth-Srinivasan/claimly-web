'use client'

import { Fragment } from 'react'

interface FormattedMessageProps {
  content: string
}

/**
 * Simple markdown formatter that converts markdown syntax to formatted text
 * Handles: **bold**, *italic*, lists, line breaks
 */
export function FormattedMessage({ content }: FormattedMessageProps) {
  // Split by double newlines to handle paragraphs
  const paragraphs = content.split(/\n\n+/)

  return (
    <>
      {paragraphs.map((paragraph, pIndex) => {
        // Skip empty paragraphs
        if (!paragraph.trim()) return null

        // Check if it's a list item (starts with - or *)
        if (/^[-*]\s/.test(paragraph.trim())) {
          const items = paragraph.split(/\n(?=[-*]\s)/)
          return (
            <ul key={pIndex} className="list-disc list-inside space-y-1 my-2 ml-2">
              {items.map((item, iIndex) => {
                const cleanItem = item.replace(/^[-*]\s+/, '')
                return (
                  <li key={iIndex} className="text-sm">
                    <FormattedText text={cleanItem} />
                  </li>
                )
              })}
            </ul>
          )
        }

        // Regular paragraph
        return (
          <p key={pIndex} className="mb-2 last:mb-0">
            <FormattedText text={paragraph} />
          </p>
        )
      })}
    </>
  )
}

/**
 * Formats inline markdown (bold, italic) within text
 */
function FormattedText({ text }: { text: string }) {
  const parts: Array<{ type: 'text' | 'bold' | 'italic'; content: string }> = []
  let remaining = text
  let key = 0

  // Process bold (**text**)
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    const italicMatch = remaining.match(/\*([^*]+)\*/)

    if (boldMatch && (!italicMatch || boldMatch.index! < italicMatch.index!)) {
      // Add text before bold
      if (boldMatch.index! > 0) {
        parts.push({
          type: 'text',
          content: remaining.substring(0, boldMatch.index!),
        })
      }
      // Add bold text
      parts.push({
        type: 'bold',
        content: boldMatch[1],
      })
      remaining = remaining.substring(boldMatch.index! + boldMatch[0].length)
    } else if (italicMatch) {
      // Add text before italic
      if (italicMatch.index! > 0) {
        parts.push({
          type: 'text',
          content: remaining.substring(0, italicMatch.index!),
        })
      }
      // Add italic text
      parts.push({
        type: 'italic',
        content: italicMatch[1],
      })
      remaining = remaining.substring(italicMatch.index! + italicMatch[0].length)
    } else {
      // No more formatting, add remaining text
      parts.push({
        type: 'text',
        content: remaining,
      })
      break
    }
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'bold') {
          return (
            <strong key={index} className="font-semibold">
              {part.content}
            </strong>
          )
        }
        if (part.type === 'italic') {
          return (
            <em key={index} className="italic">
              {part.content}
            </em>
          )
        }
        // Handle line breaks in text
        return (
          <Fragment key={index}>
            {part.content.split('\n').map((line, lineIndex, array) => (
              <Fragment key={lineIndex}>
                {line}
                {lineIndex < array.length - 1 && <br />}
              </Fragment>
            ))}
          </Fragment>
        )
      })}
    </>
  )
}
