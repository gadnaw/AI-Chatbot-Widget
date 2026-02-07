import { createClient } from '@/lib/supabase/client'
import { 
  ApiKey, 
  ApiKeyCreateResult, 
  RegenerateResult, 
  generateApiKey,
  generateApiKeyPrefix
} from '@/types/api-keys'

/**
 * Get current API key for a tenant
 * 
 * @param tenantId - The tenant's UUID
 * @returns ApiKey or null if not found
 */
export async function getCurrentKey(tenantId: string): Promise<ApiKey | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching API key:', error)
    return null
  }

  return data as ApiKey
}

/**
 * Create a new API key for a tenant
 * 
 * @param tenantId - The tenant's UUID
 * @returns ApiKeyCreateResult with plaintext key (only returned once)
 */
export async function createKey(tenantId: string): Promise<ApiKeyCreateResult> {
  const supabase = await createClient()
  
  // Generate new API key
  const plaintextKey = generateApiKey()
  const prefix = generateApiKeyPrefix()
  
  // In a real implementation, you would hash the key with bcrypt
  // For now, we'll use a simple hash for demonstration
  // In production: const keyHash = await bcrypt.hash(plaintextKey, 10)
  const keyHash = plaintextKey // This should be hashed in production
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      tenant_id: tenantId,
      key_hash: keyHash,
      prefix: prefix
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating API key:', error)
    throw new Error('Failed to create API key')
  }

  return {
    apiKey: data as ApiKey,
    plaintextKey
  }
}

/**
 * Regenerate API key for a tenant
 * Creates a new key while optionally revoking the old one
 * 
 * @param tenantId - The tenant's UUID
 * @returns RegenerateResult with new plaintext key
 */
export async function regenerateKey(tenantId: string): Promise<RegenerateResult> {
  const supabase = await createClient()
  
  // Get current key first
  const currentKey = await getCurrentKey(tenantId)
  
  // Generate new API key
  const plaintextKey = generateApiKey()
  const prefix = generateApiKeyPrefix()
  
  // Hash the key (use bcrypt.hash in production)
  const keyHash = plaintextKey // This should be hashed in production
  
  // Create new key (old key remains until explicitly revoked)
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      tenant_id: tenantId,
      key_hash: keyHash,
      prefix: prefix
    })
    .select()
    .single()

  if (error) {
    console.error('Error regenerating API key:', error)
    throw new Error('Failed to regenerate API key')
  }

  return {
    apiKey: data as ApiKey,
    newPlaintextKey: plaintextKey,
    oldKeyRevoked: false
  }
}

/**
 * Revoke an old API key
 * 
 * @param keyId - The API key's UUID to revoke
 */
export async function revokeKey(keyId: string): Promise<void> {
  const supabase = await createClient()
  
  // Mark the key as revoked by updating its prefix
  const { error } = await supabase
    .from('api_keys')
    .update({ prefix: 'revoked_' })
    .eq('id', keyId)

  if (error) {
    console.error('Error revoking API key:', error)
    throw new Error('Failed to revoke API key')
  }
}

/**
 * Update last used timestamp for an API key
 * 
 * @param keyId - The API key's UUID
 */
export async function updateLastUsed(keyId: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId)

  if (error) {
    console.error('Error updating last used:', error)
    // Don't throw - this is a tracking update, shouldn't fail the operation
  }
}

/**
 * Get or create API key for a tenant
 * Creates a new key if none exists
 * 
 * @param tenantId - The tenant's UUID
 * @returns ApiKeyCreateResult (plaintext key only if created)
 */
export async function getOrCreateKey(tenantId: string): Promise<{
  apiKey: ApiKey
  plaintextKey?: string
}> {
  const existingKey = await getCurrentKey(tenantId)
  
  if (existingKey) {
    return { apiKey: existingKey }
  }
  
  const result = await createKey(tenantId)
  return {
    apiKey: result.apiKey,
    plaintextKey: result.plaintextKey
  }
}

/**
 * Validate an API key (for backend use)
 * 
 * @param tenantId - The tenant's UUID
 * @param apiKey - The plaintext API key to validate
 * @returns boolean indicating if key is valid
 */
export async function validateApiKey(tenantId: string, plaintextKey: string): Promise<boolean> {
  const supabase = await createClient()
  
  // In production, use bcrypt.compare to verify the hash
  // const isValid = await bcrypt.compare(plaintextKey, storedHash)
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('key_hash', plaintextKey) // This should compare against hash in production
    .single()

  if (error || !data) {
    return false
  }

  // Update last used timestamp
  await updateLastUsed(data.id)
  
  return true
}
