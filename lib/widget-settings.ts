import { createClient } from '@/lib/supabase/client'
import { 
  WidgetSettings, 
  WidgetSettingsFormData, 
  DEFAULT_WIDGET_SETTINGS,
  WidgetPosition 
} from '@/types/widget-settings'

/**
 * Get widget settings for a tenant
 * 
 * @param tenantId - The tenant's UUID
 * @returns WidgetSettings or null if not found
 */
export async function getWidgetSettings(tenantId: string): Promise<WidgetSettings | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('widget_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching widget settings:', error)
    return null
  }

  return data as WidgetSettings
}

/**
 * Update widget settings for a tenant (UPSERT)
 * 
 * @param tenantId - The tenant's UUID
 * @param settings - The settings to update
 * @returns Updated WidgetSettings
 */
export async function updateWidgetSettings(
  tenantId: string, 
  settings: WidgetSettingsFormData
): Promise<WidgetSettings> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('widget_settings')
    .upsert({
      tenant_id: tenantId,
      primary_color: settings.primaryColor,
      position: settings.position,
      welcome_message: settings.welcomeMessage,
      button_text: settings.buttonText,
      header_title: settings.headerTitle,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'tenant_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error updating widget settings:', error)
    throw new Error('Failed to update widget settings')
  }

  return data as WidgetSettings
}

/**
 * Initialize widget settings for a new tenant
 * Creates default settings if they don't exist
 * 
 * @param tenantId - The tenant's UUID
 * @returns WidgetSettings (created or existing)
 */
export async function initializeSettings(tenantId: string): Promise<WidgetSettings> {
  const supabase = await createClient()
  
  // First, try to get existing settings
  const existing = await getWidgetSettings(tenantId)
  if (existing) {
    return existing
  }

  // Create default settings
  const { data, error } = await supabase
    .from('widget_settings')
    .insert({
      tenant_id: tenantId,
      primary_color: DEFAULT_WIDGET_SETTINGS.primaryColor,
      position: DEFAULT_WIDGET_SETTINGS.position,
      welcome_message: DEFAULT_WIDGET_SETTINGS.welcomeMessage,
      button_text: DEFAULT_WIDGET_SETTINGS.buttonText,
      header_title: DEFAULT_WIDGET_SETTINGS.headerTitle
    })
    .select()
    .single()

  if (error) {
    console.error('Error initializing widget settings:', error)
    throw new Error('Failed to initialize widget settings')
  }

  return data as WidgetSettings
}

/**
 * Validate widget settings before saving
 * 
 * @param settings - The settings to validate
 * @returns Validation result with isValid flag and errors
 */
export function validateWidgetSettings(
  settings: WidgetSettingsFormData
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate primary color format
  if (!/^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor)) {
    errors.push('Primary color must be a valid hex color code')
  }

  // Validate position
  if (!['bottom-right', 'bottom-left'].includes(settings.position)) {
    errors.push('Position must be bottom-right or bottom-left')
  }

  // Validate welcome message length
  if (settings.welcomeMessage.length < 1 || settings.welcomeMessage.length > 200) {
    errors.push('Welcome message must be between 1 and 200 characters')
  }

  // Validate button text length
  if (settings.buttonText.length < 1 || settings.buttonText.length > 50) {
    errors.push('Button text must be between 1 and 50 characters')
  }

  // Validate header title length
  if (settings.headerTitle.length < 1 || settings.headerTitle.length > 50) {
    errors.push('Header title must be between 1 and 50 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Convert database WidgetSettings to form data
 * 
 * @param settings - Database WidgetSettings
 * @returns WidgetSettingsFormData for form usage
 */
export function settingsToFormData(settings: WidgetSettings): WidgetSettingsFormData {
  return {
    primaryColor: settings.primary_color,
    position: settings.position as WidgetPosition,
    welcomeMessage: settings.welcome_message,
    buttonText: settings.button_text,
    headerTitle: settings.header_title
  }
}

/**
 * Convert form data to database format
 * 
 * @param formData - Form WidgetSettingsFormData
 * @returns Object for database insert/update
 */
export function formDataToSettings(
  formData: WidgetSettingsFormData,
  tenantId: string
): Omit<WidgetSettings, 'updated_at'> {
  return {
    tenant_id: tenantId,
    primary_color: formData.primaryColor,
    position: formData.position,
    welcome_message: formData.welcomeMessage,
    button_text: formData.buttonText,
    header_title: formData.headerTitle
  }
}
