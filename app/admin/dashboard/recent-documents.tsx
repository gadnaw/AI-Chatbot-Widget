import { createClient } from "@/lib/supabase/server"
import { Document, DOCUMENT_STATUS_CONFIG } from "@/types/documents"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, ExternalLink, Link as LinkIcon } from "lucide-react"
import Link from "next/link"

/**
 * Recent documents component for dashboard
 * Shows the most recently added documents
 */
interface RecentDocumentsProps {
  tenantId: string
}

export async function RecentDocuments({ tenantId }: RecentDocumentsProps) {
  const supabase = await createClient()

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No documents yet</p>
            <Link 
              href="/admin/sources" 
              className="text-primary hover:underline text-sm mt-2 inline-block"
            >
              Add your first document
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Recent Documents
        </CardTitle>
        <Link 
          href="/admin/sources" 
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => {
            const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status as keyof typeof DOCUMENT_STATUS_CONFIG] || 
              { label: doc.status, color: "bg-gray-100 text-gray-800" }
            
            return (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0">
                    {doc.source_type === 'url' ? (
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.source_type === 'url' ? doc.source_url : `${doc.chunk_count} chunks`}
                    </p>
                  </div>
                </div>
                <Badge className={`${statusConfig.color} flex-shrink-0 ml-2`}>
                  {statusConfig.label}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for recent documents
 */
export function RecentDocumentsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Recent Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
