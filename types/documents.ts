/**
 * TypeScript types for Document management in the admin panel
 */

export type DocumentSourceType = 'pdf' | 'url' | 'text'

export type DocumentStatus = 'processing' | 'ready' | 'failed'

export interface Document {
  id: string
  title: string
  source_type: DocumentSourceType
  source_url?: string
  chunk_count: number
  status: DocumentStatus
  created_at: string
  updated_at: string
  error_message?: string
}

export interface DocumentFormData {
  title: string
  source_type: DocumentSourceType
  url?: string
  text?: string
  file?: File
}

export interface DocumentWithChunks extends Document {
  chunks: DocumentChunk[]
}

export interface DocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface DocumentUploadProgress {
  document_id: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'failed'
  message?: string
}

export interface DocumentFilters {
  source_type?: DocumentSourceType
  status?: DocumentStatus
  search?: string
}

export interface DocumentSort {
  field: 'created_at' | 'updated_at' | 'title' | 'chunk_count'
  direction: 'asc' | 'desc'
}

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string }> = {
  processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-800' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' }
}

export const DOCUMENT_SOURCE_CONFIG: Record<DocumentSourceType, { label: string; icon: string }> = {
  pdf: { label: 'PDF', icon: '📄' },
  url: { label: 'URL', icon: '🔗' },
  text: { label: 'Text', icon: '📝' }
}
