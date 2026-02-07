import { Timestamp } from '@/types/utils'

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant'

/**
 * Source citation from RAG pipeline
 */
export interface MessageSource {
  url: string
  title: string
  similarity?: number
  chunk_id?: string
}

/**
 * Individual message in a conversation thread
 */
export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  sources?: MessageSource[]
  created_at: string
  created_at_formatted?: string
}

/**
 * Conversation metadata stored in database
 */
export interface Conversation {
  id: string
  tenant_id: string
  session_id: string
  message_count: number
  last_message: string
  created_at: string
  created_at_formatted?: string
  updated_at?: string
  metadata: ConversationMetadata
}

/**
 * Extended conversation with full message thread
 */
export interface ConversationDetail extends Conversation {
  messages: Message[]
}

/**
 * Conversation metadata for context
 */
export interface ConversationMetadata {
  user_agent?: string
  referrer?: string
  platform?: string
  widget_version?: string
  country?: string
  city?: string
}

/**
 * Conversation list item for DataTable display
 */
export interface ConversationItem {
  id: string
  session_id_short: string
  session_id: string
  message_count: number
  last_message: string
  last_message_preview: string
  created_at: string
  created_at_relative: string
  metadata: ConversationMetadata
}

/**
 * Filter parameters for conversation search
 */
export interface ConversationFilters {
  search?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/**
 * API response for conversations list
 */
export interface ConversationsResponse {
  data: Conversation[]
  total: number
  limit: number
  offset: number
}

/**
 * API response for single conversation
 */
export interface ConversationDetailResponse {
  data: ConversationDetail | null
  error?: string
}
