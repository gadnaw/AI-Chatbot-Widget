/**
 * API Key Types
 * 
 * Database Schema:
 * CREATE TABLE api_keys (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
 *     key_hash TEXT NOT NULL, -- Store hashed, not plaintext
 *     prefix TEXT NOT NULL,   -- "ak_" + first 8 chars for display
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     last_used_at TIMESTAMPTZ
 * );
 */

/**
 * API key as stored in the database
 */
export interface ApiKey {
  id: string
  tenant_id: string
  key_hash: string
  prefix: string
  created_at: string | null
  last_used_at: string | null
}

/**
 * Result of creating a new API key - includes plaintext key only once
 */
export interface ApiKeyCreateResult {
  apiKey: ApiKey
  plaintextKey: string
}

/**
 * Result of regenerating an API key - includes new plaintext key
 */
export interface RegenerateResult {
  apiKey: ApiKey
  newPlaintextKey: string
  oldKeyRevoked: boolean
}

/**
 * API key display information (safe to show in UI)
 */
export interface ApiKeyDisplay {
  id: string
  prefix: string
  createdAt: string | null
  lastUsedAt: string | null
}

/**
 * Convert database ApiKey to display format
 */
export function apiKeyToDisplay(apiKey: ApiKey): ApiKeyDisplay {
  return {
    id: apiKey.id,
    prefix: apiKey.prefix,
    createdAt: apiKey.created_at,
    lastUsedAt: apiKey.last_used_at
  }
}

/**
 * Default API key prefix format
 */
export function generateApiKeyPrefix(): string {
  const randomPart = Math.random().toString(36).substring(2, 10).toLowerCase()
  return `ak_${randomPart}`
}

/**
 * Generate a new API key (random string, not UUID for better security)
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const length = 32
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  
  return result
}
