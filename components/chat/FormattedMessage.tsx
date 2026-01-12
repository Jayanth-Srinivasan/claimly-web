'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface FormattedMessageProps {
  content: string
}

/**
 * Markdown formatter using react-markdown with Tailwind styling
 * Handles: **bold**, *italic*, lists, code blocks, links, etc.
 */
export function FormattedMessage({ content }: FormattedMessageProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize paragraph styling
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          // Customize list styling
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 ml-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 ml-6">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
          // Customize heading styling
          h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 text-black dark:text-white">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 text-black dark:text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 text-black dark:text-white">{children}</h3>,
          // Customize code blocks
          code: ({ className, children, ...props }) => {
            const isInline = !className
            return isInline ? (
              <code className="text-sm bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded font-mono" {...props}>
                {children}
              </code>
            ) : (
              <code className="block text-sm bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-black/10 dark:border-white/10 overflow-x-auto my-2" {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-black/10 dark:border-white/10 overflow-x-auto my-2">
              {children}
            </pre>
          ),
          // Customize links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {children}
            </a>
          ),
          // Customize strong/bold
          strong: ({ children }) => <strong className="font-semibold text-black dark:text-white">{children}</strong>,
          // Customize emphasis/italic
          em: ({ children }) => <em className="italic">{children}</em>,
          // Customize blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-black/20 dark:border-white/20 pl-4 my-2 italic text-black/80 dark:text-white/80">
              {children}
            </blockquote>
          ),
          // Customize horizontal rule
          hr: () => <hr className="my-4 border-black/10 dark:border-white/10" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
