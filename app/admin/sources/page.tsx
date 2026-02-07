import { createClient } from "@/lib/supabase/server"
import { Document } from "@/types/documents"
import { DocumentsDataTable } from "./documents-data-table"
import { columns } from "./columns"
import { Button } from "@/components/ui/button"
import { Plus, FileText } from "lucide-react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AddDocumentDialog } from "./add-document-dialog"

async function getDocuments(): Promise<Document[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching documents:", error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  return data.map((doc) => ({
    id: doc.id,
    title: doc.title,
    source_type: doc.source_type,
    source_url: doc.source_url || undefined,
    chunk_count: doc.chunk_count || 0,
    status: doc.status || "processing",
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    error_message: doc.error_message || undefined,
  }))
}

export default async function SourcesPage() {
  const documents = await getDocuments()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Sources</h1>
          <p className="text-muted-foreground">
            Manage the knowledge base that powers your chatbot. Add documents, 
            URLs, or paste text to train your AI assistant.
          </p>
        </div>
        <AddDocumentDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Documents
          </CardTitle>
          <CardDescription>
            {documents.length === 0 
              ? "No documents yet. Add your first source to start training your chatbot."
              : `${documents.length} document${documents.length !== 1 ? 's' : ''} loaded`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsDataTable 
            columns={columns} 
            data={documents}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PDF Documents</CardTitle>
            <CardDescription>
              Upload PDF files for your chatbot to learn from
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Best for: Manuals, books, research papers, reports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Web URLs</CardTitle>
            <CardDescription>
              Ingest content from websites and web pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Best for: Documentation, blog posts, knowledge bases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Text Content</CardTitle>
            <CardDescription>
              Paste text directly or enter custom content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Best for: FAQ, quick notes, custom responses
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
