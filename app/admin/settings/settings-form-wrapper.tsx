'use client'

import { useState, useCallback } from 'react'
import { WidgetSettingsFormData } from '@/types/widget-settings'
import { WidgetForm } from './widget-form'
import { WidgetPreview } from './widget-preview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SettingsFormWrapperProps {
  initialData: WidgetSettingsFormData
  tenantId: string
}

/**
 * Client component that synchronizes form state with preview
 * Provides real-time preview updates without saving
 */
export function SettingsFormWrapper({ 
  initialData, 
  tenantId 
}: SettingsFormWrapperProps) {
  // Separate state for preview (updates immediately)
  const [previewValues, setPreviewValues] = useState<WidgetSettingsFormData>(initialData)
  const [lastSaved, setLastSaved] = useState<WidgetSettingsFormData>(initialData)

  // Handle form changes - update preview immediately
  const handleFormChange = useCallback((values: WidgetSettingsFormData) => {
    setPreviewValues(values)
  }, [])

  // Handle successful save - sync preview with saved state
  const handleSaveSuccess = useCallback(() => {
    setLastSaved(previewValues)
  }, [previewValues])

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      
      {/* Left Column: Form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize colors, position, and text for your widget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WidgetForm 
              initialData={lastSaved} 
              tenantId={tenantId}
              onSaveSuccess={handleSaveSuccess}
              onChange={handleFormChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Preview */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <WidgetPreview
          primaryColor={previewValues.primaryColor}
          position={previewValues.position}
          welcomeMessage={previewValues.welcomeMessage}
          buttonText={previewValues.buttonText}
          headerTitle={previewValues.headerTitle}
        />
      </div>

    </div>
  )
}
