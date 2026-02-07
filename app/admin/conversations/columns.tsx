"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ConversationItem } from "@/types/conversations"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<ConversationItem>[] = [
  {
    accessorKey: "session_id_short",
    header: "Session",
    cell: ({ row }) => {
      const sessionId = row.original.session_id
      return (
        <span className="font-mono text-sm">
          {sessionId.slice(0, 8)}...
        </span>
      )
    },
  },
  {
    accessorKey: "message_count",
    header: "Messages",
    cell: ({ row }) => {
      const count = row.getValue("message_count") as number
      return (
        <Badge variant="secondary">
          {count} {count === 1 ? 'message' : 'messages'}
        </Badge>
      )
    },
  },
  {
    accessorKey: "last_message_preview",
    header: "Last Message",
    cell: ({ row }) => {
      const preview = row.getValue("last_message_preview") as string
      return (
        <span className="max-w-[200px] truncate block text-sm text-muted-foreground">
          {preview}
        </span>
      )
    },
  },
  {
    accessorKey: "created_at_relative",
    header: "Time",
    cell: ({ row }) => {
      const relative = row.getValue("created_at_relative") as string
      return (
        <span className="text-sm text-muted-foreground">
          {relative}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const conversation = row.original
      return (
        <Link href={`/admin/conversations/${conversation.id}`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </Link>
      )
    },
  },
]

/**
 * Transform Conversation to ConversationItem for table display
 */
export function transformConversationForTable(conversation: {
  id: string
  session_id: string
  message_count: number
  last_message: string
  created_at: string
  metadata: Record<string, unknown>
}): ConversationItem {
  return {
    id: conversation.id,
    session_id_short: conversation.session_id.slice(0, 8),
    session_id: conversation.session_id,
    message_count: conversation.message_count,
    last_message: conversation.last_message,
    last_message_preview: conversation.last_message.slice(0, 50),
    created_at: conversation.created_at,
    created_at_relative: formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true }),
    metadata: conversation.metadata as {
      user_agent?: string
      referrer?: string
    },
  }
}
