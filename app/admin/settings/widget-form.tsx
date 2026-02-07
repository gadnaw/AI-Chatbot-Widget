'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  WidgetSettingsSchema, 
  WidgetSettingsFormData,
  WidgetPosition 
} from '@/types/widget-settings'
import { updateWidgetSettings } from '@/lib/widget-settings'
import { ColorPicker } from '@/components/ui/color-picker'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface WidgetFormProps {
  initialData: WidgetSettingsFormData
  tenantId: string
  onSaveSuccess?: () => void
}

/**
 * Widget settings form with Zod validation
 * Allows admins to customize widget appearance
 */
export function WidgetForm({ 
  initialData, 
  tenantId, 
  onSaveSuccess 
}: WidgetFormProps) {
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm<WidgetSettingsSchema>({
    resolver: zodResolver(WidgetSettingsSchema),
    defaultValues: initialData
  })

  const formValues = watch()

  const onSubmit = async (data: WidgetSettingsFormData) => {
    setIsSaving(true)
    
    try {
      await updateWidgetSettings(tenantId, data)
      toast.success('Widget settings saved successfully!')
      onSaveSuccess?.()
    } catch (error) {
      console.error('Error saving widget settings:', error)
      toast.error('Failed to save widget settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Primary Color */}
      <div className="space-y-2">
        <label htmlFor="primaryColor" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Primary Color
        </label>
        <ColorPicker
          value={formValues.primaryColor}
          onChange={(color) => setValue('primaryColor', color, { shouldDirty: true })}
        />
        {errors.primaryColor && (
          <p className="text-sm text-destructive">{errors.primaryColor.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The main color for the chat widget button and accents
        </p>
      </div>

      {/* Position */}
      <div className="space-y-2">
        <label htmlFor="position" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Widget Position
        </label>
        <Select
          value={formValues.position}
          onValueChange={(value: WidgetPosition) => setValue('position', value, { shouldDirty: true })}
        >
          <SelectTrigger id="position">
            <SelectValue placeholder="Select position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bottom-right">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current rounded-sm" />
                <span>Bottom Right</span>
              </div>
            </SelectItem>
            <SelectItem value="bottom-left">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current rounded-sm" style={{ marginLeft: '-8px' }} />
                <span>Bottom Left</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {errors.position && (
          <p className="text-sm text-destructive">{errors.position.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Where the chat widget appears on your website
        </p>
      </div>

      {/* Welcome Message */}
      <div className="space-y-2">
        <label htmlFor="welcomeMessage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Welcome Message
        </label>
        <Textarea
          id="welcomeMessage"
          placeholder="Hi! How can I help you today?"
          {...register('welcomeMessage')}
          maxLength={200}
          rows={3}
        />
        <div className="flex justify-between">
          {errors.welcomeMessage ? (
            <p className="text-sm text-destructive">{errors.welcomeMessage.message}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            {formValues.welcomeMessage.length}/200
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          The initial message shown when a user opens the chat
        </p>
      </div>

      {/* Button Text */}
      <div className="space-y-2">
        <label htmlFor="buttonText" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Button Text
        </label>
        <Input
          id="buttonText"
          placeholder="Chat"
          {...register('buttonText')}
          maxLength={50}
        />
        <div className="flex justify-between">
          {errors.buttonText ? (
            <p className="text-sm text-destructive">{errors.buttonText.message}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            {formValues.buttonText.length}/50
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          The text shown on the chat button
        </p>
      </div>

      {/* Header Title */}
      <div className="space-y-2">
        <label htmlFor="headerTitle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Header Title
        </label>
        <Input
          id="headerTitle"
          placeholder="Support Chat"
          {...register('headerTitle')}
          maxLength={50}
        />
        <div className="flex justify-between">
          {errors.headerTitle ? (
            <p className="text-sm text-destructive">{errors.headerTitle.message}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            {formValues.headerTitle.length}/50
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          The title shown in the chat window header
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isSaving || !isDirty}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
