import { Suspense } from 'react'
import { getTenantId } from '@/lib/admin-auth'
import { initializeSettings, settingsToFormData } from '@/lib/widget-settings'
import { WidgetSettingsFormData } from '@/types/widget-settings'
import { SettingsFormWrapper } from './settings-form-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

/**
 * Settings page layout
 * Fetches current settings and displays form with live preview
 */
export default async function WidgetSettingsPage() {
  const tenantId = await getTenantId()
  
  if (!tenantId) {
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to access widget settings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch or initialize settings
  let initialData: WidgetSettingsFormData
  
  try {
    const settings = await initializeSettings(tenantId)
    initialData = settingsToFormData(settings)
  } catch (error) {
    console.error('Error loading widget settings:', error)
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Unable to load widget settings. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Widget Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize how your chat widget appears to your customers. 
          Changes take effect immediately on your website.
        </p>
      </div>

      {/* Settings Content */}
      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <SettingsFormWrapper
          initialData={initialData}
          tenantId={tenantId}
        />
      </Suspense>
    </div>
  )
}

/**
 * Loading skeleton for settings page
 */
function SettingsLoadingSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Form Skeleton */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              <div className="h-24 w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="pt-4 flex justify-end">
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Skeleton */}
      <div className="sticky top-4">
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="w-full h-[400px] bg-slate-100 rounded-lg animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
