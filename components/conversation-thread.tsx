"use client"

import { Message } from "@/types/conversations"
import { format } from "date-fns"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConversationThreadProps {
  messages: Message[]
  sessionId: string
}

export function ConversationThread({ messages, sessionId }: ConversationThreadProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No messages in this conversation.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <div
          key={message.id || index}
          className={cn(
            "flex flex-col",
            message.role === 'user' ? "items-end" : "items-start"
          )}
        >
          <div className="flex items-center gap-2 mb-1 text-sm">
            <span className={cn(
              "font-semibold px-2 py-0.5 rounded",
              message.role === 'user' 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {message.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <span className="text-muted-foreground text-xs">
              {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
            </span>
          </div>

          <div
            className={cn(
              "max-w-[80%] rounded-lg p-4",
              message.role === 'user'
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            <div className="whitespace-pre-wrap">
              {message.content}
            </div>

            {/* Source citations for assistant messages */}
            {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs font-medium mb-2 opacity-80">Sources:</p>
                <ul className="space-y-1">
                  {message.sources.map((source, sourceIndex) => (
                    <li key={sourceIndex}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 hover:underline opacity-80 hover:opacity-100"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {source.title || source.url}
                        {source.similarity && (
                          <span className="ml-1 px-1 py-0.5 bg-muted-foreground/20 rounded text-[10px]">
                            {Math.round(source.similarity * 100)}%
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
