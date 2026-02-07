"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Document, DOCUMENT_SOURCE_CONFIG, DOCUMENT_STATUS_CONFIG } from "@/types/documents"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Eye, Trash2, RefreshCw, FileText, Link, File } from "lucide-react"
import { useRouter } from "next/navigation"

export const columns: ColumnDef<Document>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      const sourceType = row.original.source_type as keyof typeof DOCUMENT_SOURCE_CONFIG
      const sourceConfig = DOCUMENT_SOURCE_CONFIG[sourceType]
      
      return (
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {sourceType === 'pdf' && <File className="h-4 w-4" />}
            {sourceType === 'url' && <Link className="h-4 w-4" />}
            {sourceType === 'text' && <FileText className="h-4 w-4" />}
          </span>
          <span className="font-medium">{row.getValue("title")}</span>
          {sourceType === 'url' && row.original.source_url && (
            <a 
              href={row.original.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground ml-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "source_type",
    header: "Type",
    cell: ({ row }) => {
      const sourceType = row.getValue("source_type") as keyof typeof DOCUMENT_SOURCE_CONFIG
      const sourceConfig = DOCUMENT_SOURCE_CONFIG[sourceType]
      
      return (
        <Badge variant="outline" className="flex items-center gap-1 w-fit">
          <span>{sourceConfig.icon}</span>
          <span>{sourceConfig.label}</span>
        </Badge>
      )
    },
  },
  {
    accessorKey: "chunk_count",
    header: "Chunks",
    cell: ({ row }) => {
      const chunkCount = row.getValue("chunk_count")
      return (
        <span className="text-muted-foreground">
          {typeof chunkCount === 'number' ? chunkCount.toLocaleString() : '0'}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof DOCUMENT_STATUS_CONFIG
      const statusConfig = DOCUMENT_STATUS_CONFIG[status]
      
      return (
        <Badge 
          className={`${statusConfig.color} border-0`}
          variant="secondary"
        >
          <StatusIndicator status={status} />
          <span className="ml-1">{statusConfig.label}</span>
        </Badge>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("created_at")
      if (!date) return <span className="text-muted-foreground">-</span>
      
      try {
        return (
          <span className="text-muted-foreground">
            {format(new Date(date), "MMM d, yyyy")}
          </span>
        )
      } catch {
        return <span className="text-muted-foreground">Invalid date</span>
      }
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const document = row.original
      const router = useRouter()
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push(`/admin/sources/${document.id}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleReindex(document.id)}
              disabled={document.status !== 'ready'}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-index
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDelete(document)}
              className="text-red-600 focus:text-red-600"
              disabled={document.status === 'processing'}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function StatusIndicator({ status }: { status: string }) {
  const colors = {
    processing: "bg-yellow-500",
    ready: "bg-green-500",
    failed: "bg-red-500",
  }
  
  const animations = {
    processing: "animate-pulse",
    ready: "",
    failed: "",
  }
  
  return (
    <span 
      className={`block h-2 w-2 rounded-full ${colors[status as keyof typeof colors] || colors.processing} ${animations[status as keyof typeof animations]}`} 
    />
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="21" />
    </svg>
  )
}

async function handleDelete(document: Document) {
  // This will be implemented with the delete functionality
  // Currently just a placeholder for the action
  console.log('Delete document:', document.id)
}

async function handleReindex(documentId: string) {
  // This will be implemented with the re-index functionality
  // Currently just a placeholder for the action
  console.log('Re-index document:', documentId)
}
