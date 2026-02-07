import { createClient } from "@/lib/supabase/server"
import { columns, transformConversationForTable } from "./columns"
import { DataTable } from "@/components/ui/data-table"
import { ConversationsFilter } from "./conversations-filter"
import { notFound } from "next/navigation"

interface PageProps {
  searchParams: Promise<{
    search?: string
    from?: string
    to?: string
    page?: string
  }>
}

export default async function ConversationsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  
  // Await searchParams before accessing properties
  const params = await searchParams
  const search = params.search
  const from = params.from
  const to = params.to
  const page = parseInt(params.page || '1')
  const limit = 10
  const offset = (page - 1) * limit

  // Build query with filters
  let query = supabase
    .from('conversations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply search filter
  if (search) {
    query = query.or(`session_id.ilike.%${search}%,last_message.ilike.%${search}%`)
  }

  // Apply date range filters
  if (from) {
    query = query.gte('created_at', from)
  }
  if (to) {
    query = query.lte('created_at', to)
  }

  const { data: conversations, error, count } = await query

  if (error) {
    console.error('Error fetching conversations:', error)
    return (
      <div className="container mx-auto py-10">
        <div className="text-center text-red-500">
          Error loading conversations. Please try again.
        </div>
      </div>
    )
  }

  // Transform data for table display
  const tableData = conversations?.map(transformConversationForTable) || []

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground mt-1">
            View and manage chatbot conversations
          </p>
        </div>
      </div>

      <ConversationsFilter 
        initialSearch={search}
        initialFrom={from}
        initialTo={to}
      />

      <div className="mt-6">
        <DataTable 
          columns={columns} 
          data={tableData}
          totalCount={count || 0}
          currentPage={page}
          pageSize={limit}
          searchParams={{
            search,
            from,
            to,
          }}
        />
      </div>
    </div>
  )
}
