"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { useRouter } from "next/navigation"
import { Document } from "@/types/documents"
import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/client"

/lib/supabaseinterface DocumentsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DocumentsDataTable<TData, TValue>({
  columns,
  data,
}: DocumentsDataTableProps<TData, TValue>) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isReindexing, setIsReindexing] = useState<string | null>(null)

  const handleDelete = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.title}"? This will remove all chunks and embeddings from the knowledge base.`)) {
      return
    }

    setIsDeleting(document.id)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", document.id)

      if (error) {
        toast.error(`Failed to delete document: ${error.message}`)
        return
      }

      toast.success(`Document "${document.title}" has been deleted`)
      router.refresh()
    } catch (error) {
      toast.error("An unexpected error occurred while deleting the document")
      console.error("Delete error:", error)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleReindex = async (documentId: string, documentTitle: string) => {
    setIsReindexing(documentId)
    try {
      const supabase = createClient()
      
      // Update status to processing
      const { error: updateError } = await supabase
        .from("documents")
        .update({ status: "processing" })
        .eq("id", documentId)

      if (updateError) {
        toast.error(`Failed to start re-indexing: ${updateError.message}`)
        return
      }

      // Trigger re-indexing via API
      const response = await fetch(`/api/rag/ingest/${documentId}/reindex`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error(`Failed to re-index: ${errorData.error || "Unknown error"}`)
        // Revert status
        await supabase
          .from("documents")
          .update({ status: "ready" })
          .eq("id", documentId)
        return
      }

      toast.success(`Re-indexing "${documentTitle}"...`)
      router.refresh()
    } catch (error) {
      toast.error("An unexpected error occurred while re-indexing")
      console.error("Reindex error:", error)
    } finally {
      setIsReindexing(null)
    }
  }

  // Create columns with delete and reindex actions
  const actionColumns: ColumnDef<Document>[] = [
    ...columns,
    {
      id: "actions",
      cell: ({ row }) => {
        const document = row.original
        const isProcessing = document.status === "processing"
        const isDeletingThis = isDeleting === document.id
        const isReindexingThis = isReindexing === document.id

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDelete(document)}
              disabled={isProcessing || isDeletingThis}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive/10 h-8 w-8 p-0 text-destructive"
              title="Delete document"
            >
              {isDeletingThis ? (
                <span className="h-4 w-4 animate-spin">⏳</span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              )}
            </button>
            <button
              onClick={() => handleReindex(document.id, document.title)}
              disabled={isProcessing || isReindexingThis}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
              title="Re-index document"
            >
              {isReindexingThis ? (
                <span className="h-4 w-4 animate-spin">⟳</span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              )}
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={actionColumns}
      data={data}
      searchKey="title"
      searchPlaceholder="Search documents..."
      emptyMessage="No documents found. Add your first source to get started."
    />
  )
}
