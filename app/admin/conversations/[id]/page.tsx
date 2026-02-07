import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ConversationThread } from "@/components/conversation-thread"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, ExternalLink } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  
  // Await params before accessing properties
  const resolvedParams = await params
  const { id: conversationId } = resolvedParams

  // Fetch conversation with messages
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(`
      *,
      messages (
        id,
        role,
        content,
        sources,
        created_at
      )
    `)
    .eq('id', conversationId)
    .single()

  if (error || !conversation) {
    console.error('Error fetching conversation:', error)
    notFound()
  }

  // Sort messages by creation time
  const sortedMessages = conversation.messages?.sort(
    (a: { created_at: string }, b: { created_at: string }) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) || []

  // Format metadata
  const metadata = conversation.metadata || {}
  const createdAt = format(new Date(conversation.created_at), 'PPP p')
  const messageCount = conversation.message_count || sortedMessages.length

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href="/admin/conversations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Conversations
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Conversation</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm text-muted-foreground">
                {conversation.session_id}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(conversation.session_id)
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Details</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Started</dt>
            <dd>{createdAt}</dd>
            
            <dt className="text-muted-foreground">Messages</dt>
            <dd>{messageCount} messages</dd>
            
            {metadata.user_agent && (
              <>
                <dt className="text-muted-foreground">User Agent</dt>
                <dd className="truncate" title={metadata.user_agent}>
                  {metadata.user_agent}
                </dd>
              </>
            )}
            
            {metadata.referrer && (
              <>
                <dt className="text-muted-foreground">Referrer</dt>
                <dd className="truncate" title={metadata.referrer}>
                  {metadata.referrer}
                </dd>
              </>
            )}
            
            {metadata.country && (
              <>
                <dt className="text-muted-foreground">Location</dt>
                <dd>{metadata.city ? `${metadata.city}, ` : ''}{metadata.country}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      <ConversationThread 
        messages={sortedMessages}
        sessionId={conversation.session_id}
      />
    </div>
  )
}
