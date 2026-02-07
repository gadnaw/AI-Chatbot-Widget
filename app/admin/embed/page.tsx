import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateKey } from '@/lib/api-keys'
import { initializeSettings } from '@/lib/widget-settings'
import { EmbedPageClient } from './embed-page-client'

export default async function EmbedPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login?redirectTo=/admin/embed')
  }

  // Get tenant ID from user metadata
  const tenantId = user.user_metadata?.tenant_id
  
  if (!tenantId) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Tenant Not Found</h2>
          <p className="text-yellow-700">
            Your account is not associated with a tenant. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  // Get or create API key
  let apiKeyData
  try {
    apiKeyData = await getOrCreateKey(tenantId)
  } catch (error) {
    console.error('Error fetching API key:', error)
    return (
      <div className="container mx-auto py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">
            Failed to load API key. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  // Get or initialize widget settings
  let widgetSettings
  try {
    widgetSettings = await initializeSettings(tenantId)
  } catch (error) {
    console.error('Error fetching widget settings:', error)
    return (
      <div className="container mx-auto py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">
            Failed to load widget settings. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <EmbedPageClient 
      initialApiKey={apiKeyData.apiKey}
      initialWidgetSettings={widgetSettings}
    />
  )
}
